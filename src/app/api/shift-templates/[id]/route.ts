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

    console.log('=== UPDATE SHIFT TEMPLATE ===')
    console.log('ID:', id)
    console.log('Body:', JSON.stringify(body, null, 2))

    const template = await prisma.shiftTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      console.log('Template not found')
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    const { name, startTime, endTime, breakDuration, breakStartTime, description, icon, status } = body

    const updateData = {
      ...(name && { name }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(breakDuration !== undefined && { breakDuration }),
      ...(breakStartTime !== undefined && { breakStartTime: breakStartTime || null }),
      ...(description !== undefined && { description: description || null }),
      ...(icon !== undefined && { icon: icon || 'sun' }),
      ...(status !== undefined && { isActive: status === 'active' })
    }

    console.log('Update data:', JSON.stringify(updateData, null, 2))

    const updatedTemplate = await prisma.shiftTemplate.update({
      where: { id },
      data: updateData,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('Updated successfully:', updatedTemplate)
    console.log('============================')
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

    console.log('=== DELETE SHIFT TEMPLATE ===')
    console.log('ID:', id)

    const template = await prisma.shiftTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      console.log('Template not found')
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    // Check for shifts using this template
    const shiftsCount = await prisma.shift.count({
      where: { templateId: id }
    })

    console.log('Shifts using this template:', shiftsCount)

    if (shiftsCount > 0) {
      console.log('Cannot delete - has shifts')
      return NextResponse.json({
        error: `Cannot delete shift template with ${shiftsCount} existing shift(s). Please remove all shifts first.`
      }, { status: 400 })
    }

    await prisma.shiftTemplate.delete({
      where: { id }
    })

    console.log('Deleted successfully')
    console.log('============================')
    return NextResponse.json({ success: true, message: 'Shift template deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift template:', error)
    return NextResponse.json({ error: 'Failed to delete shift template' }, { status: 500 })
  }
}

