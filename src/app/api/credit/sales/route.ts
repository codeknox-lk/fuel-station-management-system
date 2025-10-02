import { NextRequest, NextResponse } from 'next/server'
import { getCreditSales, getCreditSalesByCustomerId, getCreditSalesByShiftId, getCreditSaleById } from '@/data/credit.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')

    if (id) {
      const sale = getCreditSaleById(id)
      if (!sale) {
        return NextResponse.json({ error: 'Credit sale not found' }, { status: 404 })
      }
      return NextResponse.json(sale)
    }

    if (customerId) {
      return NextResponse.json(getCreditSalesByCustomerId(customerId))
    }

    if (shiftId) {
      return NextResponse.json(getCreditSalesByShiftId(shiftId))
    }

    return NextResponse.json(getCreditSales())
  } catch (error) {
    console.error('Error fetching credit sales:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newSale = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newSale, { status: 201 })
  } catch (error) {
    console.error('Error creating credit sale:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
