import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const type = searchParams.get('type') // tanks, pumps, nozzles

    if (id) {
      // Get specific tank with all relations
      const tank = await prisma.tank.findUnique({
        where: { id },
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          },
          nozzles: {
            include: {
              pump: {
                select: {
                  id: true,
                  pumpNumber: true
                }
              }
            }
          }
        }
      })
      
      if (!tank) {
        return NextResponse.json({ error: 'Tank not found' }, { status: 404 })
      }
      return NextResponse.json(tank)
    }

    if (type === 'pumps') {
      const where = stationId ? { stationId } : {}
      const pumps = await prisma.pump.findMany({
        where,
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          },
          nozzles: {
            select: {
              id: true,
              nozzleNumber: true,
              isActive: true
            }
          }
        },
        orderBy: { pumpNumber: 'asc' }
      })
      return NextResponse.json(pumps)
    }

    if (type === 'nozzles') {
      const pumpId = searchParams.get('pumpId')
      
      if (pumpId) {
        const nozzles = await prisma.nozzle.findMany({
          where: { pumpId },
          include: {
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            },
            tank: {
              select: {
                id: true,
                fuelType: true
              }
            }
          },
          orderBy: { nozzleNumber: 'asc' }
        })
        return NextResponse.json(nozzles)
      }
      
      // Get nozzles by station with fuel type
      // First get pumps for the station, then get nozzles
      if (!stationId) {
        return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
      }
      
      // Get pumps for the station first
      const pumps = await prisma.pump.findMany({
        where: { stationId },
        select: { id: true }
      })
      
      const pumpIds = pumps.map(p => p.id)
      
      if (pumpIds.length === 0) {
        return NextResponse.json([])
      }
      
      // Get nozzles for those pumps
      // Note: Nozzle has tankId directly, not through pump
      const nozzles = await prisma.nozzle.findMany({
        where: {
          pumpId: { in: pumpIds }
        },
        include: {
          pump: {
            select: {
              id: true,
              pumpNumber: true,
              stationId: true,
              isActive: true
            }
          },
          tank: {
            select: {
              id: true,
              fuelType: true,
              capacity: true,
              currentLevel: true
            }
          }
        },
        orderBy: { nozzleNumber: 'asc' }
      })
      
      return NextResponse.json(nozzles)
    }

    // Get tanks
    const where: any = {}
    if (stationId) {
      where.stationId = stationId
    }
    
    // Filter out oil tanks for dipping operations if type is 'tanks'
    if (type === 'tanks') {
      // In Prisma, we can filter by fuelType, but OIL might not be a valid FuelType enum value
      // For now, we'll get all tanks and filter in code if needed
      // Or we can just return all tanks and let the frontend handle the filtering
    }

    const tanks = await prisma.tank.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        nozzles: {
          include: {
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Filter out oil tanks if type is 'tanks' (for dipping operations)
    if (type === 'tanks') {
      const filteredTanks = tanks.filter(tank => tank.fuelType !== 'OIL')
      return NextResponse.json(filteredTanks)
    }

    return NextResponse.json(tanks)
  } catch (error) {
    console.error('Error fetching tanks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { stationId, fuelType, capacity, currentLevel } = body
    
    // Validation
    if (!stationId || !fuelType || !capacity) {
      return NextResponse.json(
        { error: 'Station ID, fuel type, and capacity are required' },
        { status: 400 }
      )
    }

    if (capacity <= 0) {
      return NextResponse.json(
        { error: 'Capacity must be greater than 0' },
        { status: 400 }
      )
    }

    const initialLevel = currentLevel || 0
    
    if (initialLevel < 0 || initialLevel > capacity) {
      return NextResponse.json(
        { error: 'Initial level must be between 0 and capacity' },
        { status: 400 }
      )
    }

    // Verify station exists and is active
    const station = await prisma.station.findUnique({
      where: { id: stationId }
    })

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      )
    }

    if (!station.isActive) {
      return NextResponse.json(
        { error: 'Cannot create tank for inactive station' },
        { status: 400 }
      )
    }

    // Generate unique tank number if not provided
    let tankNumber = body.tankNumber
    if (!tankNumber) {
      // Find highest tank number for this station (regardless of fuel type)
      // because tankNumber must be unique per station
      const existingTanks = await prisma.tank.findMany({
        where: { 
          stationId
        },
        select: { tankNumber: true }
      })
      
      if (existingTanks.length === 0) {
        tankNumber = 'TANK-1'
      } else {
        // Get the highest number from existing tanks
        const numbers = existingTanks
          .map(t => parseInt(t.tankNumber.replace(/[^0-9]/g, '')) || 0)
        const maxNum = Math.max(...numbers)
        tankNumber = `TANK-${maxNum + 1}`
      }
    }

    // Create tank
    const newTank = await prisma.tank.create({
      data: {
        stationId,
        tankNumber,
        fuelType,
        capacity: parseFloat(capacity),
        currentLevel: parseFloat(initialLevel),
        isActive: true
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Note: No specific audit operation for tank creation yet

    return NextResponse.json(newTank, { status: 201 })
  } catch (error) {
    console.error('Error creating tank:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
