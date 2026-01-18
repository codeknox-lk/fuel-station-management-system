import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { pumpNumber, isActive } = body
    
    // Check if pump exists
    const existingPump = await prisma.pump.findUnique({
      where: { id }
    })

    if (!existingPump) {
      return NextResponse.json(
        { error: 'Pump not found' },
        { status: 404 }
      )
    }

    // Update pump
    const updatedPump = await prisma.pump.update({
      where: { id },
      data: {
        ...(pumpNumber !== undefined && { pumpNumber }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        nozzles: {
          select: {
            id: true,
            nozzleNumber: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json(updatedPump)
  } catch (error) {
    console.error('Error updating pump:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
      return NextResponse.json(
        { error: 'A pump with this number already exists at this station' },
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
    
    // Check if pump exists
    const pump = await prisma.pump.findUnique({
      where: { id },
      include: {
        nozzles: {
          select: {
            id: true
          }
        }
      }
    })

    if (!pump) {
      return NextResponse.json(
        { error: 'Pump not found' },
        { status: 404 }
      )
    }

    // Safety check: Can't delete if has nozzles assigned
    if (pump.nozzles.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete pump',
          details: `This pump has ${pump.nozzles.length} nozzle(s) assigned. Please remove the nozzles first.`
        },
        { status: 400 }
      )
    }

    // Delete pump
    await prisma.pump.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Pump deleted successfully',
      id 
    })
  } catch (error) {
    console.error('Error deleting pump:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

