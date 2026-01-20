import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    const where: any = {}
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
    const body = await request.json()
    
    const { stationId, pumpNumber, isActive } = body
    
    // Validation
    if (!stationId || !pumpNumber) {
      return NextResponse.json(
        { error: 'Station ID and pump number are required' },
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
        { error: 'Cannot create pump for inactive station' },
        { status: 400 }
      )
    }

    // Create pump
    const newPump = await prisma.pump.create({
      data: {
        stationId,
        pumpNumber,
        isActive: isActive !== undefined ? isActive : true
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



