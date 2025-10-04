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
      return NextResponse.json({ error: 'Cannot assign to closed shift' }, { status: 400 })
    }

    // In a real app, this would validate and save to database
    const newAssignment = {
      id: Date.now().toString(),
      shiftId: id,
      ...body,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error('Error assigning shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
