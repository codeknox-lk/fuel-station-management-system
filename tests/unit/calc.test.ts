import { describe, it, expect } from 'vitest'
import {
    classifyVariance,
    tankBookStock,
    priceAt,
    calculateShiftSummary
} from './calc'
import { Price } from '@/lib/types'

describe('Calculator Logic', () => {

    describe('classifyVariance', () => {
        it('should classify variance as normal if within tolerance', () => {
            const result = classifyVariance(1000, 1010) // -10 variance, within 20
            expect(result.variance).toBe(-10)
            expect(result.isNormal).toBe(true)
        })

        it('should classify variance as abnormal if outside tolerance', () => {
            const result = classifyVariance(1000, 1050) // -50 variance, outside 20
            expect(result.variance).toBe(-50)
            expect(result.isNormal).toBe(false)
        })

        it('should use flat tolerance of 20 by default', () => {
            const result = classifyVariance(1000, 1020)
            expect(result.tolerance).toBe(20)
            expect(result.isNormal).toBe(true)

            const result2 = classifyVariance(1000, 1021)
            expect(result2.isNormal).toBe(false)
        })
    })

    describe('tankBookStock', () => {
        it('should calculate correct book stock', () => {
            // Opening: 1000, Delivery: 500, Outflow: 300, Returns: 50
            // 1000 + 500 - 300 + 50 = 1250
            const result = tankBookStock(1000, 500, 300, 50)
            expect(result).toBe(1250)
        })
    })

    describe('priceAt', () => {
        const prices: Price[] = [
            {
                id: '1',
                fuelId: 'fuel1',
                price: 100,
                effectiveFrom: new Date('2023-01-01T00:00:00Z'),
                effectiveTo: new Date('2023-01-31T23:59:59Z')
            },
            {
                id: '2',
                fuelId: 'fuel1',
                price: 110,
                effectiveFrom: new Date('2023-02-01T00:00:00Z')
                // No effectiveTo means active until 2099
            }
        ] as unknown as Price[]


        it('should return correct price for date range', () => {
            const price = priceAt('fuel1', '2023-01-15T12:00:00Z', prices)
            expect(price).toBe(100)
        })

        it('should return correct price for second date range', () => {
            const price = priceAt('fuel1', '2023-02-15T12:00:00Z', prices)
            expect(price).toBe(110)
        })

        it('should return 0 if no price matches', () => {
            const price = priceAt('fuel1', '2022-12-31T12:00:00Z', prices)
            expect(price).toBe(0)
        })
    })

    describe('calculateShiftSummary', () => {
        it('should sum up declared amounts and calculate variance', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sales = [{ amount: 1000 }, { amount: 2000 }] as any
            const result = calculateShiftSummary(sales, 1000, 1000, 500, 480)
            // Total Sales: 3000
            // Total Declared: 1000 + 1000 + 500 + 480 = 2980
            // Variance: 3000 - 2980 = 20

            expect(result.totalSales).toBe(3000)
            expect(result.totalDeclared).toBe(2980)
            expect(result.variance).toBe(20)
            expect(result.varianceClassification.isNormal).toBe(true) // Exactly 20, which is tolerance
        })

        it('should handle invalid inputs gracefully', () => {
            const result = calculateShiftSummary([], NaN, 0, 0, 0)
            expect(result.totalSales).toBe(0)
            expect(result.totalDeclared).toBe(0)
            expect(result.variance).toBe(0)
        })
    })
})
