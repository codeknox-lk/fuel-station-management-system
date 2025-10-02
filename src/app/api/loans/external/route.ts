import { NextRequest, NextResponse } from 'next/server'
import { getLoansExternal, getLoansExternalByStationId, getLoanExternalById } from '@/data/financial.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const loan = getLoanExternalById(id)
      if (!loan) {
        return NextResponse.json({ error: 'External loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    if (stationId) {
      return NextResponse.json(getLoansExternalByStationId(stationId))
    }

    return NextResponse.json(getLoansExternal())
  } catch (error) {
    console.error('Error fetching external loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newLoan = {
      id: Date.now().toString(),
      ...body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newLoan, { status: 201 })
  } catch (error) {
    console.error('Error creating external loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
