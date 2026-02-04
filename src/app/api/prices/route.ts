import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    const fuelId = searchParams.get('fuelId')
    const fuelType = searchParams.get('fuelType')
    const datetime = searchParams.get('datetime')
    const stationId = searchParams.get('stationId')

    interface PriceWhereInput {
      fuelId?: string
      fuel?: { name: string }
      isActive?: boolean
      stationId?: string
      effectiveDate?: { lte: Date }
    }

    if (fuelId || fuelType) {
      const where: PriceWhereInput = {
        isActive: true
      }

      if (fuelId) {
        where.fuelId = fuelId
      } else if (fuelType) {
        where.fuel = { name: fuelType }
      }

      if (stationId) {
        where.stationId = stationId
      }

      if (datetime) {
        // Get price at specific date/time
        where.effectiveDate = { lte: new Date(datetime) }
        const price = await prisma.price.findFirst({
          where,
          orderBy: { effectiveDate: 'desc' },
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

        if (!price) {
          return NextResponse.json({ error: 'Price not found for the given date/time' }, { status: 404 })
        }
        return NextResponse.json(price)
      }

      // Get current price
      const price = await prisma.price.findFirst({
        where: {
          ...where,
          effectiveDate: { lte: new Date() }
        },
        orderBy: { effectiveDate: 'desc' },
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

      if (!price) {
        return NextResponse.json({ error: 'Current price not found for fuel type' }, { status: 404 })
      }
      return NextResponse.json(price)
    }

    if (current === 'true') {
      // Get current active prices
      const prices = await prisma.price.findMany({
        where: {
          isActive: true,
          effectiveDate: { lte: new Date() },
          ...(stationId ? { stationId } : {})
        },
        orderBy: [
          { stationId: 'asc' },
          { fuelId: 'asc' },
          { effectiveDate: 'desc' }
        ],
        distinct: ['stationId', 'fuelId'],
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
      return NextResponse.json(prices)
    }

    // Get all prices
    interface PriceWhereInput {
      stationId?: string
    }
    const where: PriceWhereInput = {}
    if (stationId) {
      where.stationId = stationId
    }

    const prices = await prisma.price.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        fuel: true
      },
      orderBy: [
        { stationId: 'asc' },
        { fuelId: 'asc' },
        { effectiveDate: 'desc' }
      ]
    })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { stationId, fuelId, price, effectiveDate } = body

    if (!stationId || !fuelId || price === undefined || !effectiveDate) {
      return NextResponse.json(
        { error: 'Station ID, fuel ID, price, and effective date are required' },
        { status: 400 }
      )
    }

    // Get current user for updatedBy
    const currentUser = await getServerUser()
    const updatedBy = currentUser ? currentUser.username : 'System User'

    const newPrice = await prisma.price.create({
      data: {
        stationId,
        fuelId,
        price: parseFloat(price),
        effectiveDate: new Date(effectiveDate),
        isActive: true,
        updatedBy
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

    return NextResponse.json(newPrice, { status: 201 })
  } catch (error) {
    console.error('Error creating price:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID or fuel ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

