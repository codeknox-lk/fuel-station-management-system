import { Price } from '@/types'
import { Decimal } from 'decimal.js'

// Tolerance configuration
export const TOLERANCE_CONFIG = {
  flatAmount: new Decimal(20), // Rs. 20 flat tolerance for any sale
  getTolerance: () => TOLERANCE_CONFIG.flatAmount
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
export function priceAt(fuelId: string, datetime: string, prices: Price[]): Decimal {
  const targetDate = new Date(datetime)

  const priceObj = prices
    .filter(p => p.fuelId === fuelId || p.fuel?.name === fuelId)
    .find(p => {
      const effectiveFrom = new Date(p.effectiveFrom)
      const effectiveTo = p.effectiveTo ? new Date(p.effectiveTo) : new Date('2099-12-31T23:59:59Z')
      return targetDate >= effectiveFrom && targetDate <= effectiveTo
    })

  return new Decimal(priceObj?.price || 0)
}

/**
 * Calculate tank book stock
 */
export function tankBookStock(
  openingStock: number | Decimal,
  deliveries: number | Decimal,
  nozzleOutflow: number | Decimal,
  testReturns: number | Decimal
): Decimal {
  return new Decimal(openingStock)
    .plus(deliveries)
    .minus(nozzleOutflow)
    .plus(testReturns)
}

/**
 * Classify variance as normal or suspicious
 */
export function classifyVariance(
  totalSales: number | Decimal,
  declaredAmount: number | Decimal,
  toleranceFlat: number | Decimal = TOLERANCE_CONFIG.flatAmount
): {
  variance: number
  variancePercentage: number
  isNormal: boolean
  tolerance: number
} {
  const sales = new Decimal(totalSales)
  const declared = new Decimal(declaredAmount)
  const variance = sales.minus(declared)

  const variancePercentage = sales.gt(0)
    ? variance.abs().div(sales).times(100).toNumber()
    : 0

  const tolerance = new Decimal(toleranceFlat)

  return {
    variance: variance.toNumber(),
    variancePercentage,
    isNormal: variance.abs().lte(tolerance),
    tolerance: tolerance.toNumber()
  }
}

/**
 * Calculate daily profit
 */
export function calculateDailyProfit(
  sales: number | Decimal,
  expenses: number | Decimal,
  loansOut: number | Decimal,
  creditRepaymentsCash: number | Decimal,
  chequeEncashments: number | Decimal,
  deposits: number | Decimal
): Decimal {
  return new Decimal(sales)
    .minus(expenses)
    .minus(loansOut)
    .plus(creditRepaymentsCash)
    .plus(chequeEncashments)
    .minus(deposits)
}

/**
 * Calculate tank variance (book stock vs dip stock)
 */
export function calculateTankVariance(
  bookStock: number | Decimal,
  dipStock: number | Decimal,
  tolerancePercentage: number | Decimal = 0.5
): {
  variance: number
  variancePercentage: number
  isWithinTolerance: boolean
  tolerance: number
} {
  const book = new Decimal(bookStock)
  const dip = new Decimal(dipStock)
  const variance = book.minus(dip)

  const variancePercentage = book.gt(0)
    ? variance.abs().div(book).times(100).toNumber()
    : 0

  const tolerance = book.times(tolerancePercentage).div(100)

  return {
    variance: variance.toNumber(),
    variancePercentage,
    isWithinTolerance: variance.abs().lte(tolerance),
    tolerance: tolerance.toNumber()
  }
}

/**
 * Calculate shift summary
 */
export function calculateShiftSummary(
  sales: SalesDelta[],
  cashAmount: number | Decimal,
  cardAmount: number | Decimal,
  creditAmount: number | Decimal,
  chequeAmount: number | Decimal
): {
  totalSales: number
  totalDeclared: number
  variance: number
  varianceClassification: ReturnType<typeof classifyVariance>
} {
  const totalSalesDec = sales.reduce((sum, sale) => {
    return sum.plus(new Decimal(sale.amount || 0))
  }, new Decimal(0))

  const totalDeclaredDec = new Decimal(cashAmount || 0)
    .plus(cardAmount || 0)
    .plus(creditAmount || 0)
    .plus(chequeAmount || 0)

  const varianceClassification = classifyVariance(totalSalesDec, totalDeclaredDec)

  return {
    totalSales: totalSalesDec.toNumber(),
    totalDeclared: totalDeclaredDec.toNumber(),
    variance: totalSalesDec.minus(totalDeclaredDec).toNumber(),
    varianceClassification
  }
}
