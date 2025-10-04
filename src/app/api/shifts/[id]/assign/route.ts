import { NextRequest, NextResponse } from 'next/server'
import { addShiftAssignment } from '@/data/shifts.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shiftId = params.id
    const body = await request.json()
    
    // Validate required fields
    if (!body.nozzleId || !body.pumperId) {
      return NextResponse.json({ error: 'Missing required fields: nozzleId, pumperId' }, { status: 400 })
    }

    const assignment = addShiftAssignment({
      shiftId,
      nozzleId: body.nozzleId,
      pumperId: body.pumperId,
      startMeter: body.startMeter || 0,
      startTime: body.startTime || new Date().toISOString()
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating shift assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}