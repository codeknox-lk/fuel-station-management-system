import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (!body.nozzleId || !body.pumperName || body.startMeterReading === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: nozzleId, pumperName, startMeterReading' 
      }, { status: 400 })
    }

    // Get shift
    const shift = await prisma.shift.findUnique({
      where: { id }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot assign to closed shift' }, { status: 400 })
    }

    // Validate nozzle exists and is active
    const nozzle = await prisma.nozzle.findUnique({
      where: { id: body.nozzleId }
    })
    
    if (!nozzle || !nozzle.isActive) {
      return NextResponse.json({ 
        error: 'Nozzle not found or inactive' 
      }, { status: 400 })
    }

    // Check if nozzle is already assigned to this shift
    const existingAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        shiftId: id,
        nozzleId: body.nozzleId,
        status: 'ACTIVE'
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'Nozzle is already assigned to this shift' 
      }, { status: 400 })
    }

    // Check if nozzle is already assigned to ANY other active shift
    const nozzleAssignedElsewhere = await prisma.shiftAssignment.findFirst({
      where: {
        nozzleId: body.nozzleId,
        status: 'ACTIVE',
        shift: {
          status: 'OPEN',
          id: { not: id }
        }
      }
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

    // Create the assignment
    const newAssignment = await prisma.shiftAssignment.create({
      data: {
        shiftId: id,
        nozzleId: body.nozzleId,
        pumperName: body.pumperName,
        startMeterReading: parseFloat(body.startMeterReading),
        status: 'ACTIVE'
      },
      include: {
        nozzle: {
          include: {
            pump: {
              select: {
                id: true,
                pumpNumber: true,
                isActive: true
              }
            },
            tank: {
              select: {
                id: true,
                fuelId: true,
                fuel: true,
                capacity: true,
                currentLevel: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error('Error assigning shift:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid shift or nozzle ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
