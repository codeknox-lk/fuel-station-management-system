import { NextRequest, NextResponse } from 'next/server'
import { 
  getOilSales, 
  getOilSalesByStationId, 
  getOilSalesByShiftId,
  getOilSalesByDateRange,
  getOilSalesSummary,
  addOilSale 
} from '@/data/oilSales.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const shiftId = searchParams.get('shiftId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const summary = searchParams.get('summary')
    const limit = searchParams.get('limit')

    // Get summary
    if (summary === 'true') {
      return NextResponse.json(getOilSalesSummary(stationId || undefined, startDate || undefined, endDate || undefined))
    }

    // Filter by shift
    if (shiftId) {
      return NextResponse.json(getOilSalesByShiftId(shiftId))
    }

    // Filter by date range
    if (startDate && endDate) {
      let sales = getOilSalesByDateRange(startDate, endDate)
      if (stationId) {
        sales = sales.filter(sale => sale.stationId === stationId)
      }
      if (limit) {
        sales = sales.slice(0, parseInt(limit))
      }
      return NextResponse.json(sales)
    }

    // Filter by station
    if (stationId) {
      let sales = getOilSalesByStationId(stationId)
      if (limit) {
        sales = sales.slice(0, parseInt(limit))
      }
      return NextResponse.json(sales)
    }

    // Get all sales
    let sales = getOilSales()
    if (limit) {
      sales = sales.slice(0, parseInt(limit))
    }
    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching oil sales:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.stationId || !body.oilType || !body.quantity || !body.unitPrice || !body.soldBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newSale = addOilSale({
      stationId: body.stationId,
      shiftId: body.shiftId,
      oilType: body.oilType,
      quantity: parseFloat(body.quantity),
      unitPrice: parseFloat(body.unitPrice),
      soldBy: body.soldBy,
      soldAt: body.soldAt || new Date().toISOString(),
      paymentMethod: body.paymentMethod || 'CASH',
      customerName: body.customerName,
      notes: body.notes
    })

    return NextResponse.json(newSale, { status: 201 })
  } catch (error) {
    console.error('Error creating oil sale:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
