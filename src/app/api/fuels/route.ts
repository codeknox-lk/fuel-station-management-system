import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'


// GET /api/fuels - Get all fuel types for the user's organization
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fuels = await prisma.fuel.findMany({
      where: {
        organizationId: user.organizationId
      },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, category, description, icon } = body

    // Validate required fields
    if (!code || !name || !category) {
      return NextResponse.json(
        { error: 'Code, name, and category are required' },
        { status: 400 }
      )
    }

    const fuelCode = code.toUpperCase().replace(/\s+/g, '_')
    const existing = await prisma.fuel.findUnique({
      where: {
        code_organizationId: {
          code: fuelCode,
          organizationId: user.organizationId
        }
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A fuel type with this code already exists' },
        { status: 400 }
      )
    }

    // Get the highest sort order within the organization
    const maxSortOrder = await prisma.fuel.aggregate({
      where: {
        organizationId: user.organizationId
      },
      _max: {
        sortOrder: true,
      },
    })

    const fuel = await prisma.fuel.create({
      data: {
        organizationId: user.organizationId,
        code: code.toUpperCase().replace(/\s+/g, '_'),
        name,
        category,
        description,
        icon: icon || 'fuel',
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
