import { NextRequest, NextResponse } from 'next/server'
import { getTanks, getTanksByStationId, getTankById, getPumps, getPumpsByStationId, getNozzles, getNozzlesByPumpId } from '@/data/tanks.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const type = searchParams.get('type') // tanks, pumps, nozzles

    if (id) {
      const tank = getTankById(id)
      if (!tank) {
        return NextResponse.json({ error: 'Tank not found' }, { status: 404 })
      }
      return NextResponse.json(tank)
    }

    if (type === 'pumps') {
      if (stationId) {
        return NextResponse.json(getPumpsByStationId(stationId))
      }
      return NextResponse.json(getPumps())
    }

    if (type === 'nozzles') {
      const pumpId = searchParams.get('pumpId')
      if (pumpId) {
        return NextResponse.json(getNozzlesByPumpId(pumpId))
      }
      return NextResponse.json(getNozzles())
    }

    if (stationId) {
      const tanks = getTanksByStationId(stationId)
      // Filter out oil tanks for dipping operations
      if (type === 'tanks') {
        const dippableTanks = tanks.filter(tank => tank.fuelType !== 'OIL')
        return NextResponse.json(dippableTanks)
      }
      return NextResponse.json(tanks)
    }

    const allTanks = getTanks()
    // Filter out oil tanks for dipping operations
    if (type === 'tanks') {
      const dippableTanks = allTanks.filter(tank => tank.fuelType !== 'OIL')
      return NextResponse.json(dippableTanks)
    }
    return NextResponse.json(allTanks)
  } catch (error) {
    console.error('Error fetching tanks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
