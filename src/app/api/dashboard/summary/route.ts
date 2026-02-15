import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    // Build where clause for station filtering AND organization isolation
    const where: { organizationId: string; stationId?: string } = {
      organizationId: user.organizationId
    }
    if (stationId && stationId !== 'all') {
      where.stationId = stationId
    }

    // Fetch all data in parallel for maximum speed
    const [
      shifts,
      safeData,
      tanks,
      notifications,
      auditLogs,
      pendingDeliveriesCount
    ] = await Promise.all([
      // Shifts data - optimized with select
      prisma.shift.findMany({
        where,
        select: {
          id: true,
          status: true,
          startTime: true,
          statistics: true,
          station: {
            select: {
              id: true,
              name: true
            }
          },
          assignments: {
            select: { id: true },
            take: 1
          },
          shopAssignment: {
            select: { id: true }
          }
        },
        orderBy: { startTime: 'desc' },
        take: 50
      }),

      // Safe summary - fetch all if 'all' or no stationId
      stationId && stationId !== 'all'
        ? prisma.safe.findMany({
          where: { stationId, organizationId: user.organizationId },
          select: { currentBalance: true }
        })
        : prisma.safe.findMany({
          where: { organizationId: user.organizationId },
          select: { currentBalance: true }
        }),

      // Tanks with fuel info
      prisma.tank.findMany({
        where: {
          ...where,
          isActive: true
        },
        select: {
          id: true,
          tankNumber: true,
          capacity: true,
          currentLevel: true,
          fuel: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: { tankNumber: 'asc' }
      }),

      // Unread notifications
      prisma.notification.findMany({
        where: {
          ...where,
          isRead: false
        },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          priority: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),


      // Recent audit logs for activity feed (show all activity for THIS organization)
      prisma.auditLog.findMany({
        where: {
          organizationId: user.organizationId
        },
        select: {
          id: true,
          action: true,
          entity: true,
          userName: true,
          timestamp: true,
          userRole: true,
          details: true
        },
        orderBy: { timestamp: 'desc' },
        take: 20
      }),

      // Pending deliveries count
      prisma.delivery.count({
        where: {
          ...where,
          verificationStatus: 'PENDING_VERIFICATION'
        }
      })
    ])

    // Calculate Safe balance
    const safeBalance = safeData.reduce((sum, s) => sum + (s.currentBalance || 0), 0)

    // Calculate statistics
    const today = new Date().toDateString()
    const activeShifts = shifts.filter(s => s.status === 'OPEN')
    const todayShifts = shifts.filter(s =>
      s.status === 'CLOSED' && new Date(s.startTime).toDateString() === today
    )

    interface ShiftStatistics {
      totalSales?: number
      cashSales?: number
      totalTransactions?: number
      creditSales?: number
    }

    interface ShiftWithStats {
      startTime: Date
      status: string
      statistics: Prisma.JsonValue
    }

    const todaySales = todayShifts.reduce((sum, s: ShiftWithStats) => {
      const stats = s.statistics as ShiftStatistics | null
      return sum + (stats?.totalSales || stats?.cashSales || 0)
    }, 0)

    const todayTransactions = todayShifts.reduce((sum, s: ShiftWithStats) => {
      const stats = s.statistics as ShiftStatistics | null
      return sum + (stats?.totalTransactions || 0)
    }, 0)

    // Calculate tank statistics
    const totalTanks = tanks.length
    const lowStockTanks = tanks.filter(t => {
      const fillPercentage = (t.currentLevel / t.capacity) * 100
      return fillPercentage < 20
    }).length

    const criticalAlerts = tanks.filter(t => {
      const fillPercentage = (t.currentLevel / t.capacity) * 100
      return fillPercentage < 10
    }).length

    // Fuel stock grouped by fuel type - matching UI expectations
    interface FuelStock {
      name: string
      capacity: number
      stock: number
      percentage: number
    }

    const fuelStock = tanks.reduce((acc: FuelStock[], tank) => {
      const existing = acc.find((f: FuelStock) => f.name === tank.fuel.name)
      if (existing) {
        existing.capacity += tank.capacity
        existing.stock += tank.currentLevel
        existing.percentage = (existing.stock / existing.capacity) * 100
      } else {
        acc.push({
          name: tank.fuel.name,
          capacity: tank.capacity,
          stock: tank.currentLevel,
          percentage: (tank.currentLevel / tank.capacity) * 100
        })
      }
      return acc
    }, [])

    // Get credit outstanding from shifts statistics
    let creditOutstanding = 0;
    shifts.forEach((s: ShiftWithStats) => {
      const stats = s.statistics as ShiftStatistics | null
      if (stats?.creditSales) {
        creditOutstanding += stats.creditSales
      }
    })

    return NextResponse.json({
      stats: {
        todaySales,
        todayTransactions,
        activeShifts: activeShifts.length,
        activeShiftDetails: activeShifts.map(s => {
          const hasPumps = s.assignments && s.assignments.length > 0
          const hasShop = !!s.shopAssignment
          let type = 'PUMP'
          if (hasPumps && hasShop) type = 'MIXED'
          else if (hasShop) type = 'SHOP'

          return {
            id: s.id,
            station: s.station,
            startTime: s.startTime,
            type
          }
        }),
        safeBalance,
        creditOutstanding,
        totalTanks,
        lowStockTanks,
        criticalAlerts,
        pendingDeliveries: pendingDeliveriesCount
      },
      fuelStock,
      alerts: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        createdAt: n.createdAt
      })),
      recentActivity: auditLogs
        .filter(log => {
          // Filter out developer-only activities for non-developers
          // Developer activities are those performed by users with DEVELOPER role
          if (log.userRole === 'DEVELOPER') {
            // Only show developer activities to developers
            // We'll need to get the current user's role from the request
            // For now, we'll include all activities and let the frontend filter
            return true
          }
          return true
        })
        .map(log => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          userName: log.userName,
          timestamp: log.timestamp,
          userRole: log.userRole
        }))
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard summary' },
      { status: 500 }
    )
  }
}
