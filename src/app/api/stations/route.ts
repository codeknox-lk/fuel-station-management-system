import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const station = await prisma.station.findUnique({
        where: { id },
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

    const where = active === 'true' ? { isActive: true } : {}
    const stations = await prisma.station.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            tanks: true,
            shifts: true
          }
        }
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
    const body = await request.json()
    
    const { name, address, city } = body
    
    if (!name || !address || !city) {
      return NextResponse.json(
        { error: 'Name, address, and city are required' },
        { status: 400 }
      )
    }

    const newStation = await prisma.station.create({
      data: {
        name,
        address,
        city,
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
