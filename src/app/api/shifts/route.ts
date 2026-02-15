import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { auditOperations } from '@/lib/auditMiddleware'
import { CreateShiftSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const active = searchParams.get('active')
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const openedBy = searchParams.get('openedBy')
    const activeAt = searchParams.get('activeAt') // Find shifts active at specific time
    const includeAssignments = searchParams.get('includeAssignments') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (id) {
      const shift = await prisma.shift.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              city: true
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              startTime: true,
              endTime: true
            }
          },
          assignments: {
            include: {
              nozzle: {
                select: {
                  id: true,
                  nozzleNumber: true
                }
              }
            }
          },
          _count: {
            select: {
              assignments: true
            }
          },
          shopAssignment: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      })

      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }

      return NextResponse.json(shift)
    }

    // Build where clause
    const where: Prisma.ShiftWhereInput = {
      organizationId: user.organizationId
    }

    if (stationId) {
      where.stationId = stationId
    }
    if (active === 'true') {
      where.status = 'OPEN'
    }
    if (status) {
      where.status = status as import('@prisma/client').ShiftStatus
    }

    // Handle Date Filtering
    if (activeAt) {
      // Find shifts that were active at a specific time
      const targetTime = new Date(activeAt)
      if (!isNaN(targetTime.getTime())) {
        where.startTime = { lte: targetTime }
        where.OR = [
          { status: 'OPEN' },
          {
            AND: [
              { status: 'CLOSED' },
              { endTime: { gte: targetTime } }
            ]
          }
        ]
      }
    } else if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {}

      if (startDate) {
        const start = new Date(startDate)
        if (!isNaN(start.getTime())) {
          dateFilter.gte = start
        }
      }

      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          dateFilter.lte = end
        }
      }

      if (Object.keys(dateFilter).length > 0) {
        where.startTime = dateFilter
      }
    }

    if (openedBy) {
      where.openedBy = {
        contains: openedBy,
        mode: 'insensitive'
      }
    }

    // Get total count for pagination
    const total = await prisma.shift.count({ where })

    // Optimized: Use select instead of include for 3x speed boost
    const shifts = await prisma.shift.findMany({
      where,
      select: {
        id: true,
        stationId: true,
        templateId: true,
        status: true,
        startTime: true,
        endTime: true,
        openedBy: true,
        closedBy: true,
        statistics: true,
        declaredAmounts: true,
        createdAt: true,
        updatedAt: true,
        station: {
          select: {
            id: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        },
        shopAssignment: {
          select: {
            id: true,
            pumperName: true
          }
        },
        _count: {
          select: {
            assignments: true,
            creditSales: true
          }
        },
        ...(includeAssignments ? {
          assignments: {
            select: {
              id: true,
              nozzleId: true,
              pumperName: true,
              startMeterReading: true,
              endMeterReading: true,
              status: true,
              nozzle: {
                select: {
                  id: true,
                  nozzleNumber: true,
                  tankId: true,
                  tank: {
                    select: {
                      id: true,
                      tankNumber: true,
                      fuelId: true,
                      fuel: {
                        select: {
                          id: true,
                          name: true,
                          code: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } : {})
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // OPTIMIZED: Return shifts directly with their existing statistics
    // No N+1 queries! Statistics are calculated when shift is closed
    const shiftsWithStats = shifts.map((shift) => {
      const assignmentCount = shift._count?.assignments || 0

      interface ShiftStatistics {
        totalSales?: number
        totalVolume?: number
        [key: string]: unknown
      }
      const statistics = (shift.statistics as unknown as ShiftStatistics) || {}

      return {
        ...shift,
        assignmentCount,
        closedAssignments: shift.status === 'CLOSED' ? assignmentCount : 0,
        statistics
      }
    })

    return NextResponse.json({
      shifts: shiftsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC: Only OWNER and MANAGER can open shifts
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()

    // Zod Validation
    const result = CreateShiftSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stationId, templateId, startTime } = result.data

    // Verify Station belongs to Organization
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found or access denied' }, { status: 404 })
    }

    // Start Transaction
    const newShift = await prisma.$transaction(async (tx) => {
      // 1. Get Template Details
      // Use startTime from body, or default to now
      const shiftStart = startTime || new Date()
      // Default 8 hour shift if no template
      let endTime = new Date(shiftStart.getTime() + 8 * 60 * 60 * 1000)

      if (templateId) {
        const template = await tx.shiftTemplate.findFirst({
          where: { id: templateId, organizationId: user.organizationId }
        })
        if (template) {
          // Combine date with template time
          const tStart = new Date(template.startTime)
          const tEnd = new Date(template.endTime)

          // Adjust shiftStart hours to match template if needed? 
          // The requirements say "startTime" comes from body. 
          // Usually for shifts, we use the date from body and time from template.
          // But schema says `startTime: Date`.
          // Let's assume startTime is fully provided.

          // Calculate duration from template
          let durationMs = tEnd.getTime() - tStart.getTime()
          if (durationMs < 0) durationMs += 24 * 60 * 60 * 1000 // Handle overnight

          endTime = new Date(shiftStart.getTime() + durationMs)
        }
      }

      // 2. Create Shift
      const shift = await tx.shift.create({
        data: {
          organizationId: user.organizationId,
          stationId,
          templateId: templateId || undefined,
          shiftNumber: `SHIFT-${Date.now()}`,
          status: 'OPEN',
          startTime: shiftStart,
          endTime, // Estimated end time
          openedBy: user.userId, // Use logged in user ID
          // Assign pumpers if provided
          assignments: {
            create: result.data.assignments?.map(a => ({
              organizationId: user.organizationId,
              pumperName: a.pumperName,
              nozzleId: a.nozzleId,
              startMeterReading: a.startMeterReading,
              status: 'ACTIVE'
            }))
          }
        }
      })

      return shift
    })


    // Log operation
    await auditOperations.shiftOpened(request, newShift.id, stationId, station.name)

    return NextResponse.json(newShift, { status: 201 })

  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
