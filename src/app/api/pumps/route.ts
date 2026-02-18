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

    const where: Prisma.PumpWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }

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
            isActive: true,
            tank: {
              select: {
                id: true,
                fuelId: true,
                fuel: true
              }
            }
          }
        }
      },
      orderBy: { pumpNumber: 'asc' }
    })

    return NextResponse.json(pumps)
  } catch (error) {
    console.error('Error fetching pumps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    interface PumpBody {
      stationId?: string
      pumpNumber?: string
      isActive?: boolean
    }
    const body = await request.json() as PumpBody

    const { stationId, pumpNumber, isActive } = body

    // Validation
    if (!stationId || !pumpNumber) {
      return NextResponse.json(
        { error: 'Station ID and pump number are required' },
        { status: 400 }
      )
    }

    // Verify station exists and belongs to the same organization
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or access denied' },
        { status: 404 }
      )
    }

    if (!station.isActive) {
      return NextResponse.json(
        { error: 'Cannot create pump for inactive station' },
        { status: 400 }
      )
    }

    // Create pump
    const newPump = await prisma.pump.create({
      data: {
        stationId,
        pumpNumber,
        isActive: isActive !== undefined ? isActive : true,
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

    return NextResponse.json(newPump, { status: 201 })
  } catch (error) {
    console.error('Error creating pump:', error)

    // Handle unique constraint violations (duplicate pump number at same station)
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
      return NextResponse.json(
        { error: 'A pump with this number already exists at this station' },
        { status: 400 }
      )
    }

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



