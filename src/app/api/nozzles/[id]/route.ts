import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { pumpId, tankId, nozzleNumber, isActive } = body
    
    // Check if nozzle exists
    const existingNozzle = await prisma.nozzle.findUnique({
      where: { id },
      include: {
        pump: {
          select: {
            id: true,
            stationId: true
          }
        }
      }
    })

    if (!existingNozzle) {
      return NextResponse.json(
        { error: 'Nozzle not found' },
        { status: 404 }
      )
    }

    // If tank is being changed, verify it's at same station as pump
    if (tankId && tankId !== existingNozzle.tankId) {
      const tank = await prisma.tank.findUnique({
        where: { id: tankId }
      })

      if (!tank) {
        return NextResponse.json(
          { error: 'Tank not found' },
          { status: 404 }
        )
      }

      if (tank.stationId !== existingNozzle.pump.stationId) {
        return NextResponse.json(
          { error: 'Tank must be at the same station as the pump' },
          { status: 400 }
        )
      }
    }

    // Update nozzle
    const updatedNozzle = await prisma.nozzle.update({
      where: { id },
      data: {
        ...(pumpId !== undefined && { pumpId }),
        ...(tankId !== undefined && { tankId }),
        ...(nozzleNumber !== undefined && { nozzleNumber }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        pump: {
          select: {
            id: true,
            pumpNumber: true,
            station: {
              select: {
                id: true,
                name: true
              }
            }
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
    })

    return NextResponse.json(updatedNozzle)
  } catch (error) {
    console.error('Error updating nozzle:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
      return NextResponse.json(
        { error: 'A nozzle with this number already exists on this pump' },
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
    
    // Check if nozzle exists
    const nozzle = await prisma.nozzle.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true
          }
        }
      }
    })

    if (!nozzle) {
      return NextResponse.json(
        { error: 'Nozzle not found' },
        { status: 404 }
      )
    }

    // Safety check: Can't delete if has active shift assignments
    if (nozzle.assignments.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete nozzle',
          details: `This nozzle has ${nozzle.assignments.length} active shift assignment(s). Please close the shifts first.`
        },
        { status: 400 }
      )
    }

    // Delete nozzle
    await prisma.nozzle.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Nozzle deleted successfully',
      id 
    })
  } catch (error) {
    console.error('Error deleting nozzle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



