import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

import { CreateTankSchema } from '@/lib/schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const type = searchParams.get('type') // tanks, pumps, nozzles

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (id) {
      const tank = await prisma.tank.findFirst({
        where: { id, organizationId: user.organizationId },
        select: {
          id: true,
          tankNumber: true,
          capacity: true,
          currentLevel: true,
          fuelId: true,
          stationId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          station: {
            select: {
              id: true,
              name: true
            }
          },
          fuel: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          nozzles: {
            select: {
              id: true,
              nozzleNumber: true,
              isActive: true,
              pumpId: true,
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
      const where = {
        organizationId: user.organizationId,
        ...(stationId && { stationId })
      }
      // Optimized: Use select for better performance
      const pumps = await prisma.pump.findMany({
        where,
        select: {
          id: true,
          pumpNumber: true,
          isActive: true,
          stationId: true,
          createdAt: true,
          updatedAt: true,
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
          where: {
            pumpId,
            organizationId: user.organizationId
          },
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
                fuelId: true,
                fuel: true
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
        where: { stationId, organizationId: user.organizationId },
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
          pumpId: { in: pumpIds },
          organizationId: user.organizationId
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
              fuelId: true,
              fuel: true,
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
    interface TankWhereInput {
      organizationId: string
      stationId?: string
    }
    const where: TankWhereInput = {
      organizationId: user.organizationId,
      ...(stationId && { stationId })
    }

    // Filter out oil tanks for dipping operations if type is 'tanks'
    if (type === 'tanks') {
      // We filter out OIL tanks in code after fetching
    }

    // Optimized: Use select instead of include for better performance
    const tanks = await prisma.tank.findMany({
      where,
      select: {
        id: true,
        tankNumber: true,
        capacity: true,
        currentLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        fuelId: true,
        stationId: true,
        station: {
          select: {
            id: true,
            name: true
          }
        },
        fuel: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true
          }
        },
        nozzles: {
          select: {
            id: true,
            nozzleNumber: true,
            isActive: true,
            pumpId: true,
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            }
          }
        }
      },
      orderBy: { tankNumber: 'asc' }
    })

    // Filter out oil tanks if type is 'tanks' (for dipping operations)
    if (type === 'tanks') {
      const filteredTanks = tanks.filter(tank => tank.fuel?.code !== 'OIL')
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Zod Validation
    const result = CreateTankSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stationId, fuelId, capacity, currentLevel, tankNumber: inputTankNumber } = result.data

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

    // Verify station exists and belongs to the same organization
    const station = await prisma.station.findFirst({
      where: { id: stationId, organizationId: user.organizationId }
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
    let tankNumber = inputTankNumber
    if (!tankNumber) {
      // Find highest tank number for this station (regardless of fuel type)
      // because tankNumber must be unique per station
      const existingTanks = await prisma.tank.findMany({
        where: {
          stationId,
          organizationId: user.organizationId
        },
        select: { tankNumber: true }
      })

      if (existingTanks.length === 0) {
        tankNumber = 'TANK-01'
      } else {
        // Get the highest number from existing tanks
        const numbers = existingTanks
          .map(t => parseInt(t.tankNumber.replace(/[^0-9]/g, '')) || 0)
        const maxNum = Math.max(...numbers)
        tankNumber = `TANK-${(maxNum + 1).toString().padStart(2, '0')}`
      }
    } else {
      // Check if custom tank number already exists
      const existingTank = await prisma.tank.findFirst({
        where: {
          stationId,
          tankNumber,
          organizationId: user.organizationId
        }
      })

      if (existingTank) {
        return NextResponse.json(
          { error: 'Tank number already exists at this station' },
          { status: 400 }
        )
      }
    }

    // Create tank
    const newTank = await prisma.tank.create({
      data: {
        stationId,
        tankNumber,
        fuelId,
        capacity,
        currentLevel: initialLevel,
        isActive: true,
        organizationId: user.organizationId
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        fuel: true
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
