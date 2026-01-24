import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')
    const stationId = searchParams.get('stationId')

    if (id) {
      const template = await prisma.shiftTemplate.findUnique({
        where: { id },
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!template) {
        return NextResponse.json({ error: 'Shift template not found' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    interface ShiftTemplateWhereInput {
      isActive?: boolean
      stationId?: string
    }
    const where: ShiftTemplateWhereInput = {}
    if (active === 'true') {
      where.isActive = true
    }
    if (stationId) {
      where.stationId = stationId
    }

    // Deduplicate by name, startTime, endTime, stationId (keep most recent)
    const templates = await prisma.shiftTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Deduplicate: keep the most recent entry for each unique combination
    const uniqueTemplates = templates.reduce((acc: typeof templates, template) => {
      const key = `${template.name}-${template.startTime}-${template.endTime}-${template.stationId}`
      if (!acc.find(t => `${t.name}-${t.startTime}-${t.endTime}-${t.stationId}` === key)) {
        acc.push(template)
      }
      return acc
    }, [])

    return NextResponse.json(uniqueTemplates)
  } catch (error) {
    console.error('Error fetching shift templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface ShiftTemplateBody {
      stationId?: string
      name?: string
      startTime?: string
      endTime?: string
      breakDuration?: number
      breakStartTime?: string
      description?: string
      icon?: string
      status?: string
    }
    const body = await request.json() as ShiftTemplateBody

    const { stationId, name, startTime, endTime, breakDuration, breakStartTime, description, icon, status } = body

    if (!stationId || !name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Station ID, name, start time, and end time are required' },
        { status: 400 }
      )
    }

    const newTemplate = await prisma.shiftTemplate.create({
      data: {
        stationId,
        name,
        startTime,
        endTime,
        breakDuration: breakDuration || 0,
        breakStartTime: breakStartTime || null,
        description: description || null,
        icon: icon || 'sun',
        isActive: status === 'active'
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(newTemplate, { status: 201 })
  } catch (error) {
    console.error('Error creating shift template:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

