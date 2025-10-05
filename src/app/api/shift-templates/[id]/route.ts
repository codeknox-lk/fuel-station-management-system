import { NextRequest, NextResponse } from 'next/server'
import { shiftTemplates } from '@/data/shiftTemplates.seed'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const templateIndex = shiftTemplates.findIndex(t => t.id === id)
    if (templateIndex === -1) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    shiftTemplates[templateIndex] = {
      ...shiftTemplates[templateIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(shiftTemplates[templateIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update shift template' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const templateIndex = shiftTemplates.findIndex(t => t.id === id)
    if (templateIndex === -1) {
      return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
    }

    shiftTemplates.splice(templateIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete shift template' }, { status: 500 })
  }
}

