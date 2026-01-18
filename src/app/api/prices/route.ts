import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    const fuelType = searchParams.get('fuelType')
    const datetime = searchParams.get('datetime')
    const stationId = searchParams.get('stationId')

    if (fuelType) {
      const where: any = {
        fuelType,
        isActive: true
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
            }
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
          }
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
          { fuelType: 'asc' },
          { effectiveDate: 'desc' }
        ],
        distinct: ['stationId', 'fuelType'],
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      return NextResponse.json(prices)
    }

    // Get all prices
    const where: any = {}
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
        }
      },
      orderBy: [
        { stationId: 'asc' },
        { fuelType: 'asc' },
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
    
    const { stationId, fuelType, price, effectiveDate } = body
    
    if (!stationId || !fuelType || price === undefined || !effectiveDate) {
      return NextResponse.json(
        { error: 'Station ID, fuel type, price, and effective date are required' },
        { status: 400 }
      )
    }

    const newPrice = await prisma.price.create({
      data: {
        stationId,
        fuelType,
        price: parseFloat(price),
        effectiveDate: new Date(effectiveDate),
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

    return NextResponse.json(newPrice, { status: 201 })
  } catch (error) {
    console.error('Error creating price:', error)
    
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

