import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, createShiftAssignment, getShifts } from '@/data/shifts.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('Looking for shift with ID:', id)
    
    // Debug: List all shifts to see what's in memory
    const allShifts = getShifts()
    console.log('All shifts in memory:', allShifts.map(s => ({ id: s.id, status: s.status, stationId: s.stationId })))
    
    const shift = getShiftById(id)
    console.log('Found shift:', shift)
    
    if (!shift) {
      console.log('Shift not found, returning 404')
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot assign to closed shift' }, { status: 400 })
    }

    // Create the assignment using the new function
    const newAssignment = createShiftAssignment({
      shiftId: id,
      ...body,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString()
    })

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error('Error assigning shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
