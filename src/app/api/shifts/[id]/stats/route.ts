import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shift = await prisma.shift.findUnique({
      where: { id }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const assignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
      include: {
        nozzle: {
          include: {
            tank: true
          }
        }
      }
    })

    // Calculate comprehensive statistics
    const shiftStart = shift.startTime
    const shiftEnd = shift.endTime || new Date()
    const durationHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60)

    // Sales calculations using database prices
    let totalSales = 0
    let totalLiters = 0

    interface PumperStats {
      pumperName: string
      totalLiters: number
      totalSales: number
      assignmentCount: number
    }

    const pumperStatsMap = new Map<string, PumperStats>()

    for (const assignment of assignments) {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        // Validate meter readings
        if (assignment.endMeterReading < assignment.startMeterReading) {
          console.error(`Invalid meter reading for assignment ${assignment.id}: end (${assignment.endMeterReading}) < start (${assignment.startMeterReading})`)
          continue // Skip invalid assignments
        }

        const litersSold = assignment.endMeterReading - assignment.startMeterReading

        // Validate non-negative liters
        if (litersSold < 0) {
          console.error(`Negative liters calculated for assignment ${assignment.id}: ${litersSold}`)
          continue // Skip invalid assignments
        }

        totalLiters += litersSold

        // Get current price for the fuel type
        const fuelId = assignment.nozzle.tank.fuelId
        const price = await prisma.price.findFirst({
          where: {
            fuelId,
            stationId: shift.stationId,
            effectiveDate: { lte: shift.startTime },
            isActive: true
          },
          orderBy: { effectiveDate: 'desc' }
        })

        const pricePerLiter = price ? price.price : 470 // Fallback price
        const sales = litersSold * pricePerLiter
        totalSales += sales

        // Pumper performance
        const pumperName = assignment.pumperName
        if (!pumperStatsMap.has(pumperName)) {
          pumperStatsMap.set(pumperName, {
            pumperName,
            totalLiters: 0,
            totalSales: 0,
            assignmentCount: 0
          })
        }

        const pumperStats = pumperStatsMap.get(pumperName)!
        pumperStats.totalLiters += litersSold
        pumperStats.totalSales += sales
        pumperStats.assignmentCount += 1
      }
    }

    // Efficiency metrics
    const averageLitersPerHour = durationHours > 0 ? totalLiters / durationHours : 0
    const averageSalesPerHour = durationHours > 0 ? totalSales / durationHours : 0
    const averageLitersPerAssignment = assignments.length > 0 ? totalLiters / assignments.length : 0

    const shopAssignment = await prisma.shopAssignment.findFirst({
      where: { shiftId: id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    let shopSalesTotal = 0
    if (shopAssignment) {
      shopAssignment.items.forEach(item => {
        const sold = (item.closingStock !== null)
          ? Math.max(0, (item.openingStock + item.addedStock) - item.closingStock)
          : 0
        shopSalesTotal += sold * item.product.sellingPrice
      })
    }

    // Status breakdown
    const activeAssignments = assignments.filter(a => a.status === 'ACTIVE').length
    const closedAssignments = assignments.filter(a => a.status === 'CLOSED').length

    const statistics = {
      shift: {
        id: shift.id,
        status: shift.status,
        durationHours: Math.round(durationHours * 100) / 100,
        startTime: shift.startTime,
        endTime: shift.endTime,
        openedBy: shift.openedBy,
        closedBy: shift.closedBy
      },
      sales: {
        nozzleSales: Math.round(totalSales),
        shopSales: Math.round(shopSalesTotal),
        totalSales: Math.round(totalSales + shopSalesTotal),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        averageSalesPerHour: Math.round(averageSalesPerHour),
        averageLitersPerHour: Math.round(averageLitersPerHour * 100) / 100
      },
      assignments: {
        total: assignments.length,
        active: activeAssignments,
        closed: closedAssignments,
        averageLitersPerAssignment: Math.round(averageLitersPerAssignment * 100) / 100
      },
      shop: shopAssignment ? {
        pumperName: shopAssignment.pumperName,
        totalRevenue: shopSalesTotal,
        itemCount: shopAssignment.items.length
      } : null,
      pumperPerformance: Array.from(pumperStatsMap.values()).map((stats) => ({
        ...stats,
        totalLiters: Math.round(stats.totalLiters * 100) / 100,
        totalSales: Math.round(stats.totalSales),
        averageLitersPerAssignment: stats.assignmentCount > 0 ?
          Math.round((stats.totalLiters / stats.assignmentCount) * 100) / 100 : 0
      }))
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Error calculating shift statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
