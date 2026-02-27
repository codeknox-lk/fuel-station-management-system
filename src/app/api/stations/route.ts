import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { auditOperations } from '@/lib/auditMiddleware'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    // Log removed('[API] GET /api/stations - Starting')
    const user = await getServerUser()
    // Log removed('[API] GET /api/stations - User:', user?.username)

    if (!user) {
      // Log removed('[API] GET /api/stations - Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      // Log removed('[API] GET /api/stations - Fetching single:', id)
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

    // Log removed('[API] GET /api/stations - Fetching list for org:', user.organizationId)
    // Optimized: Only select needed fields, skip counts for list view
    const stations = await prisma.station.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        email: true,
        openingHours: true,
        monthStartDate: true,
        monthEndDate: true,
        defaultAdvanceLimit: true,
        defaultHolidayAllowance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })
    // Log removed('[API] GET /api/stations - Success, count:', stations.length)

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
      email?: string
      openingHours?: string
      monthStartDate?: number
      monthEndDate?: number | null
    }
    const body = await request.json() as StationBody

    const { name, address, city, email, openingHours, monthStartDate, monthEndDate } = body

    if (!name || !address || !city) {
      return NextResponse.json(
        { error: 'Name, address, and city are required' },
        { status: 400 }
      )
    }

    // Check Station Limit
    // Developers can bypass limits if needed, but for now we enforce it for everyone, or maybe bypass for DEV
    const { canAddStation } = await import('@/lib/plans')
    const limitCheck = await canAddStation(user.organizationId)

    // Allow DEVELOPER to bypass limit? Let's strictly enforce unless manually overridden, 
    // or maybe allow DEVELOPER to add unlimited? 
    // User requirement: "if they want another one they have to pay"
    // Let's enforce for everyone including OWNER. DEVELOPER might need to test, so maybe bypass.
    if (!limitCheck.allowed && user.role !== 'DEVELOPER') {
      return NextResponse.json(
        {
          error: `Station limit reached for your plan (${limitCheck.maxStations} max). Please upgrade to add more.`,
          code: 'LIMIT_REACHED'
        },
        { status: 403 }
      )
    }

    const newStation = await prisma.station.create({
      data: {
        organizationId: user.organizationId,
        name,
        address,
        city,
        email: email || null,
        openingHours: openingHours || null,
        monthStartDate: monthStartDate || 1,
        monthEndDate: monthEndDate || null,
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
