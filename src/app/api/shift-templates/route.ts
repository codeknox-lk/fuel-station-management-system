import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')
    const stationId = searchParams.get('stationId')

    if (id) {
      const template = await prisma.shiftTemplate.findFirst({
        where: {
          id,
          organizationId: user.organizationId
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

      if (!template) {
        return NextResponse.json({ error: 'Shift template not found or access denied' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    const where: Prisma.ShiftTemplateWhereInput = {
      organizationId: user.organizationId
    }
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify station exists and belongs to the same organization
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or access denied' },
        { status: 404 }
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
        isActive: status === 'active',
        organizationId: user.organizationId
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

