import { NextRequest, NextResponse } from 'next/server'
import { getPosBatches, getPosBatchesByShiftId, getPosBatchesByTerminalId, getPosBatchById } from '@/data/pos.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')

    if (id) {
      const batch = getPosBatchById(id)
      if (!batch) {
        return NextResponse.json({ error: 'POS batch not found' }, { status: 404 })
      }
      return NextResponse.json(batch)
    }

    if (shiftId) {
      return NextResponse.json(getPosBatchesByShiftId(shiftId))
    }

    if (terminalId) {
      return NextResponse.json(getPosBatchesByTerminalId(terminalId))
    }

    return NextResponse.json(getPosBatches())
  } catch (error) {
    console.error('Error fetching POS batches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newBatch = {
      id: Date.now().toString(),
      ...body,
      isReconciled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newBatch, { status: 201 })
  } catch (error) {
    console.error('Error creating POS batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

