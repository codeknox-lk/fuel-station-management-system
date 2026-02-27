import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '@/lib/jwt'
import { AuditAction, UserRole } from '@prisma/client'

export interface AuditContext {
    userId: string
    userName: string
    userRole: UserRole
    action: AuditAction
    entity: string
    entityId?: string
    details: string
    stationId?: string
    stationName?: string
}

/**
 * Server-side audit logging utility
 */
export async function auditLog(context: AuditContext, request: NextRequest): Promise<void> {
    try {
        const forwarded = request.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown'

        // Create audit log entry
        await prisma.auditLog.create({
            data: {
                userId: context.userId,
                userName: context.userName,
                userRole: context.userRole,
                action: context.action,
                entity: context.entity,
                entityId: context.entityId || null,
                details: context.details,
                ipAddress: ip || null,
                stationId: context.stationId || null,
                stationName: context.stationName || null,
                timestamp: new Date()
            }
        })
    } catch (error) {
        console.error('Failed to log audit entry:', error)
    }
}

interface DecodedToken {
    userId?: string
    sub?: string
    username?: string
    role?: UserRole
}

/**
 * Helper to get user context from either cookies (getServerUser) or headers
 */
async function getUserContextForAudit(request: NextRequest): Promise<{ userId: string; userName: string; userRole: UserRole }> {
    // 1. Try Cookies/Session (Fastest/Standard)
    let user = null
    try {
        user = await getServerUser()
    } catch {
        // cookies() called outside request scope during tests
    }

    if (user) {
        return {
            userId: user.userId,
            userName: user.username,
            userRole: user.role as UserRole
        }
    }

    // 2. Try JWT Bearer Token (Legacy/API)
    try {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken
            return {
                userId: decoded.userId || decoded.sub || 'unknown',
                userName: decoded.sub || decoded.username || 'System User',
                userRole: decoded.role || UserRole.MANAGER
            }
        }
    } catch { }

    // 3. Last Resort: Headers (Service Account or Proxy)
    return {
        userId: request.headers.get('x-user-id') || 'system',
        userName: request.headers.get('x-user-name') || 'System User',
        userRole: (request.headers.get('x-user-role') as UserRole) || UserRole.MANAGER
    }
}

/**
 * Audit logging decorators for common operations
 */
export const auditOperations = {
    stationCreated: async (request: NextRequest, stationId: string, stationName: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.CREATE,
            entity: 'Station',
            entityId: stationId,
            details: `Created station: ${stationName}`,
            stationId,
            stationName
        }, request),

    stationUpdated: async (request: NextRequest, stationId: string, stationName: string, changes: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.UPDATE,
            entity: 'Station',
            entityId: stationId,
            details: `Updated station: ${stationName}. Changes: ${changes}`,
            stationId,
            stationName
        }, request),

    stationDeleted: async (request: NextRequest, stationId: string, stationName: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.DELETE,
            entity: 'Station',
            entityId: stationId,
            details: `Deleted station: ${stationName}`,
            stationId,
            stationName
        }, request),

    shiftOpened: async (request: NextRequest, shiftId: string, stationId: string, stationName: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.CREATE,
            entity: 'Shift',
            entityId: shiftId,
            details: `Opened shift at ${stationName}`,
            stationId,
            stationName
        }, request),

    shiftClosed: async (request: NextRequest, shiftId: string, stationId: string, stationName: string, totalSales: number) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.UPDATE,
            entity: 'Shift',
            entityId: shiftId,
            details: `Closed shift at ${stationName}. Total sales: Rs. ${totalSales.toLocaleString()}`,
            stationId,
            stationName
        }, request),

    deliveryRecorded: async (request: NextRequest, deliveryId: string, tankId: string, quantity: number, stationId: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.CREATE,
            entity: 'Delivery',
            entityId: deliveryId,
            details: `Recorded fuel delivery: ${quantity}L to tank ${tankId}`,
            stationId
        }, request),

    expenseRecorded: async (request: NextRequest, expenseId: string, amount: number, category: string, stationId: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.CREATE,
            entity: 'Expense',
            entityId: expenseId,
            details: `Recorded expense: Rs. ${amount.toLocaleString()} for ${category}`,
            stationId
        }, request),

    userCreated: async (request: NextRequest, userId: string, userName: string, userRole: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.CREATE,
            entity: 'User',
            entityId: userId,
            details: `Created user: ${userName} with role ${userRole}`
        }, request),

    userUpdated: async (request: NextRequest, userId: string, userName: string, changes: string) =>
        auditLog({
            ...(await getUserContextForAudit(request)),
            action: AuditAction.UPDATE,
            entity: 'User',
            entityId: userId,
            details: `Updated user: ${userName}. Changes: ${changes}`
        }, request)
}

/**
 * Manual audit log entry without requiring a full request object
 */
export async function createAuditLogManual(
    context: Omit<AuditContext, 'userId' | 'userName' | 'userRole'>,
    userId: string,
    userName: string,
    userRole: string
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                userName,
                userRole: userRole as UserRole,
                action: context.action,
                entity: context.entity,
                entityId: context.entityId || null,
                details: context.details,
                ipAddress: 'manual',
                stationId: context.stationId || null,
                stationName: context.stationName || null,
                timestamp: new Date()
            }
        })
    } catch (error) {
        console.error('Failed to log manual audit entry:', error)
    }
}


