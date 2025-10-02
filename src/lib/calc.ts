import { Price } from '@/data/prices.seed'

// Tolerance configuration
export const TOLERANCE_CONFIG = {
  percentage: 0.3, // 0.3%
  flatAmount: 200, // Rs. 200
  getTolerance: (salesAmount: number) => Math.max(
    (salesAmount * TOLERANCE_CONFIG.percentage) / 100,
    TOLERANCE_CONFIG.flatAmount
  )
}

export interface MeterReading {
  id: string
  nozzleId: string
  reading: number
  timestamp: string
  type: 'START' | 'AUDIT' | 'END'
}

export interface TestPour {
  id: string
  nozzleId: string
  amount: number // in liters
  timestamp: string
  returned: boolean
}

export interface SalesDelta {
  nozzleId: string
  startReading: number
  endReading: number
  delta: number
  price: number
  amount: number
  startTime: string
  endTime: string
}

/**
 * Get price for a fuel type at a specific datetime
 */
export function priceAt(fuelType: string, datetime: string, prices: Price[]): number {
  const targetDate = new Date(datetime)
  
  const price = prices
    .filter(p => p.fuelType === fuelType)
    .find(p => {
      const effectiveFrom = new Date(p.effectiveFrom)
      const effectiveTo = p.effectiveTo ? new Date(p.effectiveTo) : new Date('2099-12-31T23:59:59Z')
      return targetDate >= effectiveFrom && targetDate <= effectiveTo
    })
  
  return price?.price || 0
}

/**
 * Split sales interval by price changes
 */
export function splitIntervalByPrice(
  startTime: string,
  endTime: string,
  prices: Price[],
  fuelType: string
): Array<{ startTime: string; endTime: string; price: number }> {
  const intervals: Array<{ startTime: string; endTime: string; price: number }> = []
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  // Get all price changes in the interval
  const relevantPrices = prices
    .filter(p => p.fuelType === fuelType)
    .filter(p => {
      const effectiveFrom = new Date(p.effectiveFrom)
      const effectiveTo = p.effectiveTo ? new Date(p.effectiveTo) : new Date('2099-12-31T23:59:59Z')
      return effectiveFrom <= end && effectiveTo >= start
    })
    .sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())
  
  let currentTime = start
  let currentPriceIndex = 0
  
  while (currentTime < end) {
    const nextPriceChange = relevantPrices[currentPriceIndex + 1]
    const nextChangeTime = nextPriceChange ? new Date(nextPriceChange.effectiveFrom) : end
    
    const intervalEnd = nextChangeTime > end ? end : nextChangeTime
    
    intervals.push({
      startTime: currentTime.toISOString(),
      endTime: intervalEnd.toISOString(),
      price: relevantPrices[currentPriceIndex]?.price || 0
    })
    
    currentTime = intervalEnd
    currentPriceIndex++
  }
  
  return intervals
}

/**
 * Compute sales from meter deltas minus test pours
 */
export function computeSalesFromDeltas(
  startReadings: MeterReading[],
  auditReadings: MeterReading[],
  endReadings: MeterReading[],
  testPours: TestPour[],
  prices: Price[]
): SalesDelta[] {
  const sales: SalesDelta[] = []
  
  // Group readings by nozzle
  const readingsByNozzle = new Map<string, { start?: MeterReading; audits: MeterReading[]; end?: MeterReading }>()
  
  startReadings.forEach(reading => {
    if (!readingsByNozzle.has(reading.nozzleId)) {
      readingsByNozzle.set(reading.nozzleId, { audits: [] })
    }
    readingsByNozzle.get(reading.nozzleId)!.start = reading
  })
  
  auditReadings.forEach(reading => {
    if (!readingsByNozzle.has(reading.nozzleId)) {
      readingsByNozzle.set(reading.nozzleId, { audits: [] })
    }
    readingsByNozzle.get(reading.nozzleId)!.audits.push(reading)
  })
  
  endReadings.forEach(reading => {
    if (!readingsByNozzle.has(reading.nozzleId)) {
      readingsByNozzle.set(reading.nozzleId, { audits: [] })
    }
    readingsByNozzle.get(reading.nozzleId)!.end = reading
  })
  
  // Calculate sales for each nozzle
  readingsByNozzle.forEach((readings, nozzleId) => {
    if (!readings.start || !readings.end) return
    
    const startReading = readings.start.reading
    const endReading = readings.end.reading
    const delta = endReading - startReading
    
    // Get fuel type from nozzle (would need to look up from tank)
    const fuelType = 'PETROL_92' // This would be looked up from nozzle -> tank -> fuelType
    const price = priceAt(fuelType, readings.start.timestamp, prices)
    
    // Subtract test pours for this nozzle
    const nozzleTestPours = testPours.filter(tp => tp.nozzleId === nozzleId && tp.returned)
    const testPourAmount = nozzleTestPours.reduce((sum, tp) => sum + tp.amount, 0)
    
    const netDelta = delta - testPourAmount
    const amount = netDelta * price
    
    sales.push({
      nozzleId,
      startReading,
      endReading,
      delta: netDelta,
      price,
      amount,
      startTime: readings.start.timestamp,
      endTime: readings.end.timestamp
    })
  })
  
  return sales
}

/**
 * Calculate tank book stock
 */
export function tankBookStock(
  openingStock: number,
  deliveries: number,
  nozzleOutflow: number,
  testReturns: number
): number {
  return openingStock + deliveries - nozzleOutflow + testReturns
}

/**
 * Classify variance as normal or suspicious
 */
export function classifyVariance(
  totalSales: number,
  declaredAmount: number,
  tolerancePercentage: number = TOLERANCE_CONFIG.percentage,
  toleranceFlat: number = TOLERANCE_CONFIG.flatAmount
): {
  variance: number
  variancePercentage: number
  isNormal: boolean
  tolerance: number
} {
  const variance = totalSales - declaredAmount
  const variancePercentage = totalSales > 0 ? (Math.abs(variance) / totalSales) * 100 : 0
  const tolerance = Math.max(
    (totalSales * tolerancePercentage) / 100,
    toleranceFlat
  )
  
  return {
    variance,
    variancePercentage,
    isNormal: Math.abs(variance) <= tolerance,
    tolerance
  }
}

/**
 * Calculate daily profit
 */
export function calculateDailyProfit(
  sales: number,
  expenses: number,
  loansOut: number,
  creditRepaymentsCash: number,
  chequeEncashments: number,
  deposits: number
): number {
  return sales - expenses - loansOut + creditRepaymentsCash + chequeEncashments - deposits
}

/**
 * Calculate tank variance (book stock vs dip stock)
 */
export function calculateTankVariance(
  bookStock: number,
  dipStock: number,
  tolerancePercentage: number = 0.5 // 0.5% tolerance for tank variance
): {
  variance: number
  variancePercentage: number
  isWithinTolerance: boolean
  tolerance: number
} {
  const variance = bookStock - dipStock
  const variancePercentage = bookStock > 0 ? (Math.abs(variance) / bookStock) * 100 : 0
  const tolerance = (bookStock * tolerancePercentage) / 100
  
  return {
    variance,
    variancePercentage,
    isWithinTolerance: Math.abs(variance) <= tolerance,
    tolerance
  }
}

/**
 * Calculate shift summary
 */
export function calculateShiftSummary(
  sales: SalesDelta[],
  cashAmount: number,
  cardAmount: number,
  creditAmount: number,
  chequeAmount: number
): {
  totalSales: number
  totalDeclared: number
  variance: number
  varianceClassification: ReturnType<typeof classifyVariance>
} {
  const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0)
  const totalDeclared = cashAmount + cardAmount + creditAmount + chequeAmount
  const varianceClassification = classifyVariance(totalSales, totalDeclared)
  
  return {
    totalSales,
    totalDeclared,
    variance: totalSales - totalDeclared,
    varianceClassification
  }
}
