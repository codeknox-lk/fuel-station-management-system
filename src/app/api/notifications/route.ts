import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const stationId = searchParams.get('stationId')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    // Build where clause
    const where: Prisma.NotificationWhereInput = {}
    if (stationId) where.stationId = stationId
    if (isRead !== null && isRead !== undefined) where.isRead = isRead === 'true'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (type) where.type = type as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (priority) where.priority = priority as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (category) where.category = category as any

    // Simplified prisma access
    try {
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
    } catch (innerError) {
      const errorMsg = innerError instanceof Error ? innerError.message : String(innerError)
      if (errorMsg.includes('does not exist') || errorMsg.includes('Unknown model') || errorMsg.includes('prisma.notification')) {
        return NextResponse.json({
          notifications: [],
          pagination: { total: 0, unread: 0, limit, offset },
          error: 'Notifications table not available. Run migrations if needed.',
          migrationRequired: true
        })
      }
      throw innerError
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({
      error: 'Failed to fetch notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
      notifications: [],
      pagination: { total: 0, unread: 0, limit, offset }
    }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!title || !message || !type || !category) {
      return NextResponse.json(
        { error: 'Title, message, type, and category are required' },
        { status: 400 }
      )
    }

    // Check if notification model exists
    if (!('notification' in prisma)) {
      return NextResponse.json(
        { error: 'Prisma client needs to be regenerated. Please restart your dev server.' },
        { status: 500 }
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
        metadata: metadata || null
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
