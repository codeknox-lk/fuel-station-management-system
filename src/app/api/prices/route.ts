import { NextRequest, NextResponse } from 'next/server'
import { getPrices, getCurrentPrices, getPriceByFuelType, getPriceAtDateTime } from '@/data/prices.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    const fuelType = searchParams.get('fuelType')
    const datetime = searchParams.get('datetime')

    if (fuelType) {
      if (datetime) {
        const price = getPriceAtDateTime(fuelType, datetime)
        if (!price) {
          return NextResponse.json({ error: 'Price not found for the given date/time' }, { status: 404 })
        }
        return NextResponse.json(price)
      }
      
      const price = getPriceByFuelType(fuelType)
      if (!price) {
        return NextResponse.json({ error: 'Current price not found for fuel type' }, { status: 404 })
      }
      return NextResponse.json(price)
    }

    if (current === 'true') {
      return NextResponse.json(getCurrentPrices())
    }

    return NextResponse.json(getPrices())
  } catch (error) {
    console.error('Error fetching prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newPrice = {
      id: Date.now().toString(),
      ...body,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newPrice, { status: 201 })
  } catch (error) {
    console.error('Error creating price:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

