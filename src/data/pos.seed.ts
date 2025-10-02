export interface PosTerminal {
  id: string
  stationId: string
  bankId: string
  terminalId: string
  terminalName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PosBatch {
  id: string
  terminalId: string
  shiftId: string
  batchDate: string
  visaAmount: number
  masterAmount: number
  amexAmount: number
  qrAmount: number
  totalAmount: number
  isReconciled: boolean
  reconciledAt?: string
  createdAt: string
  updatedAt: string
}

export interface PosMissingSlip {
  id: string
  terminalId: string
  shiftId: string
  amount: number
  lastFourDigits: string
  timestamp: string
  reportedBy: string
  createdAt: string
  updatedAt: string
}

export const posTerminals: PosTerminal[] = [
  {
    id: '1',
    stationId: '1',
    bankId: '1',
    terminalId: 'T001',
    terminalName: 'CBC Terminal 1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    bankId: '1',
    terminalId: 'T002',
    terminalName: 'CBC Terminal 2',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    stationId: '1',
    bankId: '2',
    terminalId: 'T003',
    terminalName: 'PB Terminal 1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    stationId: '1',
    bankId: '3',
    terminalId: 'T004',
    terminalName: 'SB Terminal 1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    stationId: '2',
    bankId: '1',
    terminalId: 'T005',
    terminalName: 'CBC Terminal 3',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    stationId: '2',
    bankId: '4',
    terminalId: 'T006',
    terminalName: 'HNB Terminal 1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const posBatches: PosBatch[] = [
  {
    id: '1',
    terminalId: '1',
    shiftId: '1',
    batchDate: '2024-10-01',
    visaAmount: 25000,
    masterAmount: 30000,
    amexAmount: 5000,
    qrAmount: 15000,
    totalAmount: 75000,
    isReconciled: true,
    reconciledAt: '2024-10-01T18:30:00Z',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:30:00Z'
  },
  {
    id: '2',
    terminalId: '2',
    shiftId: '1',
    batchDate: '2024-10-01',
    visaAmount: 20000,
    masterAmount: 25000,
    amexAmount: 3000,
    qrAmount: 12000,
    totalAmount: 60000,
    isReconciled: false,
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '3',
    terminalId: '3',
    shiftId: '1',
    batchDate: '2024-10-01',
    visaAmount: 15000,
    masterAmount: 20000,
    amexAmount: 2000,
    qrAmount: 8000,
    totalAmount: 45000,
    isReconciled: true,
    reconciledAt: '2024-10-01T18:15:00Z',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:15:00Z'
  }
]

export const posMissingSlips: PosMissingSlip[] = [
  {
    id: '1',
    terminalId: '1',
    shiftId: '1',
    amount: 5000,
    lastFourDigits: '1234',
    timestamp: '2024-10-01T14:30:00Z',
    reportedBy: 'John Doe',
    createdAt: '2024-10-01T14:30:00Z',
    updatedAt: '2024-10-01T14:30:00Z'
  },
  {
    id: '2',
    terminalId: '2',
    shiftId: '1',
    amount: 3000,
    lastFourDigits: '5678',
    timestamp: '2024-10-01T16:45:00Z',
    reportedBy: 'Jane Smith',
    createdAt: '2024-10-01T16:45:00Z',
    updatedAt: '2024-10-01T16:45:00Z'
  }
]

export function getPosTerminals(): PosTerminal[] {
  return posTerminals
}

export function getPosTerminalsByStationId(stationId: string): PosTerminal[] {
  return posTerminals.filter(terminal => terminal.stationId === stationId && terminal.isActive)
}

export function getPosTerminalById(id: string): PosTerminal | undefined {
  return posTerminals.find(terminal => terminal.id === id)
}

export function getPosBatches(): PosBatch[] {
  return posBatches
}

export function getPosBatchesByShiftId(shiftId: string): PosBatch[] {
  return posBatches.filter(batch => batch.shiftId === shiftId)
}

export function getPosBatchesByTerminalId(terminalId: string): PosBatch[] {
  return posBatches.filter(batch => batch.terminalId === terminalId)
}

export function getPosBatchById(id: string): PosBatch | undefined {
  return posBatches.find(batch => batch.id === id)
}

export function getPosMissingSlips(): PosMissingSlip[] {
  return posMissingSlips
}

export function getPosMissingSlipsByShiftId(shiftId: string): PosMissingSlip[] {
  return posMissingSlips.filter(slip => slip.shiftId === shiftId)
}

export function getPosMissingSlipsByTerminalId(terminalId: string): PosMissingSlip[] {
  return posMissingSlips.filter(slip => slip.terminalId === terminalId)
}

export function getPosMissingSlipById(id: string): PosMissingSlip | undefined {
  return posMissingSlips.find(slip => slip.id === id)
}
