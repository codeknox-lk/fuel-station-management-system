import { NextRequest, NextResponse } from 'next/server'
import { getStations, getStationById, getActiveStations } from '@/data/stations.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const station = getStationById(id)
      if (!station) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
      }
      return NextResponse.json(station)
    }

    if (active === 'true') {
      return NextResponse.json(getActiveStations())
    }

    return NextResponse.json(getStations())
  } catch (error) {
    console.error('Error fetching stations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newStation = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Log the station creation
    await auditOperations.stationCreated(request, newStation.id, newStation.name)

    return NextResponse.json(newStation, { status: 201 })
  } catch (error) {
    console.error('Error creating station:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
