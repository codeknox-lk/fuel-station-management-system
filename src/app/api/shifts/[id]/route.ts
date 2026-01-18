import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Fetch shift - split into two queries to avoid complex nested includes
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            city: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        _count: {
          select: {
            assignments: true
          }
        }
      }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    // Fetch assignments separately with their relations
    let assignments: any[] = []
    try {
      assignments = await prisma.shiftAssignment.findMany({
        where: { shiftId: id },
        include: {
          nozzle: {
            include: {
              pump: {
                include: {
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
          }
        }
      })
    } catch (assignError) {
      console.error(`Error fetching assignments for shift ${id}:`, assignError)
      // Continue with empty assignments array
      assignments = []
    }
    
    // Combine shift data with assignments
    const shiftWithAssignments = {
      ...shift,
      assignments
    }
    
    return NextResponse.json(shiftWithAssignments)
  } catch (error) {
    console.error('Error fetching shift:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const shift = await prisma.shift.findUnique({
      where: { id }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot update a closed shift' }, { status: 400 })
    }
    
    // Validate start time if provided
    if (body.startTime) {
      const newStartTime = new Date(body.startTime)
      const now = new Date()
      
      if (newStartTime > now) {
        return NextResponse.json({ error: 'Start time cannot be in the future' }, { status: 400 })
      }
      
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      if (newStartTime < sevenDaysAgo) {
        return NextResponse.json({ error: 'Start time cannot be more than 7 days ago' }, { status: 400 })
      }
    }
    
    // Validate template if provided
    if (body.templateId) {
      const template = await prisma.shiftTemplate.findUnique({
        where: { id: body.templateId }
      })
      if (!template) {
        return NextResponse.json({ error: 'Shift template not found' }, { status: 400 })
      }
    }
    
    // Build update data
    const updateData: any = {}
    if (body.startTime) {
      updateData.startTime = new Date(body.startTime)
    }
    if (body.templateId) {
      updateData.templateId = body.templateId
    }
    if (body.openedBy) {
      updateData.openedBy = body.openedBy
    }
    
    // Update shift
    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    return NextResponse.json(updatedShift)
  } catch (error) {
    console.error('Error updating shift:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shift = await prisma.shift.findUnique({
      where: { id }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot delete a closed shift' }, { status: 400 })
    }
    
    // Check for assignments
    const assignmentCount = await prisma.shiftAssignment.count({
      where: { shiftId: id }
    })
    
    if (assignmentCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete shift with assignments. Please remove all assignments first.' 
      }, { status: 400 })
    }
    
    // Delete shift
    await prisma.shift.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Shift deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
