import { NextRequest, NextResponse } from 'next/server'
import { prices } from '@/data/prices.seed'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const priceIndex = prices.findIndex(p => p.id === id)
    if (priceIndex === -1) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    prices[priceIndex] = {
      ...prices[priceIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(prices[priceIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const priceIndex = prices.findIndex(p => p.id === id)
    if (priceIndex === -1) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    prices.splice(priceIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 })
  }
}

