import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')

    if (id) {
      const dip = await prisma.tankDip.findUnique({
        where: { id },
        include: {
          tank: {
            select: {
              id: true,
              fuelType: true,
              capacity: true,
              currentLevel: true
            }
          },
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!dip) {
        return NextResponse.json({ error: 'Tank dip not found' }, { status: 404 })
      }
      return NextResponse.json(dip)
    }

    const where: any = {}
    if (tankId) {
      where.tankId = tankId
    }
    if (startDate && endDate) {
      where.dipDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const dips = await prisma.tankDip.findMany({
      where,
      include: {
        tank: {
          select: {
            id: true,
            tankNumber: true,
            fuelType: true,
            capacity: true,
            currentLevel: true
          }
        },
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { dipDate: 'desc' }
    })

    // Calculate variance for each dip and flatten tank data
    const dipsWithVariance = dips.map((dip, index) => {
      // Change from previous dip (useful for trend analysis)
      const changeFromPrevious =
        index < dips.length - 1
          ? dip.reading - dips[index + 1].reading
          : null
      const changePercentage =
        changeFromPrevious !== null && index < dips.length - 1 && dips[index + 1].reading > 0
          ? (changeFromPrevious / dips[index + 1].reading) * 100
          : null
      
      // Estimated variance using current tank level as proxy for book stock
      const estimatedBookStock = dip.tank?.currentLevel || null
      const variance = estimatedBookStock !== null
        ? estimatedBookStock - dip.reading
        : null
      const variancePercentage = variance !== null && estimatedBookStock !== null && estimatedBookStock > 0
        ? (Math.abs(variance) / estimatedBookStock) * 100
        : null
      
      return {
        ...dip,
        tankNumber: dip.tank?.tankNumber || null,
        fuelType: dip.tank?.fuelType || null,
        dipLitres: dip.reading,
        changeFromPrevious,
        changePercentage,
        variance,
        variancePercentage,
        estimatedBookStock
      }
    })

    return NextResponse.json(dipsWithVariance)
  } catch (error) {
    console.error('Error fetching tank dips:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { stationId, tankId, reading, recordedBy, dipDate, notes } = body
    
    if (!stationId || !tankId || reading === undefined || !recordedBy || !dipDate) {
      return NextResponse.json(
        { error: 'Station ID, tank ID, reading, recorded by, and dip date are required' },
        { status: 400 }
      )
    }

    // Get tank and station info for audit logging
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        station: true
      }
    })

    const newDip = await prisma.tankDip.create({
      data: {
        stationId,
        tankId,
        reading: parseFloat(reading),
        recordedBy,
        dipDate: new Date(dipDate),
        notes: notes || null
      },
      include: {
        tank: {
          select: {
            id: true,
            fuelType: true,
            capacity: true,
            currentLevel: true
          }
        },
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Audit logging
    if (tank && tank.station) {
      await auditOperations.tankDipRecorded(request, tankId, reading, tank.station.id, tank.station.name)
    }

    return NextResponse.json(newDip, { status: 201 })
  } catch (error) {
    console.error('Error creating tank dip:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or tank ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
