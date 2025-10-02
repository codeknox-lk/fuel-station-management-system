import { NextRequest, NextResponse } from 'next/server'
import { getTankDips, getTankDipsByTankId, getTankDipsByDateRange, getTankDipById } from '@/data/tankOps.seed'
import { getTankById } from '@/data/tanks.seed'
import { getStationById } from '@/data/stations.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')

    if (id) {
      const dip = getTankDipById(id)
      if (!dip) {
        return NextResponse.json({ error: 'Tank dip not found' }, { status: 404 })
      }
      return NextResponse.json(dip)
    }

    if (tankId) {
      return NextResponse.json(getTankDipsByTankId(tankId))
    }

    if (startDate && endDate) {
      return NextResponse.json(getTankDipsByDateRange(startDate, endDate))
    }

    return NextResponse.json(getTankDips())
  } catch (error) {
    console.error('Error fetching tank dips:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newDip = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Get tank and station info for audit logging
    const tank = getTankById(body.tankId)
    if (tank) {
      const station = getStationById(tank.stationId)
      if (station) {
        await auditOperations.tankDipRecorded(request, body.tankId, body.dipLitres, station.id, station.name)
      }
    }

    return NextResponse.json(newDip, { status: 201 })
  } catch (error) {
    console.error('Error creating tank dip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
