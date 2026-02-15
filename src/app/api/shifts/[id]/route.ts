import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { UpdateShiftSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
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

    // Fetch assignments separately
    let assignments: unknown[] = []
    try {
      assignments = await prisma.shiftAssignment.findMany({
        where: { shiftId: id, organizationId: user.organizationId },
        include: {
          nozzle: {
            include: {
              pump: {
                select: { pumpNumber: true }
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
    } catch (assignError) {
      console.error(`Error fetching assignments for shift ${id}:`, assignError)
      assignments = []
    }

    const shiftWithAssignments = {
      ...shift,
      assignments
    }

    return NextResponse.json(shiftWithAssignments)
  } catch (error) {
    console.error('Error fetching shift:', error)
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = UpdateShiftSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { startTime, templateId, openedBy } = result.data

    const shift = await prisma.shift.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot update a closed shift' }, { status: 400 })
    }

    if (startTime) {
      const now = new Date()
      if (startTime > now) {
        return NextResponse.json({ error: 'Start time cannot be in the future' }, { status: 400 })
      }
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      if (startTime < sevenDaysAgo) {
        return NextResponse.json({ error: 'Start time cannot be more than 7 days ago' }, { status: 400 })
      }
    }

    if (templateId) {
      const template = await prisma.shiftTemplate.findUnique({
        where: { id_organizationId: { id: templateId, organizationId: user.organizationId } }
      })
      if (!template) {
        return NextResponse.json({ error: 'Shift template not found' }, { status: 400 })
      }
    }

    const updateData: Prisma.ShiftUpdateInput = {}
    if (startTime) {
      updateData.startTime = startTime
    }
    if (templateId) {
      updateData.template = { connect: { id: templateId } }
    }
    if (openedBy) {
      updateData.openedBy = openedBy
    }

    const updatedShift = await prisma.shift.update({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Cannot delete a closed shift' }, { status: 400 })
    }

    const assignmentCount = await prisma.shiftAssignment.count({
      where: { shiftId: id, organizationId: user.organizationId }
    })

    if (assignmentCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete shift with assignments. Please remove all assignments first.'
      }, { status: 400 })
    }

    await prisma.shift.delete({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    return NextResponse.json({ message: 'Shift deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
