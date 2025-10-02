import { NextRequest, NextResponse } from 'next/server'
import { getShifts, getShiftsByStationId, getActiveShifts, getShiftById } from '@/data/shifts.seed'
import { getStationById } from '@/data/stations.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const shift = getShiftById(id)
      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }
      return NextResponse.json(shift)
    }

    if (active === 'true') {
      return NextResponse.json(getActiveShifts())
    }

    if (stationId) {
      return NextResponse.json(getShiftsByStationId(stationId))
    }

    return NextResponse.json(getShifts())
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newShift = {
      id: Date.now().toString(),
      ...body,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Get station info for audit logging
    const station = getStationById(body.stationId)
    if (station) {
      await auditOperations.shiftOpened(request, newShift.id, station.id, station.name)
    }

    return NextResponse.json(newShift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
