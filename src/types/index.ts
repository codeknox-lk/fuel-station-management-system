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
