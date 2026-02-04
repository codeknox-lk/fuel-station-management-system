import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'
import { CreateTankDipSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

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
              fuelId: true,
              fuel: true,
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

    interface TankDipWhereInput {
      tankId?: string
      dipDate?: {
        gte: Date
        lte: Date
      }
    }
    const where: TankDipWhereInput = {}
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
            fuelId: true,
            fuel: true,
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
        fuel: dip.tank?.fuel || null,
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

    // Zod Validation
    const result = CreateTankDipSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stationId, tankId, reading, recordedBy, dipDate, notes } = result.data

    // Get tank and station info for audit logging
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        station: true
      }
    })

    // Get current user for recordedBy
    const currentUser = await getServerUser()
    const secureRecordedBy = currentUser ? currentUser.username : (recordedBy || 'System User')

    const newDip = await prisma.tankDip.create({
      data: {
        stationId,
        tankId,
        reading,
        recordedBy: secureRecordedBy,
        dipDate,
        notes: notes || null
      },
      include: {
        tank: {
          select: {
            id: true,
            fuelId: true,
            fuel: true,
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
