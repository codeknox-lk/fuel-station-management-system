import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export interface AuditContext {
  userId: string
  userName: string
  userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
  entity: string
  entityId?: string
  details: string
  stationId?: string
  stationName?: string
}

/**
 * Server-side audit logging utility
 * This should be called from API routes to log user actions
 */
export async function auditLog(context: AuditContext, request: NextRequest): Promise<void> {
  try {
    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
    
    // Get user info from context or headers
    const userIdHeader = request.headers.get('x-user-id') || context.userId
    const userNameHeader = request.headers.get('x-user-name') || context.userName
    const userRoleHeader = request.headers.get('x-user-role') || context.userRole
    
    // Verify user exists in database
    let validUserId = userIdHeader
    try {
      const user = await prisma.user.findUnique({
        where: { id: userIdHeader }
      })
      
      if (!user) {
        // Try to find by username
        const userByUsername = await prisma.user.findFirst({
          where: { username: userNameHeader }
        })
        if (userByUsername) {
          validUserId = userByUsername.id
        }
      }
    } catch (userCheckError) {
      // Continue with original userId - Prisma will handle FK constraint
    }
    
    // Create audit log entry using Prisma
    await prisma.auditLog.create({
      data: {
        userId: validUserId,
        userName: userNameHeader,
        userRole: userRoleHeader as 'OWNER' | 'MANAGER' | 'ACCOUNTS',
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
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Helper function to extract user context from request headers
 * In a real app, this would decode JWT tokens
 */
export function getUserContext(request: NextRequest): { userId: string; userName: string; userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS' } {
  // Mock user context - in real app, extract from JWT
  return {
    userId: request.headers.get('x-user-id') || 'user-1',
    userName: request.headers.get('x-user-name') || 'System User',
    userRole: (request.headers.get('x-user-role') as 'OWNER' | 'MANAGER' | 'ACCOUNTS') || 'MANAGER'
  }
}

/**
 * Audit logging decorators for common operations
 */
export const auditOperations = {
  // Station operations
  stationCreated: (request: NextRequest, stationId: string, stationName: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Station',
      entityId: stationId,
      details: `Created station: ${stationName}`,
      stationId,
      stationName
    }, request),

  stationUpdated: (request: NextRequest, stationId: string, stationName: string, changes: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'UPDATE',
      entity: 'Station',
      entityId: stationId,
      details: `Updated station: ${stationName}. Changes: ${changes}`,
      stationId,
      stationName
    }, request),

  stationDeleted: (request: NextRequest, stationId: string, stationName: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'DELETE',
      entity: 'Station',
      entityId: stationId,
      details: `Deleted station: ${stationName}`,
      stationId,
      stationName
    }, request),

  // Shift operations
  shiftOpened: (request: NextRequest, shiftId: string, stationId: string, stationName: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Shift',
      entityId: shiftId,
      details: `Opened shift at ${stationName}`,
      stationId,
      stationName
    }, request),

  shiftClosed: (request: NextRequest, shiftId: string, stationId: string, stationName: string, totalSales: number) => 
    auditLog({
      ...getUserContext(request),
      action: 'UPDATE',
      entity: 'Shift',
      entityId: shiftId,
      details: `Closed shift at ${stationName}. Total sales: Rs. ${totalSales.toLocaleString()}`,
      stationId,
      stationName
    }, request),

  // Price operations
  priceUpdated: (request: NextRequest, priceId: string, fuelName: string, newPrice: number, stationId?: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'UPDATE',
      entity: 'Price',
      entityId: priceId,
      details: `Updated ${fuelName} price to Rs. ${newPrice.toFixed(2)}`,
      stationId
    }, request),

  // Tank operations
  tankDipRecorded: (request: NextRequest, tankId: string, dipLitres: number, stationId: string, stationName: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Tank Dip',
      entityId: tankId,
      details: `Recorded tank dip: ${dipLitres}L`,
      stationId,
      stationName
    }, request),

  deliveryRecorded: (request: NextRequest, deliveryId: string, tankId: string, quantity: number, stationId: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Delivery',
      entityId: deliveryId,
      details: `Recorded fuel delivery: ${quantity}L to tank ${tankId}`,
      stationId
    }, request),

  // Credit operations
  creditCustomerCreated: (request: NextRequest, customerId: string, customerName: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Credit Customer',
      entityId: customerId,
      details: `Created credit customer: ${customerName}`
    }, request),

  creditSaleRecorded: (request: NextRequest, saleId: string, customerId: string, amount: number, stationId: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Credit Sale',
      entityId: saleId,
      details: `Recorded credit sale: Rs. ${amount.toLocaleString()} for customer ${customerId}`,
      stationId
    }, request),

  // Financial operations
  expenseRecorded: (request: NextRequest, expenseId: string, amount: number, category: string, stationId: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Expense',
      entityId: expenseId,
      details: `Recorded expense: Rs. ${amount.toLocaleString()} for ${category}`,
      stationId
    }, request),

  depositRecorded: (request: NextRequest, depositId: string, amount: number, bankAccount: string, stationId: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'Deposit',
      entityId: depositId,
      details: `Recorded bank deposit: Rs. ${amount.toLocaleString()} to ${bankAccount}`,
      stationId
    }, request),

  // User operations
  userCreated: (request: NextRequest, userId: string, userName: string, userRole: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'CREATE',
      entity: 'User',
      entityId: userId,
      details: `Created user: ${userName} with role ${userRole}`
    }, request),

  userUpdated: (request: NextRequest, userId: string, userName: string, changes: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      details: `Updated user: ${userName}. Changes: ${changes}`
    }, request),

  // Settings operations
  settingsUpdated: (request: NextRequest, settingType: string, details: string) => 
    auditLog({
      ...getUserContext(request),
      action: 'UPDATE',
      entity: 'Settings',
      details: `Updated ${settingType}: ${details}`
    }, request)
}

