export interface Shift {
  id: string
  stationId: string
  templateId: string
  startTime: string
  endTime?: string
  status: 'OPEN' | 'CLOSED'
  openedBy: string
  closedBy?: string
  createdAt: string
  updatedAt: string
  statistics?: {
    durationHours: number
    totalSales: number
    totalLiters: number
    averagePricePerLiter: number
    assignmentCount: number
    closedAssignments: number
  }
  declaredAmounts?: {
    cash: number
    card: number
    credit: number
    cheque: number
    total: number
  }
}

export interface ShiftAssignment {
  id: string
  shiftId: string
  nozzleId: string
  pumperName: string
  startMeterReading: number
  endMeterReading?: number
  status: 'ACTIVE' | 'CLOSED'
  assignedAt: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MeterAudit {
  id: string
  shiftId: string
  nozzleId: string
  reading: number
  timestamp: string
  auditedBy: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TestPour {
  id: string
  shiftId: string
  nozzleId: string
  amount: number // in liters
  testType: '5L' | '50L' | '100L'
  timestamp: string
  performedBy: string
  returned: boolean
  createdAt: string
  updatedAt: string
}

// Global shifts array that persists across API calls
// Using a module-level variable that gets initialized once
let shifts: Shift[] = []

// Initialize global shifts only if not already set
if (!globalThis.__shifts) {
  globalThis.__shifts = []
}

export const shiftAssignments: ShiftAssignment[] = []

// Initialize global assignments only if not already set
if (!globalThis.__shiftAssignments) {
  globalThis.__shiftAssignments = []
}

export const meterAudits: MeterAudit[] = [
  {
    id: '1',
    shiftId: '1',
    nozzleId: '1',
    reading: 1100,
    timestamp: '2024-10-01T12:00:00Z',
    auditedBy: 'Manager John',
    notes: 'Mid-day audit - no variance',
    createdAt: '2024-10-01T12:00:00Z',
    updatedAt: '2024-10-01T12:00:00Z'
  },
  {
    id: '2',
    shiftId: '1',
    nozzleId: '2',
    reading: 2075,
    timestamp: '2024-10-01T12:00:00Z',
    auditedBy: 'Manager John',
    notes: 'Mid-day audit - no variance',
    createdAt: '2024-10-01T12:00:00Z',
    updatedAt: '2024-10-01T12:00:00Z'
  },
  {
    id: '3',
    shiftId: '1',
    nozzleId: '3',
    reading: 3100,
    timestamp: '2024-10-01T12:00:00Z',
    auditedBy: 'Manager John',
    notes: 'Mid-day audit - no variance',
    createdAt: '2024-10-01T12:00:00Z',
    updatedAt: '2024-10-01T12:00:00Z'
  }
]

export const testPours: TestPour[] = [
  {
    id: '1',
    shiftId: '1',
    nozzleId: '1',
    amount: 5,
    testType: '5L',
    timestamp: '2024-10-01T06:30:00Z',
    performedBy: 'Kamal Perera',
    returned: true,
    createdAt: '2024-10-01T06:30:00Z',
    updatedAt: '2024-10-01T06:30:00Z'
  },
  {
    id: '2',
    shiftId: '1',
    nozzleId: '2',
    amount: 5,
    testType: '5L',
    timestamp: '2024-10-01T06:30:00Z',
    performedBy: 'Nimal Silva',
    returned: true,
    createdAt: '2024-10-01T06:30:00Z',
    updatedAt: '2024-10-01T06:30:00Z'
  },
  {
    id: '3',
    shiftId: '1',
    nozzleId: '3',
    amount: 50,
    testType: '50L',
    timestamp: '2024-10-01T14:00:00Z',
    performedBy: 'Sunil Fernando',
    returned: true,
    createdAt: '2024-10-01T14:00:00Z',
    updatedAt: '2024-10-01T14:00:00Z'
  }
]

export function getShifts(): Shift[] {
  return globalThis.__shifts || [...shifts]
}

// Export the shifts array for direct access (for debugging)
export { shifts }

export function getShiftsByStationId(stationId: string): Shift[] {
  const allShifts = globalThis.__shifts || [...shifts]
  return allShifts.filter(shift => shift.stationId === stationId)
}

export function getActiveShifts(): Shift[] {
  const allShifts = globalThis.__shifts || [...shifts]
  return allShifts.filter(shift => shift.status === 'OPEN')
}

export function getShiftById(id: string): Shift | undefined {
  const allShifts = globalThis.__shifts || [...shifts]
  return allShifts.find(shift => shift.id === id)
}

export function getShiftAssignments(): ShiftAssignment[] {
  return globalThis.__shiftAssignments || [...shiftAssignments]
}

export function getShiftAssignmentsByShiftId(shiftId: string): ShiftAssignment[] {
  const allAssignments = globalThis.__shiftAssignments || [...shiftAssignments]
  return allAssignments.filter(assignment => assignment.shiftId === shiftId)
}

export function getShiftAssignmentById(id: string): ShiftAssignment | undefined {
  const allAssignments = globalThis.__shiftAssignments || [...shiftAssignments]
  return allAssignments.find(assignment => assignment.id === id)
}

export function getMeterAudits(): MeterAudit[] {
  return meterAudits
}

export function getMeterAuditsByShiftId(shiftId: string): MeterAudit[] {
  return meterAudits.filter(audit => audit.shiftId === shiftId)
}

export function getMeterAuditById(id: string): MeterAudit | undefined {
  return meterAudits.find(audit => audit.id === id)
}

export function getTestPours(): TestPour[] {
  return testPours
}

export function getTestPoursByShiftId(shiftId: string): TestPour[] {
  return testPours.filter(test => test.shiftId === shiftId)
}

export function getTestPourById(id: string): TestPour | undefined {
  return testPours.find(test => test.id === id)
}

export function getAssignmentsByShiftId(shiftId: string): ShiftAssignment[] {
  const allAssignments = globalThis.__shiftAssignments || [...shiftAssignments]
  return allAssignments.filter(assignment => assignment.shiftId === shiftId)
}

export function closeAssignment(assignmentId: string, endMeterReading: number, endTime: string): ShiftAssignment | null {
  const allAssignments = globalThis.__shiftAssignments || [...shiftAssignments]
  const assignment = allAssignments.find(a => a.id === assignmentId)
  if (!assignment) return null

  assignment.endMeterReading = endMeterReading
  assignment.status = 'CLOSED'
  assignment.closedAt = endTime
  assignment.updatedAt = new Date().toISOString()

  return assignment
}

// Dynamic shift management functions
export function createShift(shiftData: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Shift {
  const newShift: Shift = {
    id: Date.now().toString(),
    ...shiftData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // Initialize global array if not exists
  if (!globalThis.__shifts) {
    globalThis.__shifts = []
  }
  
  globalThis.__shifts.push(newShift)
  return newShift
}

export function updateShift(id: string, updates: Partial<Shift>): Shift | null {
  // Initialize global array if not exists
  if (!globalThis.__shifts) {
    globalThis.__shifts = []
  }
  
  const shiftIndex = globalThis.__shifts.findIndex(s => s.id === id)
  if (shiftIndex === -1) return null
  
  globalThis.__shifts[shiftIndex] = {
    ...globalThis.__shifts[shiftIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  return globalThis.__shifts[shiftIndex]
}

export function createShiftAssignment(assignmentData: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>): ShiftAssignment {
  const newAssignment: ShiftAssignment = {
    id: Date.now().toString(),
    ...assignmentData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  // Initialize global array if not exists
  if (!globalThis.__shiftAssignments) {
    globalThis.__shiftAssignments = []
  }
  
  globalThis.__shiftAssignments.push(newAssignment)
  return newAssignment
}
