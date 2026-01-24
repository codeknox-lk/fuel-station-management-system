import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
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
      const shift = await prisma.shift.findUnique({
        where: { id },
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
          }
        }
      })

      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }

      return NextResponse.json(shift)
    }

    // Build where clause
    const where: Prisma.ShiftWhereInput = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (active === 'true') {
      where.status = 'OPEN'
    }
    if (status) {
      where.status = status as any
    }

    // Find shifts that were active at a specific time
    // A shift is active at time T if:
    // - It started before or at T
    // - AND it's either still OPEN or was closed after T
    if (activeAt) {
      const targetTime = new Date(activeAt)
      where.startTime = {
        lte: targetTime
      }
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

    if (openedBy) {
      where.openedBy = {
        contains: openedBy,
        mode: 'insensitive'
      }
    }
    if (startDate && !activeAt) {
      where.startTime = {
        gte: new Date(startDate)
      }
    }
    if (endDate && !activeAt) {
      where.startTime = {
        ...(where.startTime as any),
        lte: new Date(endDate)
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
    interface ShiftBody {
      stationId?: string
      templateId?: string
      startTime?: string
      assignments?: { nozzleId: string; status?: string }[]
      openedBy?: string
    }
    const body = await request.json() as ShiftBody

    // Validate required fields
    if (!body.stationId || !body.templateId || !body.startTime) {
      return NextResponse.json({
        error: 'Missing required fields: stationId, templateId, startTime'
      }, { status: 400 })
    }

    // Validate station exists and is active
    const station = await prisma.station.findUnique({
      where: { id: body.stationId }
    })
    if (!station || !station.isActive) {
      return NextResponse.json({
        error: 'Station not found or inactive'
      }, { status: 400 })
    }

    // Validate template exists
    const template = await prisma.shiftTemplate.findUnique({
      where: { id: body.templateId }
    })
    if (!template) {
      return NextResponse.json({
        error: 'Shift template not found'
      }, { status: 400 })
    }

    // Create the shift
    const newShift = await prisma.shift.create({
      data: {
        stationId: body.stationId,
        templateId: body.templateId,
        startTime: new Date(body.startTime),
        openedBy: body.openedBy || 'System',
        status: 'OPEN'
      },
      include: {
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
        }
      }
    })

    // Audit logging
    await auditOperations.shiftOpened(request, newShift.id, station.id, station.name)

    return NextResponse.json(newShift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
