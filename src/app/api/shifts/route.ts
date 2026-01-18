import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
    const where: any = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (active === 'true') {
      where.status = 'OPEN'
    }
    if (status) {
      where.status = status
    }
    if (openedBy) {
      where.openedBy = {
        contains: openedBy,
        mode: 'insensitive'
      }
    }
    if (startDate) {
      where.startTime = {
        gte: new Date(startDate)
      }
    }
    if (endDate) {
      where.startTime = {
        ...where.startTime,
        lte: new Date(endDate)
      }
    }

    // Get total count for pagination
    const total = await prisma.shift.count({ where })

    // Get shifts with pagination
    const shifts = await prisma.shift.findMany({
      where,
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
        },
        _count: {
          select: {
            assignments: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Add assignment counts and statistics
    const shiftsWithStats = await Promise.all(shifts.map(async (shift) => {
      try {
        const assignmentCount = await prisma.shiftAssignment.count({
          where: { shiftId: shift.id }
        })
        
        const closedAssignments = await prisma.shiftAssignment.count({
          where: {
            shiftId: shift.id,
            status: 'CLOSED'
          }
        })

        let statistics = shift.statistics as any
        
        // If shift is closed but doesn't have statistics, calculate them
        if (shift.status === 'CLOSED' && !statistics) {
          try {
            const assignments = await prisma.shiftAssignment.findMany({
              where: { shiftId: shift.id },
              include: {
                nozzle: {
                  include: {
                    tank: {
                      select: {
                        id: true,
                        fuelType: true
                      }
                    }
                  }
                }
              }
            })

            let totalLiters = 0
            let totalSales = 0

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
                
                // Get price effective at shift start time (for consistency)
                // Add null checks for nested properties
                const fuelType = assignment.nozzle?.tank?.fuelType
                if (fuelType) {
                  try {
                    const price = await prisma.price.findFirst({
                      where: {
                        fuelType,
                        stationId: shift.stationId,
                        effectiveDate: { lte: shift.startTime },
                        isActive: true
                      },
                      orderBy: { effectiveDate: 'desc' }
                    })
                    
                    const pricePerLiter = price ? price.price : 470 // Fallback price
                    totalSales += litersSold * pricePerLiter
                  } catch (priceError) {
                    console.error(`Error fetching price for fuelType ${fuelType}:`, priceError)
                    // Use fallback price
                    totalSales += litersSold * 470
                  }
                } else {
                  // Use fallback price if fuelType is not available
                  totalSales += litersSold * 470
                }
              }
            }

            const durationHours = shift.endTime ? 
              (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60) : 0

            statistics = {
              durationHours: Math.round(durationHours * 100) / 100,
              totalSales: Math.round(totalSales),
              totalLiters: Math.round(totalLiters * 100) / 100,
              averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
              assignmentCount,
              closedAssignments
            }
          } catch (calcError) {
            console.error(`Error calculating statistics for shift ${shift.id}:`, calcError)
            // Use default statistics on error
            statistics = {
              assignmentCount,
              totalSales: 0,
              totalLiters: 0,
              durationHours: 0,
              averagePricePerLiter: 0,
              closedAssignments
            }
          }
        } else {
          statistics = statistics || {
            assignmentCount,
            totalSales: 0,
            totalLiters: 0,
            durationHours: 0,
            averagePricePerLiter: 0,
            closedAssignments
          }
        }

          const shiftData: any = {
            ...shift,
            statistics
          }

          // Include assignments for active shifts when requested
          if (active === 'true' && shift.status === 'OPEN') {
            try {
              const assignments = await prisma.shiftAssignment.findMany({
                where: { shiftId: shift.id },
                include: {
                  nozzle: {
                    include: {
                      pump: {
                        include: {
                          tank: {
                            select: {
                              id: true,
                              fuelType: true,
                              capacity: true,
                              currentLevel: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              })
              shiftData.assignments = assignments
            } catch (assignError) {
              console.error(`Error fetching assignments for shift ${shift.id}:`, assignError)
              shiftData.assignments = []
            }
          }

          return shiftData
        } catch (shiftError) {
          console.error(`Error processing shift ${shift.id}:`, shiftError)
          // Return shift with minimal data on error
          return {
            ...shift,
            statistics: shift.statistics || {},
            assignments: []
          }
        }
      }))

    // Calculate summary statistics
    const allShifts = await prisma.shift.findMany({
      where: {
        ...(stationId ? { stationId } : {})
      },
      select: {
        status: true,
        startTime: true
      }
    })

    const summary = {
      total,
      active: allShifts.filter(s => s.status === 'OPEN').length,
      closed: allShifts.filter(s => s.status === 'CLOSED').length,
      today: allShifts.filter(s => {
        const today = new Date().toDateString()
        return new Date(s.startTime).toDateString() === today
      }).length
    }

    return NextResponse.json({
      shifts: shiftsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
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
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or template ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
