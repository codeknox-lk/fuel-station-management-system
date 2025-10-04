import { NextRequest, NextResponse } from 'next/server'
import { 
  getAuditLogEntries, 
  getAuditLogEntriesByDateRange, 
  getAuditLogEntriesByUser, 
  getAuditLogEntriesByStation,
  getAuditLogEntriesByEntity,
  addAuditLogEntry,
  getRecentActivity,
  getActivityStats
} from '@/data/auditLog.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const stationId = searchParams.get('stationId')
    const entity = searchParams.get('entity')
    const recent = searchParams.get('recent')
    const stats = searchParams.get('stats')
    const limit = searchParams.get('limit')

    // Get activity stats
    if (stats === 'true') {
      return NextResponse.json(getActivityStats())
    }

    // Get recent activity
    if (recent === 'true') {
      const limitNum = limit ? parseInt(limit) : 10
      return NextResponse.json(getRecentActivity(limitNum, stationId || undefined))
    }

    // Filter by date range
    if (startDate && endDate) {
      return NextResponse.json(getAuditLogEntriesByDateRange(startDate, endDate))
    }

    // Filter by user
    if (userId) {
      return NextResponse.json(getAuditLogEntriesByUser(userId))
    }

    // Filter by station
    if (stationId) {
      return NextResponse.json(getAuditLogEntriesByStation(stationId))
    }

    // Filter by entity type
    if (entity) {
      return NextResponse.json(getAuditLogEntriesByEntity(entity))
    }

    // Get all entries with optional limit
    const entries = getAuditLogEntries()
    if (limit) {
      const limitNum = parseInt(limit)
      return NextResponse.json(entries.slice(0, limitNum))
    }

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.userId || !body.userName || !body.userRole || !body.action || !body.entity || !body.details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newEntry = addAuditLogEntry({
      userId: body.userId,
      userName: body.userName,
      userRole: body.userRole,
      action: body.action,
      entity: body.entity,
      entityId: body.entityId,
      details: body.details,
      ipAddress: body.ipAddress,
      stationId: body.stationId,
      stationName: body.stationName
    })

    return NextResponse.json(newEntry, { status: 201 })
  } catch (error) {
    console.error('Error creating audit log entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
