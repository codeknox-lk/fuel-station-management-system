import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, closeAssignment } from '@/data/shifts.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignId: string }> }
) {
  try {
    const { id, assignId } = await params
    const body = await request.json()
    
    const shift = getShiftById(id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const { endMeterReading, endTime } = body
    
    if (!endMeterReading || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const assignment = closeAssignment(assignId, endMeterReading, endTime)
    
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
