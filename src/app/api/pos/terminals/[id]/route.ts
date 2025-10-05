import { NextRequest, NextResponse } from 'next/server'
import { posTerminals } from '@/data/pos.seed'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const terminalIndex = posTerminals.findIndex(t => t.id === id)
    if (terminalIndex === -1) {
      return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
    }

    posTerminals[terminalIndex] = {
      ...posTerminals[terminalIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(posTerminals[terminalIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update POS terminal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const terminalIndex = posTerminals.findIndex(t => t.id === id)
    if (terminalIndex === -1) {
      return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
    }

    posTerminals.splice(terminalIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete POS terminal' }, { status: 500 })
  }
}

