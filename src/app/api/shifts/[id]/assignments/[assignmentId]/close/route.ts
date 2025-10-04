import { NextRequest, NextResponse } from 'next/server'
import { closeShiftAssignment } from '@/data/shifts.seed'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } }
) {
  try {
    const { assignmentId } = params
    const body = await request.json()
    
    // Validate required fields
    if (!body.endMeter || !body.endTime) {
      return NextResponse.json({ error: 'Missing required fields: endMeter, endTime' }, { status: 400 })
    }

    const assignment = closeShiftAssignment(assignmentId, {
      endMeter: body.endMeter,
      endTime: body.endTime
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error closing shift assignment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
