import { NextRequest, NextResponse } from 'next/server'
import { getLoansPumper, getLoansPumperByStationId, getLoanPumperById } from '@/data/financial.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const loan = getLoanPumperById(id)
      if (!loan) {
        return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    if (stationId) {
      return NextResponse.json(getLoansPumperByStationId(stationId))
    }

    return NextResponse.json(getLoansPumper())
  } catch (error) {
    console.error('Error fetching pumper loans:', error)
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
    console.error('Error creating pumper loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
