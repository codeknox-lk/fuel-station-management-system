import { NextRequest, NextResponse } from 'next/server'
import { getDeliveries, getDeliveriesByTankId, getDeliveriesByDateRange, getDeliveryById } from '@/data/tankOps.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')

    if (id) {
      const delivery = getDeliveryById(id)
      if (!delivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
      }
      return NextResponse.json(delivery)
    }

    if (tankId) {
      return NextResponse.json(getDeliveriesByTankId(tankId))
    }

    if (startDate && endDate) {
      return NextResponse.json(getDeliveriesByDateRange(startDate, endDate))
    }

    return NextResponse.json(getDeliveries())
  } catch (error) {
    console.error('Error fetching deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newDelivery = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newDelivery, { status: 201 })
  } catch (error) {
    console.error('Error creating delivery:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
