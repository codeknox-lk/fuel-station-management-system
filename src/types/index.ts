export * from './db'

export interface Station {
    id: string
    name: string
    address?: string
    city?: string
    isActive?: boolean
    deliveryToleranceCm?: number
    salesTolerance?: number
    maxDipVariancePercent?: number
    maxDipVarianceLiters?: number
    allowedShiftVariance?: number
    tankWarningThreshold?: number
    tankCriticalThreshold?: number
    creditOverdueDays?: number
    defaultShopReorderLevel?: number
    maxShiftDurationHours?: number
    defaultAdvanceLimit?: number
    defaultHolidayAllowance?: number
    maxWaterIngressMm?: number
    createdAt?: string
    updatedAt?: string
}
export interface Fuel {
    id: string
    code: string
    name: string
    category: string
    description?: string | null
    icon?: string | null
    isActive: boolean
    sortOrder: number
}

export interface Price {
    id: string
    fuelId: string
    fuel?: Fuel
    price: number // per liter in LKR
    effectiveFrom: string // ISO datetime
    effectiveTo?: string // ISO datetime, null for current price
    isActive: boolean
    createdAt: string
    updatedAt: string
}
