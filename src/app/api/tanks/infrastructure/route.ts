import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Get station
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        name: true
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Get all tanks for this station
    const tanks = await prisma.tank.findMany({
      where: { 
        stationId,
        isActive: true
      },
      select: {
        id: true,
        fuelType: true,
        capacity: true,
        currentLevel: true,
        nozzles: {
          select: {
            id: true,
            nozzleNumber: true,
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            }
          },
          orderBy: {
            nozzleNumber: 'asc'
          }
        }
      },
      orderBy: {
        fuelType: 'asc'
      }
    })

    // Get all pumps for this station
    const pumps = await prisma.pump.findMany({
      where: { 
        stationId,
        isActive: true
      },
      select: {
        id: true,
        pumpNumber: true,
        nozzles: {
          select: {
            id: true,
            nozzleNumber: true,
            tank: {
              select: {
                id: true,
                fuelType: true
              }
            }
          },
          orderBy: {
            nozzleNumber: 'asc'
          }
        }
      },
      orderBy: {
        pumpNumber: 'asc'
      }
    })

    return NextResponse.json({
      station,
      tanks,
      pumps
    })
  } catch (error) {
    console.error('Error fetching infrastructure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



