import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UpdateTankSchema } from '@/lib/schemas'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Zod Validation
    const result = UpdateTankSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { capacity, currentLevel, isActive, tankNumber } = result.data

    // Check if tank exists
    const existingTank = await prisma.tank.findUnique({
      where: { id }
    })

    if (!existingTank) {
      return NextResponse.json(
        { error: 'Tank not found' },
        { status: 404 }
      )
    }

    // Check uniqueness of tankNumber if provided
    if (tankNumber) {
      const duplicateTank = await prisma.tank.findFirst({
        where: {
          tankNumber,
          stationId: existingTank.stationId,
          id: { not: id } // Exclude current tank
        }
      })

      if (duplicateTank) {
        return NextResponse.json(
          { error: 'Tank number already exists at this station' },
          { status: 400 }
        )
      }
    }

    // Validate capacity if provided
    if (capacity !== undefined) {
      if (capacity <= 0) {
        return NextResponse.json(
          { error: 'Capacity must be greater than 0' },
          { status: 400 }
        )
      }
    }

    // Validate currentLevel if provided
    if (currentLevel !== undefined) {
      const finalCapacity = capacity || existingTank.capacity
      if (currentLevel < 0 || currentLevel > finalCapacity) {
        return NextResponse.json(
          { error: 'Current level must be between 0 and capacity' },
          { status: 400 }
        )
      }
    }

    // Update tank
    const updatedTank = await prisma.tank.update({
      where: { id },
      data: {
        ...(capacity !== undefined && { capacity }),
        ...(currentLevel !== undefined && { currentLevel }),
        ...(isActive !== undefined && { isActive }),
        ...(tankNumber !== undefined && { tankNumber })
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

    return NextResponse.json(updatedTank)
  } catch (error) {
    console.error('Error updating tank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if tank exists
    const tank = await prisma.tank.findUnique({
      where: { id },
      include: {
        nozzles: {
          select: {
            id: true
          }
        }
      }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found' },
        { status: 404 }
      )
    }

    // Safety check: Can't delete if has nozzles assigned
    if (tank.nozzles.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete tank',
          details: `This tank has ${tank.nozzles.length} nozzle(s) assigned. Please remove or reassign the nozzles first.`
        },
        { status: 400 }
      )
    }

    // Delete tank
    await prisma.tank.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Tank deleted successfully',
      id
    })
  } catch (error) {
    console.error('Error deleting tank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



