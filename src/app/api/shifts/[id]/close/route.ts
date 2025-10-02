import { NextRequest, NextResponse } from 'next/server'
import { getShiftById } from '@/data/shifts.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const shift = getShiftById(id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Shift already closed' }, { status: 400 })
    }

    // In a real app, this would update the database
    const updatedShift = {
      ...shift,
      status: 'CLOSED',
      endTime: new Date().toISOString(),
      closedBy: body.closedBy || 'System',
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Error closing shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
