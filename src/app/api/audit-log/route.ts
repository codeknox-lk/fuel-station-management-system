import { NextRequest, NextResponse } from 'next/server'
import { createAuditLogManual } from '@/lib/audit'
import { AuditAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            userId,
            userName,
            userRole,
            action,
            entity,
            entityId,
            details,
            stationId,
            stationName
        } = body

        // Validate required fields
        if (!userId || !userName || !action || !entity || !details) {
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
            userId,
            userName,
            userRole
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
