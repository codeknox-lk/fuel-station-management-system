import { NextRequest, NextResponse } from 'next/server'
import { getPosTerminals, getPosTerminalsByStationId, getPosTerminalById } from '@/data/pos.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const terminal = getPosTerminalById(id)
      if (!terminal) {
        return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
      }
      return NextResponse.json(terminal)
    }

    if (stationId) {
      return NextResponse.json(getPosTerminalsByStationId(stationId))
    }

    return NextResponse.json(getPosTerminals())
  } catch (error) {
    console.error('Error fetching POS terminals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

