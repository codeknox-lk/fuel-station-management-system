import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stationId = searchParams.get('stationId')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    // Build where clause
    const where: Prisma.NotificationWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) where.stationId = stationId
    if (isRead !== null && isRead !== undefined) where.isRead = isRead === 'true'
    if (type) where.type = type as any
    if (priority) where.priority = priority as any
    if (category) where.category = category as any

    const notificationsList = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        station: {
          select: { id: true, name: true }
        }
      }
    })

    const totalCount = await prisma.notification.count({ where })
    const unreadCount = await prisma.notification.count({
      where: { ...where, isRead: false }
    })

    return NextResponse.json({
      notifications: notificationsList,
      pagination: {
        total: totalCount,
        unread: unreadCount,
        limit,
        offset
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      notifications: [],
      pagination: { total: 0, unread: 0, limit, offset }
    }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      stationId,
      title,
      message,
      type,
      priority = 'MEDIUM',
      category,
      actionUrl,
      metadata
    } = body

    if (!title || !message || !type || !category) {
      return NextResponse.json(
        { error: 'Title, message, type, and category are required' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        stationId: stationId || null,
        title,
        message,
        type,
        priority,
        category,
        actionUrl: actionUrl || null,
        metadata: metadata || null,
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

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}
