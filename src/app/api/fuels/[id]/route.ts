import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/fuels/[id] - Get a specific fuel type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fuel = await prisma.fuel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tanks: true,
            prices: true,
          },
        },
      },
    })

    if (!fuel) {
      return NextResponse.json({ error: 'Fuel type not found' }, { status: 404 })
    }

    return NextResponse.json(fuel)
  } catch (error) {
    console.error('Error fetching fuel type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel type' },
      { status: 500 }
    )
  }
}

// PUT /api/fuels/[id] - Update a fuel type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, category, description, icon, isActive } = body

    const fuel = await prisma.fuel.update({
      where: { id: params.id },
      data: {
        name,
        category,
        description,
        icon,
        isActive,
      },
    })

    return NextResponse.json(fuel)
  } catch (error) {
    console.error('Error updating fuel type:', error)
    return NextResponse.json(
      { error: 'Failed to update fuel type' },
      { status: 500 }
    )
  }
}

// DELETE /api/fuels/[id] - Delete a fuel type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if fuel type is being used
    const fuel = await prisma.fuel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tanks: true,
            prices: true,
          },
        },
      },
    })

    if (!fuel) {
      return NextResponse.json({ error: 'Fuel type not found' }, { status: 404 })
    }

    if (fuel._count.tanks > 0 || fuel._count.prices > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete fuel type. It is being used by ${fuel._count.tanks} tank(s) and has ${fuel._count.prices} price record(s)`,
        },
        { status: 400 }
      )
    }

    await prisma.fuel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Fuel type deleted successfully' })
  } catch (error) {
    console.error('Error deleting fuel type:', error)
    return NextResponse.json(
      { error: 'Failed to delete fuel type' },
      { status: 500 }
    )
  }
}
