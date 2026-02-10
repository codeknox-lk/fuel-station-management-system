import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '@/lib/jwt'

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'OPEN'
    | 'CLOSE'
    | 'APPROVE'
    | 'REJECT'
    | 'VIEW'

interface AuditLogParams {
    action: AuditAction
    entity: string
    entityId?: string
    details: string
    stationId?: string
    stationName?: string
    request?: NextRequest
}

interface UserInfo {
    userId: string
    userName: string
    userRole: string
    organizationId: string
}

/**
 * Extract user information from JWT token in request headers
 */
function getUserFromRequest(request?: NextRequest): UserInfo | null {
    if (!request) {
        return null
    }

    try {
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null
        }

        const token = authHeader.substring(7)
        interface DecodedToken {
            userId?: string
            sub?: string
            username?: string
            role?: string
            organizationId?: string
        }
        const decoded = jwt.verify(token, getJwtSecret()) as unknown as DecodedToken

        return {
            userId: decoded.userId || decoded.sub || 'unknown',
            userName: decoded.sub || decoded.username || 'Unknown User',
            userRole: decoded.role || 'MANAGER',
            organizationId: decoded.organizationId || ''
        }
    } catch (error) {
        console.error('Failed to extract user from token:', error)
        return null
    }
}

/**
 * Create an audit log entry
 * @param params - Audit log parameters
 * @param userInfo - Optional user info (if not provided, will try to extract from request)
 */
export async function createAuditLog(
    params: AuditLogParams,
    userInfo?: UserInfo
): Promise<void> {
    try {
        // Get user info from request if not provided
        const user = userInfo || getUserFromRequest(params.request)

        if (!user) {
            console.warn('Cannot create audit log: No user information available')
            return
        }

        // Get IP address from request
        let ipAddress: string | null = null
        if (params.request) {
            ipAddress =
                params.request.headers.get('x-forwarded-for')?.split(',')[0] ||
                params.request.headers.get('x-real-ip') ||
                null
        }

        // Create audit log entry
        await prisma.auditLog.create({
            data: {
                userId: user.userId,
                userName: user.userName,
                userRole: user.userRole as import('@prisma/client').UserRole,
                organizationId: user.organizationId || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                details: params.details,
                ipAddress,
                stationId: params.stationId,
                stationName: params.stationName
            }
        })

        console.log(`📝 Audit log created: ${user.userName} ${params.action} ${params.entity}`)
    } catch (error) {
        // Don't throw errors - audit logging should not break the main operation
        console.error('Failed to create audit log:', error)
    }
}

/**
 * Create audit log with manual user info (for operations where request is not available)
 */
export async function createAuditLogManual(
    params: Omit<AuditLogParams, 'request'>,
    userId: string,
    userName: string,
    userRole: string,
    organizationId: string
): Promise<void> {
    await createAuditLog(params, {
        userId,
        userName,
        userRole,
        organizationId
    })
}
