import { NextRequest, NextResponse } from 'next/server'
import { getCheques, getChequesByStationId, getChequeById } from '@/data/financial.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const cheque = getChequeById(id)
      if (!cheque) {
        return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
      }
      return NextResponse.json(cheque)
    }

    if (stationId) {
      return NextResponse.json(getChequesByStationId(stationId))
    }

    return NextResponse.json(getCheques())
  } catch (error) {
    console.error('Error fetching cheques:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newCheque = {
      id: Date.now().toString(),
      ...body,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newCheque, { status: 201 })
  } catch (error) {
    console.error('Error creating cheque:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
