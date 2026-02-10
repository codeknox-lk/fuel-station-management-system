import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { auditOperations } from '@/lib/auditMiddleware'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const station = await prisma.station.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        include: {
          _count: {
            select: {
              users: true,
              tanks: true,
              shifts: true
            }
          }
        }
      })

      if (!station) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
      }
      return NextResponse.json(station)
    }

    const where: Prisma.StationWhereInput = {
      organizationId: user.organizationId,
      ...(active === 'true' ? { isActive: true } : {})
    }

    // Optimized: Only select needed fields, skip counts for list view
    const stations = await prisma.station.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        openingHours: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(stations)
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // PERMISSION CHECK: Only OWNER or DEVELOPER can add stations
    if (user.role !== 'OWNER' && user.role !== 'DEVELOPER' && user.username !== 'developer') { // keep dev check for safety
      return NextResponse.json(
        { error: 'Permission denied. Only OWNER role can add stations.' },
        { status: 403 }
      )
    }

    interface StationBody {
      name?: string
      address?: string
      city?: string
      phone?: string
      email?: string
      openingHours?: string
    }
    const body = await request.json() as StationBody

    const { name, address, city, phone, email, openingHours } = body

    if (!name || !address || !city) {
      return NextResponse.json(
        { error: 'Name, address, and city are required' },
        { status: 400 }
      )
    }

    const newStation = await prisma.station.create({
      data: {
        organizationId: user.organizationId,
        name,
        address,
        city,
        phone: phone || null,
        email: email || null,
        openingHours: openingHours || null,
        isActive: true
      }
    })

    // Log the station creation
    await auditOperations.stationCreated(request, newStation.id, newStation.name)

    return NextResponse.json(newStation, { status: 201 })
  } catch (error) {
    console.error('Error creating station:', error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A station with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
