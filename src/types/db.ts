import { Prisma } from '@prisma/client'

// POS Types
export type PosBatchWithDetails = Prisma.PosBatchGetPayload<{
    include: {
        terminalEntries: {
            include: {
                terminal: {
                    include: {
                        bank: true
                    }
                }
            }
        }
        shift: true
    }
}>

export type PosMissingSlipWithDetails = Prisma.PosMissingSlipGetPayload<{
    include: {
        terminal: true
        shift: true
    }
}>

// Tank Types
export type TankWithDetails = Prisma.TankGetPayload<{
    include: {
        nozzles: true
        fuel: true
        station: {
            select: {
                id: true,
                name: true
            }
        }
    }
}>

export type TankReport = {
    tankName: string
    fuelType: string
    openingDip: number
    closingDip: number
    sales: number
    deliveries: number
    variance: number
}

// Stats types
export interface DashboardStats {
    activeTerminals: number
    totalTerminals: number
    totalTransactions: number
    totalAmount: number
    pendingSlips: number
    averageTransaction: number
}

// Shift Statistics
export interface ShiftStatistics {
    durationHours: number
    totalSales: number
    totalLiters: number
    averagePricePerLiter: number
    assignmentCount: number
    closedAssignments: number
}

export interface Cheque {
    amount: number
    chequeNumber: string
    receivedFrom: string
    bankName?: string
}

export interface Expense {
    amount: number
    type: string
    description?: string
    // Add other expense fields as identified
}

export interface PumperBreakdown {
    pumperName: string
    calculatedSales: number
    declaredCash: number
    declaredCardAmounts?: Record<string, number>
    declaredCardAmountsWithNames?: Record<string, { terminalName: string }>
    declaredCreditAmounts?: Record<string, number>
    declaredCreditAmountsWithNames?: Record<string, { customerName: string }>
    cheques?: Cheque[]
    expenses?: Expense[]
    advanceTaken: number
    declaredAmount: number
    variance: number
    varianceStatus: 'ADD_TO_SALARY' | 'DEDUCT_FROM_SALARY' | 'NORMAL'
}

export interface DeclaredAmounts {
    cash: number
    card: number
    credit: number
    cheque: number
    pumperBreakdown?: PumperBreakdown[]
}

// Shift Assignment with full relations
export type AssignmentWithDetails = Prisma.ShiftAssignmentGetPayload<{
    include: {
        nozzle: {
            include: {
                pump: {
                    select: { pumpNumber: true }
                }
                tank: {
                    select: {
                        id: true,
                        fuelId: true,
                        fuel: true,
                        capacity: true,
                        currentLevel: true
                    }
                }
            }
        }
    }
}> & {
    pumperName: string
    actualLiters?: number
    sales?: number
}

// Shift with relations
export type ShiftWithDetails = Prisma.ShiftGetPayload<{
    include: {
        station: {
            select: { id: true, name: true, city: true }
        }
        template: {
            select: { id: true, name: true, startTime: true, endTime: true }
        }
        _count: {
            select: { assignments: true }
        }
    }
}> & {
    assignments?: AssignmentWithDetails[]
    stationName?: string
    templateName?: string
    assignmentCount?: number
    statistics?: ShiftStatistics | Prisma.JsonValue // Allow both typed and raw Json
    declaredAmounts?: DeclaredAmounts | Prisma.JsonValue
}
