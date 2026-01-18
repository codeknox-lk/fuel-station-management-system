import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const pumpId = searchParams.get('pumpId')
    const tankId = searchParams.get('tankId')

    const where: any = {}
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
            fuelType: true,
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
    const body = await request.json()
    
    const { pumpId, tankId, nozzleNumber, isActive } = body
    
    // Validation
    if (!pumpId || !tankId || !nozzleNumber) {
      return NextResponse.json(
        { error: 'Pump ID, tank ID, and nozzle number are required' },
        { status: 400 }
      )
    }

    // Verify pump exists
    const pump = await prisma.pump.findUnique({
      where: { id: pumpId },
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
        { error: 'Pump not found' },
        { status: 404 }
      )
    }

    // Verify tank exists and get its station
    const tank = await prisma.tank.findUnique({
      where: { id: tankId }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found' },
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
        isActive: isActive !== undefined ? isActive : true
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
            fuelType: true,
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



