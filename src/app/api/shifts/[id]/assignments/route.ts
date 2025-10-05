import { NextRequest, NextResponse } from 'next/server'
import { getAssignmentsByShiftId } from '@/data/shifts.seed'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const assignments = getAssignmentsByShiftId(id)
    
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}