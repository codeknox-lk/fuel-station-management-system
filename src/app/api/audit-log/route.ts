import { NextRequest, NextResponse } from 'next/server'
import { createAuditLogManual } from '@/lib/audit'
import { AuditAction } from '@/lib/audit'

import { getServerUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            action,
            entity,
            entityId,
            details,
            stationId,
            stationName
        } = body

        // Validate required fields
        if (!action || !entity || !details) {
            return NextResponse.json(
                { error: 'Missing required audit log fields' },
                { status: 400 }
            )
        }

        // Create the audit log entry
        await createAuditLogManual(
            {
                action: action as AuditAction,
                entity,
                entityId,
                details,
                stationId,
                stationName
            },
            user.userId,
            user.username,
            user.role,
            user.organizationId
        )

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (error) {
        console.error('API Audit Log Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
