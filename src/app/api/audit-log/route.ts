import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')

    // Get activity stats
    if (stats === 'true') {
      const totalEntries = await prisma.auditLog.count()
      const todayEntries = await prisma.auditLog.count({
        where: {
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
      
      const actionsCount = await prisma.auditLog.groupBy({
        by: ['action'],
        _count: true
      })
      
      const entitiesCount = await prisma.auditLog.groupBy({
        by: ['entity'],
        _count: true
      })

      return NextResponse.json({
        total: totalEntries,
        today: todayEntries,
        actions: actionsCount.map(a => ({ action: a.action, count: a._count })),
        entities: entitiesCount.map(e => ({ entity: e.entity, count: e._count }))
      })
    }

    // Build where clause
    const where: any = {}
    
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (stationId) {
      where.stationId = stationId
    }
    
    if (entity) {
      where.entity = entity
    }
    
    if (action) {
      where.action = action
    }

    // Get recent activity
    if (recent === 'true') {
      const entries = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      })
      return NextResponse.json(entries)
    }

    // Get all entries with filters
    const entries = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { userId, userName, userRole, action, entity, entityId, details, ipAddress, stationId, stationName } = body
    
    // Validate required fields
    if (!userId || !userName || !userRole || !action || !entity || !details) {
      console.error('Missing required fields for audit log:', { userId, userName, userRole, action, entity, details })
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: { missing: !userId ? 'userId' : !userName ? 'userName' : !userRole ? 'userRole' : !action ? 'action' : !entity ? 'entity' : 'details' }
      }, { status: 400 })
    }

    // Check if user exists in database, if not use a generic system user
    let validUserId = userId
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!user) {
        // If user doesn't exist, try to find by username
        const userByUsername = await prisma.user.findFirst({
          where: { username: userName }
        })
        
        if (userByUsername) {
          validUserId = userByUsername.id
        } else {
          // If user still doesn't exist, log with userId as string (will fail FK constraint)
          // We'll handle this by making userId nullable or using a system user
          console.warn(`User not found for audit log: userId=${userId}, userName=${userName}`)
          // Continue with the original userId - Prisma will handle the FK constraint
        }
      }
    } catch (userCheckError) {
      console.error('Error checking user for audit log:', userCheckError)
      // Continue anyway - let Prisma handle the FK constraint
    }

    try {
      const newEntry = await prisma.auditLog.create({
        data: {
          userId: validUserId,
          userName,
          userRole,
          action,
          entity,
          entityId: entityId || null,
          details,
          ipAddress: ipAddress || null,
          stationId: stationId || null,
          stationName: stationName || null,
          timestamp: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true
            }
          }
        }
      })

      return NextResponse.json(newEntry, { status: 201 })
    } catch (createError) {
      console.error('Error creating audit log entry:', createError)
      
      // Handle foreign key constraint violations
      if (createError instanceof Error && (
        createError.message.includes('Foreign key constraint') || 
        createError.message.includes('Unique constraint') ||
        createError.message.includes('violates foreign key')
      )) {
        // Try creating without userId (if schema allows) or with a system user
        try {
          // First, try to get or create a system user
          const systemUser = await prisma.user.findFirst({
            where: { username: 'system' }
          }) || await prisma.user.findFirst({
            where: { role: 'OWNER' }
          })
          
          if (systemUser) {
            const newEntry = await prisma.auditLog.create({
              data: {
                userId: systemUser.id,
                userName,
                userRole,
                action,
                entity,
                entityId: entityId || null,
                details,
                ipAddress: ipAddress || null,
                stationId: stationId || null,
                stationName: stationName || null,
                timestamp: new Date()
              }
            })
            return NextResponse.json(newEntry, { status: 201 })
          }
        } catch (fallbackError) {
          console.error('Fallback audit log creation failed:', fallbackError)
        }
        
        return NextResponse.json(
          { error: 'Invalid user ID', details: createError.message },
          { status: 400 }
        )
      }
      
      throw createError
    }
  } catch (error) {
    console.error('Error in audit log POST:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
