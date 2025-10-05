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

// Dynamic shifts array that can be modified at runtime
let shifts: Shift[] = [
  {
    id: '1',
    stationId: '1',
    templateId: '1',
    startTime: '2024-10-01T06:00:00Z',
    endTime: '2024-10-01T18:00:00Z',
    status: 'CLOSED',
    openedBy: 'Manager John',
    closedBy: 'Manager John',
    createdAt: '2024-10-01T06:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    templateId: '2',
    startTime: '2024-10-01T18:00:00Z',
    status: 'OPEN',
    openedBy: 'Manager Jane',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '3',
    stationId: '2',
    templateId: '1',
    startTime: '2024-10-01T06:00:00Z',
    status: 'OPEN',
    openedBy: 'Manager Mike',
    createdAt: '2024-10-01T06:00:00Z',
    updatedAt: '2024-10-01T06:00:00Z'
  }
]

export const shiftAssignments: ShiftAssignment[] = [
  {
    id: '1',
    shiftId: '1',
    nozzleId: '1',
    pumperName: 'Kamal Perera',
    startMeterReading: 1000,
    endMeterReading: 1200,
    status: 'CLOSED',
    assignedAt: '2024-10-01T06:00:00Z',
    closedAt: '2024-10-01T18:00:00Z',
    createdAt: '2024-10-01T06:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '2',
    shiftId: '1',
    nozzleId: '2',
    pumperName: 'Nimal Silva',
    startMeterReading: 2000,
    endMeterReading: 2150,
    status: 'CLOSED',
    assignedAt: '2024-10-01T06:00:00Z',
    closedAt: '2024-10-01T18:00:00Z',
    createdAt: '2024-10-01T06:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '3',
    shiftId: '1',
    nozzleId: '3',
    pumperName: 'Sunil Fernando',
    startMeterReading: 3000,
    endMeterReading: 3200,
    status: 'CLOSED',
    assignedAt: '2024-10-01T06:00:00Z',
    closedAt: '2024-10-01T18:00:00Z',
    createdAt: '2024-10-01T06:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '4',
    shiftId: '2',
    nozzleId: '1',
    pumperName: 'Kamal Perera',
    startMeterReading: 1200,
    status: 'ACTIVE',
    assignedAt: '2024-10-01T18:00:00Z',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '5',
    shiftId: '2',
    nozzleId: '2',
    pumperName: 'Nimal Silva',
    startMeterReading: 2150,
    status: 'ACTIVE',
    assignedAt: '2024-10-01T18:00:00Z',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  }
]

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
  return shifts
}

// Export the shifts array for direct access (for debugging)
export { shifts }

export function getShiftsByStationId(stationId: string): Shift[] {
  return shifts.filter(shift => shift.stationId === stationId)
}

export function getActiveShifts(): Shift[] {
  return shifts.filter(shift => shift.status === 'OPEN')
}

export function getShiftById(id: string): Shift | undefined {
  return shifts.find(shift => shift.id === id)
}

export function getShiftAssignments(): ShiftAssignment[] {
  return shiftAssignments
}

export function getShiftAssignmentsByShiftId(shiftId: string): ShiftAssignment[] {
  return shiftAssignments.filter(assignment => assignment.shiftId === shiftId)
}

export function getShiftAssignmentById(id: string): ShiftAssignment | undefined {
  return shiftAssignments.find(assignment => assignment.id === id)
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
  return shiftAssignments.filter(assignment => assignment.shiftId === shiftId)
}

export function closeAssignment(assignmentId: string, endMeterReading: number, endTime: string): ShiftAssignment | null {
  const assignment = shiftAssignments.find(a => a.id === assignmentId)
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
  
  shifts.push(newShift)
  return newShift
}

export function updateShift(id: string, updates: Partial<Shift>): Shift | null {
  const shiftIndex = shifts.findIndex(s => s.id === id)
  if (shiftIndex === -1) return null
  
  shifts[shiftIndex] = {
    ...shifts[shiftIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  return shifts[shiftIndex]
}

export function createShiftAssignment(assignmentData: Omit<ShiftAssignment, 'id' | 'createdAt' | 'updatedAt'>): ShiftAssignment {
  const newAssignment: ShiftAssignment = {
    id: Date.now().toString(),
    ...assignmentData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  shiftAssignments.push(newAssignment)
  return newAssignment
}
