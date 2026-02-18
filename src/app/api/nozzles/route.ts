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
    const pumpId = searchParams.get('pumpId')
    const tankId = searchParams.get('tankId')

    const where: Prisma.NozzleWhereInput = {
      organizationId: user.organizationId
    }
    if (pumpId) {
      where.pumpId = pumpId
    }
    if (tankId) {
      where.tankId = tankId
    }

    const nozzles = await prisma.nozzle.findMany({
      where,
      include: {
        pump: {
          select: {
            id: true,
            pumpNumber: true,
            stationId: true,
            station: {
              select: {
                id: true,
                name: true
              }
            }
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

    // Filter by stationId if provided (check through pump relation)
    const filteredNozzles = stationId
      ? nozzles.filter(n => n.pump.stationId === stationId)
      : nozzles

    return NextResponse.json(filteredNozzles)
  } catch (error) {
    console.error('Error fetching nozzles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    interface NozzleBody {
      pumpId?: string
      tankId?: string
      nozzleNumber?: string
      isActive?: boolean
    }
    const body = await request.json() as NozzleBody

    const { pumpId, tankId, nozzleNumber, isActive } = body

    // Validation
    if (!pumpId || !tankId || !nozzleNumber) {
      return NextResponse.json(
        { error: 'Pump ID, tank ID, and nozzle number are required' },
        { status: 400 }
      )
    }

    // Verify pump exists and belongs to organization
    const pump = await prisma.pump.findFirst({
      where: {
        id: pumpId,
        organizationId: user.organizationId
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

    if (!pump) {
      return NextResponse.json(
        { error: 'Pump not found or access denied' },
        { status: 404 }
      )
    }

    // Verify tank exists and belongs to organization
    const tank = await prisma.tank.findFirst({
      where: {
        id: tankId,
        organizationId: user.organizationId
      }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found or access denied' },
        { status: 404 }
      )
    }

    // Verify pump and tank are at the same station
    if (pump.stationId !== tank.stationId) {
      return NextResponse.json(
        { error: 'Pump and tank must be at the same station' },
        { status: 400 }
      )
    }

    // Create nozzle
    const newNozzle = await prisma.nozzle.create({
      data: {
        pumpId,
        tankId,
        nozzleNumber,
        isActive: isActive !== undefined ? isActive : true,
        organizationId: user.organizationId
      },
      include: {
        pump: {
          select: {
            id: true,
            pumpNumber: true,
            station: {
              select: {
                id: true,
                name: true
              }
            }
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
      }
    })

    return NextResponse.json(newNozzle, { status: 201 })
  } catch (error) {
    console.error('Error creating nozzle:', error)

    // Handle unique constraint violations (duplicate nozzle number on same pump)
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
      return NextResponse.json(
        { error: 'A nozzle with this number already exists on this pump' },
        { status: 400 }
      )
    }

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid pump ID or tank ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



