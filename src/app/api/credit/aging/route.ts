import { NextRequest, NextResponse } from 'next/server'
import { getCreditAging } from '@/data/credit.seed'

export async function GET(request: NextRequest) {
  try {
    const aging = getCreditAging()
    return NextResponse.json(aging)
  } catch (error) {
    console.error('Error fetching credit aging:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
