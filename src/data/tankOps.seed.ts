export interface TankDip {
  id: string
  tankId: string
  dipReading: number // in liters
  bookStock: number // calculated book stock
  variance: number // book stock - dip reading
  variancePercentage: number
  isWithinTolerance: boolean
  dipDate: string
  performedBy: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Delivery {
  id: string
  tankId: string
  supplierName: string
  invoiceNumber: string
  invoiceLiters: number
  measuredLiters: number
  variance: number
  pricePerLiter: number
  totalAmount: number
  deliveryDate: string
  receivedBy: string
  dipBefore: number
  dipAfter: number
  proofPhoto?: string
  createdAt: string
  updatedAt: string
}

export const tankDips: TankDip[] = [
  {
    id: '1',
    tankId: '1',
    dipReading: 8500,
    bookStock: 8600,
    variance: 100,
    variancePercentage: 1.16,
    isWithinTolerance: false,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager John',
    notes: 'Slight variance detected',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '2',
    tankId: '2',
    dipReading: 7200,
    bookStock: 7200,
    variance: 0,
    variancePercentage: 0,
    isWithinTolerance: true,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager John',
    notes: 'Perfect match',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '3',
    tankId: '3',
    dipReading: 1800,
    bookStock: 1850,
    variance: 50,
    variancePercentage: 2.7,
    isWithinTolerance: false,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager John',
    notes: 'Tank level low - needs refill',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '4',
    tankId: '4',
    dipReading: 4800,
    bookStock: 4800,
    variance: 0,
    variancePercentage: 0,
    isWithinTolerance: true,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager John',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '5',
    tankId: '5',
    dipReading: 9200,
    bookStock: 9200,
    variance: 0,
    variancePercentage: 0,
    isWithinTolerance: true,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager Mike',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  },
  {
    id: '6',
    tankId: '6',
    dipReading: 10800,
    bookStock: 10800,
    variance: 0,
    variancePercentage: 0,
    isWithinTolerance: true,
    dipDate: '2024-10-01T18:00:00Z',
    performedBy: 'Manager Mike',
    createdAt: '2024-10-01T18:00:00Z',
    updatedAt: '2024-10-01T18:00:00Z'
  }
]

export const deliveries: Delivery[] = [
  {
    id: '1',
    tankId: '1',
    supplierName: 'Ceylon Petroleum Corporation',
    invoiceNumber: 'CPC-2024-001',
    invoiceLiters: 5000,
    measuredLiters: 4950,
    variance: -50,
    pricePerLiter: 450,
    totalAmount: 2227500,
    deliveryDate: '2024-09-30T14:00:00Z',
    receivedBy: 'Manager John',
    dipBefore: 3500,
    dipAfter: 8450,
    proofPhoto: 'delivery_1.jpg',
    createdAt: '2024-09-30T14:00:00Z',
    updatedAt: '2024-09-30T14:00:00Z'
  },
  {
    id: '2',
    tankId: '2',
    supplierName: 'Ceylon Petroleum Corporation',
    invoiceNumber: 'CPC-2024-002',
    invoiceLiters: 3000,
    measuredLiters: 3000,
    variance: 0,
    pricePerLiter: 500,
    totalAmount: 1500000,
    deliveryDate: '2024-09-30T15:00:00Z',
    receivedBy: 'Manager John',
    dipBefore: 4200,
    dipAfter: 7200,
    proofPhoto: 'delivery_2.jpg',
    createdAt: '2024-09-30T15:00:00Z',
    updatedAt: '2024-09-30T15:00:00Z'
  },
  {
    id: '3',
    tankId: '3',
    supplierName: 'Indian Oil Corporation',
    invoiceNumber: 'IOC-2024-001',
    invoiceLiters: 8000,
    measuredLiters: 7950,
    variance: -50,
    pricePerLiter: 440,
    totalAmount: 3498000,
    deliveryDate: '2024-09-29T10:00:00Z',
    receivedBy: 'Manager Jane',
    dipBefore: 4000,
    dipAfter: 11950,
    proofPhoto: 'delivery_3.jpg',
    createdAt: '2024-09-29T10:00:00Z',
    updatedAt: '2024-09-29T10:00:00Z'
  },
  {
    id: '4',
    tankId: '5',
    supplierName: 'Ceylon Petroleum Corporation',
    invoiceNumber: 'CPC-2024-003',
    invoiceLiters: 4000,
    measuredLiters: 4000,
    variance: 0,
    pricePerLiter: 450,
    totalAmount: 1800000,
    deliveryDate: '2024-09-30T16:00:00Z',
    receivedBy: 'Manager Mike',
    dipBefore: 5200,
    dipAfter: 9200,
    proofPhoto: 'delivery_4.jpg',
    createdAt: '2024-09-30T16:00:00Z',
    updatedAt: '2024-09-30T16:00:00Z'
  }
]

export function getTankDips(): TankDip[] {
  return tankDips
}

export function getTankDipsByTankId(tankId: string): TankDip[] {
  return tankDips.filter(dip => dip.tankId === tankId)
}

export function getTankDipsByDateRange(startDate: string, endDate: string): TankDip[] {
  return tankDips.filter(dip => {
    const dipDate = new Date(dip.dipDate)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return dipDate >= start && dipDate <= end
  })
}

export function getTankDipById(id: string): TankDip | undefined {
  return tankDips.find(dip => dip.id === id)
}

export function getDeliveries(): Delivery[] {
  return deliveries
}

export function getDeliveriesByTankId(tankId: string): Delivery[] {
  return deliveries.filter(delivery => delivery.tankId === tankId)
}

export function getDeliveriesByDateRange(startDate: string, endDate: string): Delivery[] {
  return deliveries.filter(delivery => {
    const deliveryDate = new Date(delivery.deliveryDate)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return deliveryDate >= start && deliveryDate <= end
  })
}

export function getDeliveryById(id: string): Delivery | undefined {
  return deliveries.find(delivery => delivery.id === id)
}

export function getTankVarianceSummary(tankId: string): {
  tankId: string
  totalDeliveries: number
  totalDeliveredLiters: number
  totalVariance: number
  averageVariancePercentage: number
  lastDipReading: number
  lastBookStock: number
  currentVariance: number
} {
  const tankDeliveries = getDeliveriesByTankId(tankId)
  const tankDipsForTank = getTankDipsByTankId(tankId)
  const lastDip = tankDipsForTank.sort((a, b) => 
    new Date(b.dipDate).getTime() - new Date(a.dipDate).getTime()
  )[0]

  const totalDeliveredLiters = tankDeliveries.reduce((sum, delivery) => sum + delivery.measuredLiters, 0)
  const totalVariance = tankDeliveries.reduce((sum, delivery) => sum + delivery.variance, 0)
  const averageVariancePercentage = tankDeliveries.length > 0 
    ? tankDeliveries.reduce((sum, delivery) => sum + Math.abs(delivery.variance), 0) / tankDeliveries.length / totalDeliveredLiters * 100
    : 0

  return {
    tankId,
    totalDeliveries: tankDeliveries.length,
    totalDeliveredLiters,
    totalVariance,
    averageVariancePercentage,
    lastDipReading: lastDip?.dipReading || 0,
    lastBookStock: lastDip?.bookStock || 0,
    currentVariance: lastDip?.variance || 0
  }
}
