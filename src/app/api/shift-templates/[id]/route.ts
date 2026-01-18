import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const template = await prisma.shiftTemplate.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            shifts: true
          }
        }
      }
    })
    
    if (!template) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching shift template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const template = await prisma.shiftTemplate.findUnique({
      where: { id }
    })
    
    if (!template) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    const { name, startTime, endTime, isActive } = body
    
    const updatedTemplate = await prisma.shiftTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Error updating shift template:', error)
    return NextResponse.json({ error: 'Failed to update shift template' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const template = await prisma.shiftTemplate.findUnique({
      where: { id }
    })
    
    if (!template) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    // Check for shifts using this template
    const hasShifts = await prisma.shift.count({
      where: { templateId: id }
    }) > 0
    
    if (hasShifts) {
      return NextResponse.json({ 
        error: 'Cannot delete shift template with existing shifts. Please remove all shifts first.' 
      }, { status: 400 })
    }

    await prisma.shiftTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Shift template deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift template:', error)
    return NextResponse.json({ error: 'Failed to delete shift template' }, { status: 500 })
  }
}

