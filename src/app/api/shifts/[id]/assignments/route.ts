import { NextRequest, NextResponse } from 'next/server'
import { getShiftAssignments } from '@/data/shifts.seed'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shiftId = params.id
    const assignments = getShiftAssignments(shiftId)
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching shift assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}