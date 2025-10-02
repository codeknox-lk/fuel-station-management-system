// Mock data for system audit log
export interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  action: string
  entity: string
  entityId?: string
  details: string
  ipAddress?: string
  timestamp: string
  stationId?: string
  stationName?: string
}

// Mock audit log entries
const auditLogEntries: AuditLogEntry[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'CREATE',
    entity: 'SHIFT',
    entityId: 'shift123',
    details: 'Opened morning shift for Station 1',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T06:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '2',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'UPDATE',
    entity: 'SHIFT_ASSIGNMENT',
    entityId: 'assign456',
    details: 'Assigned pumper Kamal Perera to Nozzle 1',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T06:05:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '3',
    userId: 'user2',
    userName: 'Sarah Accounts',
    userRole: 'ACCOUNTS',
    action: 'CREATE',
    entity: 'EXPENSE',
    entityId: 'exp789',
    details: 'Added office supplies expense: Rs. 2,500',
    ipAddress: '192.168.1.101',
    timestamp: '2024-10-02T08:30:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '4',
    userId: 'user3',
    userName: 'Owner Admin',
    userRole: 'OWNER',
    action: 'UPDATE',
    entity: 'PRICE',
    entityId: 'price001',
    details: 'Updated Petrol 92 price from Rs. 365.00 to Rs. 370.00',
    ipAddress: '192.168.1.102',
    timestamp: '2024-10-02T09:00:00Z'
  },
  {
    id: '5',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'CREATE',
    entity: 'METER_AUDIT',
    entityId: 'audit001',
    details: 'Recorded meter audit for all nozzles',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T12:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '6',
    userId: 'user2',
    userName: 'Sarah Accounts',
    userRole: 'ACCOUNTS',
    action: 'CREATE',
    entity: 'CREDIT_CUSTOMER',
    entityId: 'cust001',
    details: 'Added new credit customer: ABC Company Ltd.',
    ipAddress: '192.168.1.101',
    timestamp: '2024-10-02T10:15:00Z'
  },
  {
    id: '7',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'CREATE',
    entity: 'DELIVERY',
    entityId: 'del001',
    details: 'Recorded fuel delivery: 5,000L Petrol 92 to Tank 1',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T07:30:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '8',
    userId: 'user2',
    userName: 'Sarah Accounts',
    userRole: 'ACCOUNTS',
    action: 'CREATE',
    entity: 'DEPOSIT',
    entityId: 'dep001',
    details: 'Recorded bank deposit: Rs. 150,000 to BOC Main Account',
    ipAddress: '192.168.1.101',
    timestamp: '2024-10-02T16:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '9',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'UPDATE',
    entity: 'SHIFT',
    entityId: 'shift123',
    details: 'Closed morning shift with variance: Rs. -250 (within tolerance)',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T18:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '10',
    userId: 'user3',
    userName: 'Owner Admin',
    userRole: 'OWNER',
    action: 'CREATE',
    entity: 'USER',
    entityId: 'user004',
    details: 'Created new user account: New Manager (MANAGER role)',
    ipAddress: '192.168.1.102',
    timestamp: '2024-10-02T11:00:00Z'
  },
  {
    id: '11',
    userId: 'user2',
    userName: 'Sarah Accounts',
    userRole: 'ACCOUNTS',
    action: 'CREATE',
    entity: 'CREDIT_PAYMENT',
    entityId: 'pay001',
    details: 'Recorded credit payment: Rs. 25,000 from XYZ Motors',
    ipAddress: '192.168.1.101',
    timestamp: '2024-10-02T14:30:00Z'
  },
  {
    id: '12',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'CREATE',
    entity: 'TEST_POUR',
    entityId: 'test001',
    details: 'Recorded test pour: 5L from Nozzle 1 (maintenance check)',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T08:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '13',
    userId: 'user2',
    userName: 'Sarah Accounts',
    userRole: 'ACCOUNTS',
    action: 'UPDATE',
    entity: 'CHEQUE',
    entityId: 'chq001',
    details: 'Updated cheque status from Received to Deposited',
    ipAddress: '192.168.1.101',
    timestamp: '2024-10-02T15:45:00Z'
  },
  {
    id: '14',
    userId: 'user1',
    userName: 'John Manager',
    userRole: 'MANAGER',
    action: 'CREATE',
    entity: 'POS_BATCH',
    entityId: 'batch001',
    details: 'Created POS batch for Terminal 1: Rs. 45,000 total',
    ipAddress: '192.168.1.100',
    timestamp: '2024-10-02T20:00:00Z',
    stationId: '1',
    stationName: 'Station 1 - Colombo'
  },
  {
    id: '15',
    userId: 'user3',
    userName: 'Owner Admin',
    userRole: 'OWNER',
    action: 'UPDATE',
    entity: 'TOLERANCE',
    entityId: 'tolerance001',
    details: 'Updated tolerance settings: 0.3% or Rs. 250 (whichever is higher)',
    ipAddress: '192.168.1.102',
    timestamp: '2024-10-01T10:00:00Z'
  }
]

// Helper functions
export function getAuditLogEntries(): AuditLogEntry[] {
  return [...auditLogEntries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAuditLogEntriesByDateRange(startDate: string, endDate: string): AuditLogEntry[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  return auditLogEntries.filter(entry => {
    const entryDate = new Date(entry.timestamp)
    return entryDate >= start && entryDate <= end
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAuditLogEntriesByUser(userId: string): AuditLogEntry[] {
  return auditLogEntries.filter(entry => entry.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAuditLogEntriesByStation(stationId: string): AuditLogEntry[] {
  return auditLogEntries.filter(entry => entry.stationId === stationId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAuditLogEntriesByEntity(entity: string): AuditLogEntry[] {
  return auditLogEntries.filter(entry => entry.entity === entity)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function addAuditLogEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry
  }
  
  auditLogEntries.unshift(newEntry)
  return newEntry
}

// Activity summary for dashboard
export function getRecentActivity(limit: number = 10): AuditLogEntry[] {
  return getAuditLogEntries().slice(0, limit)
}

export function getActivityStats() {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const todayEntries = auditLogEntries.filter(entry => {
    const entryDate = new Date(entry.timestamp)
    return entryDate.toDateString() === today.toDateString()
  })
  
  const yesterdayEntries = auditLogEntries.filter(entry => {
    const entryDate = new Date(entry.timestamp)
    return entryDate.toDateString() === yesterday.toDateString()
  })
  
  return {
    todayCount: todayEntries.length,
    yesterdayCount: yesterdayEntries.length,
    totalEntries: auditLogEntries.length,
    uniqueUsers: new Set(auditLogEntries.map(e => e.userId)).size
  }
}
