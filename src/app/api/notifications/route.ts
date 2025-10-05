import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock notifications - in real app this would fetch from database
    const notifications = [
      {
        id: '1',
        title: 'Low Fuel Stock Alert',
        message: 'Petrol 92 stock is below 20% capacity',
        type: 'warning' as const,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        stationId: '1'
      },
      {
        id: '2',
        title: 'Shift Completed',
        message: 'Morning shift completed successfully',
        type: 'info' as const,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        stationId: '1'
      }
    ]

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

