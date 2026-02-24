export type DeliveryData = {
    // Metadata
    deliveryId?: string // Set after Stage 1

    // Stage 1
    stationId: string
    tankId: string
    supplier: string
    supplierId?: string
    invoiceNumber: string
    invoiceQuantity: number
    beforeDipReading?: number
    waterLevelBefore?: number
    beforeMeterReadings?: Record<string, number> // NozzleId -> Reading
    deliveryStartTime?: Date // Implicit

    // Stage 3
    afterDipReading?: number
    waterLevelAfter?: number
    afterMeterReadings?: Record<string, number>
    verificationStatus?: 'PENDING' | 'VERIFIED' | 'DISCREPANCY'

    // Stage 4
    costPrice?: number
    totalCost?: number
    paymentType?: 'CASH' | 'CHEQUE' | 'CREDIT'
    chequeNumber?: string
    bankId?: string
    chequeDate?: Date
}
