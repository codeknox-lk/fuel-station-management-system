import { NextRequest, NextResponse } from 'next/server'
import { getPosMissingSlips, getPosMissingSlipsByShiftId, getPosMissingSlipsByTerminalId, getPosMissingSlipById } from '@/data/pos.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')

    if (id) {
      const slip = getPosMissingSlipById(id)
      if (!slip) {
        return NextResponse.json({ error: 'Missing slip not found' }, { status: 404 })
      }
      return NextResponse.json(slip)
    }

    if (shiftId) {
      return NextResponse.json(getPosMissingSlipsByShiftId(shiftId))
    }

    if (terminalId) {
      return NextResponse.json(getPosMissingSlipsByTerminalId(terminalId))
    }

    return NextResponse.json(getPosMissingSlips())
  } catch (error) {
    console.error('Error fetching missing slips:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newSlip = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newSlip, { status: 201 })
  } catch (error) {
    console.error('Error creating missing slip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
