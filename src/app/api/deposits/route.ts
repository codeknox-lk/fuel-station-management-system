import { NextRequest, NextResponse } from 'next/server'
import { getDeposits, getDepositsByStationId, getDepositById } from '@/data/financial.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const deposit = getDepositById(id)
      if (!deposit) {
        return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
      }
      return NextResponse.json(deposit)
    }

    if (stationId) {
      return NextResponse.json(getDepositsByStationId(stationId))
    }

    return NextResponse.json(getDeposits())
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newDeposit = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newDeposit, { status: 201 })
  } catch (error) {
    console.error('Error creating deposit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
