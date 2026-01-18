import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch notifications with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const isRead = searchParams.get('isRead')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true'
    }
    if (type) {
      where.type = type
    }
    if (priority) {
      where.priority = priority
    }
    if (category) {
      where.category = category
    }

    // Check if notification model exists in Prisma client
    // Use try-catch instead of checking property existence for better error handling
    let notifications
    try {
      // Fetch notifications - try catch will handle if table doesn't exist
      notifications = await (prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Get counts
      const totalCount = await (prisma as any).notification.count({ where })
      const unreadCount = await (prisma as any).notification.count({ 
        where: { ...where, isRead: false } 
      })

      return NextResponse.json({
        notifications,
        pagination: {
          total: totalCount,
          unread: unreadCount,
          limit,
          offset
        }
      })
    } catch (prismaError) {
      // If model doesn't exist or table doesn't exist, return empty array
      const errorMsg = prismaError instanceof Error ? prismaError.message : 'Unknown error'
      if (
        errorMsg.includes('Unknown model') ||
        errorMsg.includes('Cannot read properties of undefined') ||
        errorMsg.includes('prisma.notification') ||
        errorMsg.includes('does not exist')
      ) {
        return NextResponse.json({
          notifications: [],
          pagination: {
            total: 0,
            unread: 0,
            limit,
            offset
          },
          error: 'Notifications table not available. Run migrations if needed.',
          migrationRequired: true
        })
      }
      // Re-throw to be caught by outer catch
      throw prismaError
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Check if it's a table doesn't exist error or model not found
    if (
      errorMessage.includes('does not exist') || 
      errorMessage.includes('Unknown model') ||
      errorMessage.includes('Cannot read properties of undefined') ||
      errorMessage.includes('prisma.notification') ||
      errorMessage.includes('P2001') || // Record does not exist
      errorMessage.includes('P2025') // Record to update not found
    ) {
      return NextResponse.json({
        notifications: [],
        pagination: {
          total: 0,
          unread: 0,
          limit: 100,
          offset: 0
        },
        error: 'Prisma client needs to be regenerated. Please restart your dev server.',
        migrationRequired: true,
        migrationCommand: 'Restart your Next.js dev server (it will auto-regenerate Prisma client)',
        details: 'The database migration was successful, but Prisma client needs to be regenerated. Restarting the dev server will fix this.'
      })
    }
    return NextResponse.json(
      { 
        error: 'Failed to fetch notifications',
        details: errorMessage,
        notifications: [],
        pagination: {
          total: 0,
          unread: 0,
          limit,
          offset
        }
      },
      { status: 500 }
    )
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

    const notification = await (prisma as any).notification.create({
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
