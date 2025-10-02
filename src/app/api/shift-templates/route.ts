import { NextRequest, NextResponse } from 'next/server'
import { getShiftTemplates, getActiveShiftTemplates, getShiftTemplateById } from '@/data/shiftTemplates.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const template = getShiftTemplateById(id)
      if (!template) {
        return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    if (active === 'true') {
      return NextResponse.json(getActiveShiftTemplates())
    }

    return NextResponse.json(getShiftTemplates())
  } catch (error) {
    console.error('Error fetching shift templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newTemplate = {
      id: Date.now().toString(),
      ...body,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    console.error('Error creating shift template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
