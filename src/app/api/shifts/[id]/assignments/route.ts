import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, getAssignmentsByShiftId } from '@/data/shifts.seed'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shift = getShiftById(id)
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const assignments = getAssignmentsByShiftId(id)
    return NextResponse.json(assignments)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
