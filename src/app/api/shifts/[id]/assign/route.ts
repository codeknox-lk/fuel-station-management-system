import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, createShiftAssignment, getShifts, getAssignmentsByShiftId } from '@/data/shifts.seed'
import { getNozzleById } from '@/data/tanks.seed'
import { getPumperById } from '@/data/pumpers.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    console.log('=== SHIFT ASSIGNMENT DEBUG ===')
    console.log('Looking for shift with ID:', id)
    console.log('Assignment data:', body)
    
    // Validate required fields
    if (!body.nozzleId || !body.pumperId || body.startMeterReading === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: nozzleId, pumperId, startMeterReading' 
      }, { status: 400 })
    }

    // Debug: List all shifts to see what's in memory
    const allShifts = getShifts()
    console.log('All shifts in memory:', allShifts.map(s => ({ id: s.id, status: s.status, stationId: s.stationId })))
    console.log('Global shifts array:', globalThis.__shifts)
    console.log('Global shifts length:', globalThis.__shifts?.length || 0)
    
    const shift = getShiftById(id)
    console.log('Found shift:', shift)
    console.log('=== END SHIFT ASSIGNMENT DEBUG ===')
    
    if (!shift) {
      console.log('Shift not found, returning 404')
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot assign to closed shift' }, { status: 400 })
    }

    // Validate nozzle exists and is available
    const nozzle = getNozzleById(body.nozzleId)
    if (!nozzle || !nozzle.isActive) {
      return NextResponse.json({ 
        error: 'Nozzle not found or inactive' 
      }, { status: 400 })
    }

    // Validate pumper exists and is active
    const pumper = getPumperById(body.pumperId)
    if (!pumper || pumper.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Pumper not found or inactive' 
      }, { status: 400 })
    }

    // Check if nozzle is already assigned to this shift
    const existingAssignments = getAssignmentsByShiftId(id)
    const nozzleAlreadyAssigned = existingAssignments.some(assignment => 
      assignment.nozzleId === body.nozzleId && assignment.status === 'ACTIVE'
    )

    if (nozzleAlreadyAssigned) {
      return NextResponse.json({ 
        error: 'Nozzle is already assigned to this shift' 
      }, { status: 400 })
    }

    // Check if nozzle is already assigned to ANY other active shift
    const allActiveShifts = getShifts().filter(shift => shift.status === 'OPEN')
    const nozzleAssignedElsewhere = allActiveShifts.some(activeShift => {
      if (activeShift.id === id) return false // Skip current shift
      const assignments = getAssignmentsByShiftId(activeShift.id)
      return assignments.some(assignment => 
        assignment.nozzleId === body.nozzleId && assignment.status === 'ACTIVE'
      )
    })

    if (nozzleAssignedElsewhere) {
      return NextResponse.json({ 
        error: 'Nozzle is already assigned to another active shift' 
      }, { status: 400 })
    }

    // Validate start meter reading is positive
    if (body.startMeterReading < 0) {
      return NextResponse.json({ 
        error: 'Start meter reading must be positive' 
      }, { status: 400 })
    }

    // Create the assignment with validation
    const newAssignment = createShiftAssignment({
      shiftId: id,
      nozzleId: body.nozzleId,
      pumperId: body.pumperId,
      pumperName: pumper.name,
      startMeterReading: body.startMeterReading,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString()
    })

    console.log('Assignment created successfully:', newAssignment)
    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error('Error assigning shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
