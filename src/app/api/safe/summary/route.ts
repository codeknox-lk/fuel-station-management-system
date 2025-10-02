import { NextRequest, NextResponse } from 'next/server'
import { getSafeSummary } from '@/data/safeLedger.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId') || '1'
    const date = searchParams.get('date')

    const summary = getSafeSummary(stationId, date || undefined)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching safe summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
