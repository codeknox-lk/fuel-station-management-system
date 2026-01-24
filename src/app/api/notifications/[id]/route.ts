import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH - Update notification (mark as read/unread, update fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isRead, ...otherFields } = body

    interface NotificationUpdateInput {
      isRead?: boolean
      readAt?: Date | null
      [key: string]: unknown
    }

    const updateData: NotificationUpdateInput = { ...otherFields }
    if (isRead !== undefined) {
      updateData.isRead = isRead
      if (isRead) {
        updateData.readAt = new Date()
      } else {
        updateData.readAt = null
      }
    }

    // Check if notification model exists
    if (!('notification' in prisma)) {
      return NextResponse.json(
        { error: 'Prisma client needs to be regenerated. Please restart your dev server.' },
        { status: 500 }
      )
    }

    interface PrismaWithNotification {
      notification: {
        update: (args: unknown) => Promise<unknown>
        delete: (args: unknown) => Promise<unknown>
      }
    }

    const notification = await (prisma as unknown as PrismaWithNotification).notification.update({
      where: { id },
      data: updateData,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if notification model exists
    if (!('notification' in prisma)) {
      return NextResponse.json(
        { error: 'Prisma client needs to be regenerated. Please restart your dev server.' },
        { status: 500 }
      )
    }

    interface PrismaWithNotification {
      notification: {
        update: (args: unknown) => Promise<unknown>
        delete: (args: unknown) => Promise<unknown>
      }
    }

    await (prisma as unknown as PrismaWithNotification).notification.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}

