import { NextRequest, NextResponse } from 'next/server'
import { getAllPumpers, getPumpersByStation, getActivePumpersByStation, getPumpersByShift, addPumper } from '@/data/pumpers.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const activeOnly = searchParams.get('active') === 'true'
    const shift = searchParams.get('shift')

    let pumpers = getAllPumpers()

    // Filter by station if provided
    if (stationId) {
      if (activeOnly) {
        pumpers = getActivePumpersByStation(stationId)
      } else {
        pumpers = getPumpersByStation(stationId)
      }
    }

    // Further filter by shift if provided
    if (shift && stationId) {
      pumpers = getPumpersByShift(stationId, shift)
    }

    return NextResponse.json(pumpers)
  } catch (error) {
    console.error('Error fetching pumpers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newPumper = addPumper(body)
    return NextResponse.json(newPumper, { status: 201 })
  } catch (error) {
    console.error('Error creating pumper:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
