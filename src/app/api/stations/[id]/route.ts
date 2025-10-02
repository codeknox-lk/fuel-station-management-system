import { NextRequest, NextResponse } from 'next/server'
import { stations } from '@/data/stations.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const stationIndex = stations.findIndex(s => s.id === id)
    if (stationIndex === -1) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    const oldStation = stations[stationIndex]
    stations[stationIndex] = {
      ...stations[stationIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    // Log the station update
    const changes = Object.keys(body).join(', ')
    await auditOperations.stationUpdated(request, id, stations[stationIndex].name, changes)

    return NextResponse.json(stations[stationIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const stationIndex = stations.findIndex(s => s.id === id)
    if (stationIndex === -1) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    const station = stations[stationIndex]
    
    // Log the station deletion
    await auditOperations.stationDeleted(request, id, station.name)
    
    stations.splice(stationIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 })
  }
}
