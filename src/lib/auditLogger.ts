// Audit logging utility for tracking user actions
export interface AuditLogParams {
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
 * Log an audit entry to the system
 * This is a client-side utility that sends audit logs to the API
 */
export async function logAuditEntry(params: AuditLogParams): Promise<void> {
  try {
    // Validate required fields
    if (!params.userId || !params.userName || !params.userRole || !params.action || !params.entity || !params.details) {
      console.error('Missing required fields for audit log:', params)
      return
    }
    
    // Get client IP (in a real app, this would be handled server-side)
    const ipAddress = await getClientIP()
    
    const response = await fetch('/api/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        ipAddress
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to log audit entry:', response.status, response.statusText, errorData)
    }
  } catch (error) {
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get current user info from localStorage
 * In a real app, this would come from a proper auth context
 */
export function getCurrentUser(): { userId: string; userName: string; userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS' } | null {
  if (typeof window === 'undefined') return null
  
  try {
    const userId = localStorage.getItem('userId')
    const userName = localStorage.getItem('username') || 'System User'
    const userRole = localStorage.getItem('userRole') as 'OWNER' | 'MANAGER' | 'ACCOUNTS'
    
    if (!userId || !userRole) {
      console.warn('Missing userId or userRole in localStorage for audit logging')
      return null
    }

    return {
      userId,
      userName,
      userRole
    }
  } catch (error) {
    console.error('Error getting current user for audit logging:', error)
    return null
  }
}

/**
 * Helper to log common audit actions
 */
export class AuditLogger {
  private user: { userId: string; userName: string; userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS' } | null

  constructor() {
    this.user = getCurrentUser()
  }

  private async log(action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW', entity: string, details: string, entityId?: string, stationId?: string, stationName?: string) {
    if (!this.user) return

    await logAuditEntry({
      ...this.user,
      action,
      entity,
      entityId,
      details,
      stationId,
      stationName
    })
  }

  // Shift operations
  async logShiftCreated(shiftId: string, stationId: string, stationName: string, templateName: string) {
    await this.log('CREATE', 'SHIFT', `Opened ${templateName} shift for ${stationName}`, shiftId, stationId, stationName)
  }

  async logShiftClosed(shiftId: string, stationId: string, stationName: string, variance: number) {
    const varianceText = variance >= 0 ? `excess: Rs. ${variance.toLocaleString()}` : `shortage: Rs. ${Math.abs(variance).toLocaleString()}`
    await this.log('UPDATE', 'SHIFT', `Closed shift with ${varianceText}`, shiftId, stationId, stationName)
  }

  async logPumperAssigned(assignmentId: string, pumperName: string, nozzleDisplayName: string, stationId: string, stationName: string) {
    await this.log('CREATE', 'SHIFT_ASSIGNMENT', `Assigned ${pumperName} to ${nozzleDisplayName}`, assignmentId, stationId, stationName)
  }

  // Price operations
  async logPriceUpdated(priceId: string, fuelName: string, oldPrice: number, newPrice: number) {
    await this.log('UPDATE', 'PRICE', `Updated ${fuelName} price from Rs. ${oldPrice.toFixed(2)} to Rs. ${newPrice.toFixed(2)}`, priceId)
  }

  // Credit operations
  async logCreditCustomerCreated(customerId: string, customerName: string) {
    await this.log('CREATE', 'CREDIT_CUSTOMER', `Added new credit customer: ${customerName}`, customerId)
  }

  async logCreditSaleCreated(saleId: string, customerName: string, amount: number, stationId: string, stationName: string) {
    await this.log('CREATE', 'CREDIT_SALE', `Credit sale to ${customerName}: Rs. ${amount.toLocaleString()}`, saleId, stationId, stationName)
  }

  async logCreditPaymentCreated(paymentId: string, customerName: string, amount: number) {
    await this.log('CREATE', 'CREDIT_PAYMENT', `Credit payment from ${customerName}: Rs. ${amount.toLocaleString()}`, paymentId)
  }

  // Financial operations
  async logExpenseCreated(expenseId: string, category: string, amount: number, stationId: string, stationName: string) {
    await this.log('CREATE', 'EXPENSE', `Added ${category} expense: Rs. ${amount.toLocaleString()}`, expenseId, stationId, stationName)
  }

  async logDepositCreated(depositId: string, amount: number, bankName: string, stationId: string, stationName: string) {
    await this.log('CREATE', 'DEPOSIT', `Bank deposit to ${bankName}: Rs. ${amount.toLocaleString()}`, depositId, stationId, stationName)
  }

  async logLoanCreated(loanId: string, type: 'EXTERNAL' | 'PUMPER', recipient: string, amount: number, stationId?: string, stationName?: string) {
    const loanType = type === 'EXTERNAL' ? 'External loan' : 'Pumper loan'
    await this.log('CREATE', `LOAN_${type}`, `${loanType} to ${recipient}: Rs. ${amount.toLocaleString()}`, loanId, stationId, stationName)
  }

  // Tank operations
  async logDeliveryCreated(deliveryId: string, fuelName: string, quantity: number, supplier: string, stationId: string, stationName: string) {
    await this.log('CREATE', 'DELIVERY', `Fuel delivery: ${quantity.toLocaleString()}L ${fuelName} from ${supplier}`, deliveryId, stationId, stationName)
  }

  async logTankDipCreated(dipId: string, tankId: string, dipLevel: number, stationId: string, stationName: string) {
    await this.log('CREATE', 'TANK_DIP', `Tank dip recorded: ${dipLevel.toLocaleString()}L for Tank ${tankId}`, dipId, stationId, stationName)
  }

  // POS operations
  async logPosBatchCreated(batchId: string, terminalName: string, totalAmount: number, stationId: string, stationName: string) {
    await this.log('CREATE', 'POS_BATCH', `POS batch for ${terminalName}: Rs. ${totalAmount.toLocaleString()}`, batchId, stationId, stationName)
  }

  async logMissingSlipReported(slipId: string, amount: number, last4Digits: string, stationId: string, stationName: string) {
    await this.log('CREATE', 'MISSING_SLIP', `Missing slip reported: Rs. ${amount.toLocaleString()} (****${last4Digits})`, slipId, stationId, stationName)
  }

  // User management
  async logUserCreated(userId: string, userName: string, role: string) {
    await this.log('CREATE', 'USER', `Created user account: ${userName} (${role} role)`, userId)
  }

  async logUserUpdated(userId: string, userName: string, changes: string) {
    await this.log('UPDATE', 'USER', `Updated user ${userName}: ${changes}`, userId)
  }

  // Settings
  async logToleranceUpdated(toleranceId: string, percentage: number, flatAmount: number) {
    await this.log('UPDATE', 'TOLERANCE', `Updated tolerance: ${percentage}% or Rs. ${flatAmount} (whichever is higher)`, toleranceId)
  }

  async logStationUpdated(stationId: string, stationName: string, changes: string) {
    await this.log('UPDATE', 'STATION', `Updated station ${stationName}: ${changes}`, stationId)
  }
}

/**
 * Get client IP address (mock implementation)
 * In a real app, this would be handled server-side
 */
async function getClientIP(): Promise<string> {
  try {
    // This is a mock implementation
    // In production, IP would be captured server-side
    return '192.168.1.100'
  } catch {
    return 'Unknown'
  }
}

// Export a singleton instance
export const auditLogger = new AuditLogger()

