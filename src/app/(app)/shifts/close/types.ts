export interface Station {
    id: string
    name: string
    city: string
}

export interface Shift {
    id: string
    shiftNumber: number
    pumperName?: string
    stationId: string
    templateId: string
    startTime: string
    endTime?: string
    status: string
    openedBy: string
    assignments?: Assignment[]
    shopAssignment?: {
        id: string
        pumperName: string
    }
}

export interface Assignment {
    id: string | number
    nozzleId: string
    pumperName: string
    startMeterReading: number
    endMeterReading?: number
    status: string
    pumpSales?: number
    nozzle?: {
        id: string
        nozzleNumber: string
        pump?: {
            pumpNumber: string
        }
        tank?: {
            fuelId: string
            fuel?: {
                id: string
                name: string
                icon?: string | null
            }
        }
    }
}

export interface PosTerminal {
    id: string
    name: string
    terminalNumber: string
    bank?: {
        id: string
        name: string
    }
}

export interface PumperCheque {
    id: string
    chequeNumber: string
    amount: number
    bankId?: string
    bankName?: string
    status?: 'PENDING' | 'CLEARED' | 'BOUNCED'
    receivedFrom: string
    chequeDate?: Date
}

export interface POSSlipEntry {
    id: string
    terminalId: string
    amount: number
    lastFourDigits: string
    cardType: 'VISA' | 'MASTER' | 'AMEX' | 'QR' | 'DIALOG_TOUCH'
    timestamp: Date
    notes?: string
}

export interface MissingSlipEntry {
    id: string
    terminalId: string
    amount: number
    lastFourDigits: string
    timestamp: Date
    notes?: string
}

export interface PumperExpense {
    id: string
    type: 'BANK_DEPOSIT' | 'LOAN_GIVEN' | 'OTHER'
    amount: number
    description?: string
    bankId?: string
    bankName?: string
    accountNumber?: string
    depositedBy?: string
    loanGivenTo?: string
    loanGivenToName?: string
    loanGivenBy?: string
    monthlyRental?: number
}

export interface PumperTestPour {
    id: string
    nozzleId: string
    nozzleNumber?: string
    pumpNumber?: string
    fuelType?: string
    amount: number
    reason: string
    returned: boolean
    notes?: string
    timestamp?: Date
}

export interface PumperBreakdown {
    pumperName: string
    calculatedSales: number
    meterSales: number
    shopSales: number
    declaredAmount: number
    declaredCash: number
    declaredCardAmounts: Record<string, number>
    declaredCreditAmounts: Record<string, number>
    declaredCheque: number
    cheques: PumperCheque[]
    advanceTaken: number
    expenses: PumperExpense[]
    totalExpenses: number
    variance: number
    varianceStatus: 'NORMAL' | 'ADD_TO_SALARY' | 'DEDUCT_FROM_SALARY'
    assignments: Assignment[]
}

export interface Pumper {
    id: string
    name: string
    employeeId?: string
    isActive?: boolean
}

export interface ShopShiftItem {
    id: string
    productId: string
    product: { name: string; unit: string; sellingPrice: number }
    openingStock: number
    addedStock: number
    closingStock?: number
    soldQuantity?: number
    revenue?: number
}

export interface ShopAssignment {
    id: string
    pumperId: string
    pumperName: string
    items: ShopShiftItem[]
}

export interface FuelPrice {
    id: string
    fuelId: string
    price: number
    isActive: boolean
}
