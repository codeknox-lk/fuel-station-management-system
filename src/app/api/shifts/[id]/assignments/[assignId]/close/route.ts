import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignId: string }> }
) {
  try {
    const { id, assignId } = await params
    const body = await request.json()
    
    const shift = await prisma.shift.findUnique({
      where: { id }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const { endMeterReading } = body
    
    if (endMeterReading === undefined) {
      return NextResponse.json({ error: 'Missing required field: endMeterReading' }, { status: 400 })
    }

    // Get assignment
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignId }
    })
    
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    if (assignment.shiftId !== id) {
      return NextResponse.json({ error: 'Assignment does not belong to this shift' }, { status: 400 })
    }

    if (assignment.status === 'CLOSED') {
      return NextResponse.json({ error: 'Assignment is already closed' }, { status: 400 })
    }

    // Validate end meter reading
    if (endMeterReading < assignment.startMeterReading) {
      return NextResponse.json({ 
        error: 'End meter reading cannot be less than start meter reading' 
      }, { status: 400 })
    }

    // Close assignment
    console.log('🔧 Closing assignment:', assignId, 'with end reading:', endMeterReading)
    
    let updatedAssignment
    try {
      updatedAssignment = await prisma.shiftAssignment.update({
        where: { id: assignId },
        data: {
          endMeterReading: parseFloat(endMeterReading),
          status: 'CLOSED',
          closedAt: new Date()
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
                  fuelType: true,
                  capacity: true,
                  currentLevel: true
                }
              }
            }
          }
        }
      })
      
      console.log('✅ Assignment closed successfully:', updatedAssignment.id)
    } catch (updateError) {
      console.error('❌ Error updating assignment:', updateError)
      if (updateError instanceof Error) {
        console.error('Update error message:', updateError.message)
        console.error('Update error stack:', updateError.stack)
        
        // Check for specific Prisma errors
        if (updateError.message.includes('Unique constraint')) {
          return NextResponse.json({ 
            error: 'Unique constraint violation',
            details: updateError.message 
          }, { status: 400 })
        }
        if (updateError.message.includes('Foreign key constraint')) {
          return NextResponse.json({ 
            error: 'Foreign key constraint violation',
            details: updateError.message 
          }, { status: 400 })
        }
      }
      
      return NextResponse.json({ 
        error: 'Internal server error',
        details: updateError instanceof Error ? updateError.message : 'Unknown error'
      }, { status: 500 })
    }

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error('❌ ERROR in assignment close API:', error)
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Check for specific error types
      if (error.message.includes('prisma')) {
        console.error('Prisma error detected')
      }
      if (error.message.includes('JSON')) {
        console.error('JSON parsing error detected')
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
}
