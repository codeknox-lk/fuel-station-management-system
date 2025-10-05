import { NextRequest, NextResponse } from 'next/server'
import { getAllPumpers } from '@/data/pumpers.seed'

// Get the pumpers array directly for modification
const pumpers = getAllPumpers()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const pumperIndex = pumpers.findIndex(p => p.id === id)
    if (pumperIndex === -1) {
      return NextResponse.json({ error: 'Pumper not found' }, { status: 404 })
    }

    pumpers[pumperIndex] = {
      ...pumpers[pumperIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(pumpers[pumperIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update pumper' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const pumperIndex = pumpers.findIndex(p => p.id === id)
    if (pumperIndex === -1) {
      return NextResponse.json({ error: 'Pumper not found' }, { status: 404 })
    }

    pumpers.splice(pumperIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete pumper' }, { status: 500 })
  }
}

