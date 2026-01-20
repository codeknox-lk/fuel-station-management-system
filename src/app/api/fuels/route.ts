import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/fuels - Get all fuel types
export async function GET(request: NextRequest) {
  try {
    const fuels = await prisma.fuel.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            tanks: true,
            prices: true,
          },
        },
      },
    })

    return NextResponse.json(fuels)
  } catch (error) {
    console.error('Error fetching fuel types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fuel types' },
      { status: 500 }
    )
  }
}

// POST /api/fuels - Create a new fuel type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, category, description, icon } = body

    // Validate required fields
    if (!code || !name || !category) {
      return NextResponse.json(
        { error: 'Code, name, and category are required' },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existing = await prisma.fuel.findUnique({
      where: { code: code.toUpperCase().replace(/\s+/g, '_') },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A fuel type with this code already exists' },
        { status: 400 }
      )
    }

    // Get the highest sort order
    const maxSortOrder = await prisma.fuel.aggregate({
      _max: {
        sortOrder: true,
      },
    })

    const fuel = await prisma.fuel.create({
      data: {
        code: code.toUpperCase().replace(/\s+/g, '_'),
        name,
        category,
        description,
        icon: icon || '⛽',
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json(fuel, { status: 201 })
  } catch (error) {
    console.error('Error creating fuel type:', error)
    return NextResponse.json(
      { error: 'Failed to create fuel type' },
      { status: 500 }
    )
  }
}
