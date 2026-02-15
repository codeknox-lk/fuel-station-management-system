import { Assignment, ShopAssignment, PumperBreakdown, PumperCheque, POSSlipEntry } from '../types'

interface CalculationInput {
    assignments: Assignment[]
    shopAssignment: ShopAssignment | null
    shopClosingStocks: Record<string, number>
    pumperDeclaredCash: Record<string, number>
    posSlips: Record<string, POSSlipEntry[]>
    pumperDeclaredCreditAmounts: Record<string, Record<string, number>>
    pumperDeclaredCheques: Record<string, PumperCheque[]>
    prices: Record<string, number>
}

export function calculateBreakdowns({
    assignments,
    shopAssignment,
    shopClosingStocks,
    pumperDeclaredCash,
    posSlips,
    pumperDeclaredCreditAmounts,
    pumperDeclaredCheques,
    prices
}: CalculationInput): PumperBreakdown[] {
    const pumperMap = new Map<string, Assignment[]>()

    // Group assignments by pumper
    assignments.forEach(assignment => {
        if (assignment.pumperName) {
            if (!pumperMap.has(assignment.pumperName)) {
                pumperMap.set(assignment.pumperName, [])
            }
            pumperMap.get(assignment.pumperName)!.push(assignment)
        }
    })

    // Include shop pumper
    if (shopAssignment && !pumperMap.has(shopAssignment.pumperName)) {
        pumperMap.set(shopAssignment.pumperName, [])
    }

    const breakdowns: PumperBreakdown[] = []

    pumperMap.forEach((pumperAssignments, pumperName) => {
        // 1. Meter Sales
        let meterSales = 0
        pumperAssignments.forEach(assignment => {
            const fuelId = assignment.nozzle?.tank?.fuelId
            const price = fuelId ? (prices[fuelId] || 470) : 470
            const delta = Math.max(0, (assignment.endMeterReading || 0) - assignment.startMeterReading)
            meterSales += delta * price
        })

        // 2. Shop Sales
        let shopSales = 0
        if (shopAssignment && pumperName === shopAssignment.pumperName) {
            shopSales = shopAssignment.items.reduce((sum, item) => {
                const closing = shopClosingStocks[item.id] ?? (item.openingStock + item.addedStock)
                const sold = Math.max(0, (item.openingStock + item.addedStock) - closing)
                return sum + (sold * item.product.sellingPrice)
            }, 0)
        }

        const calculatedSales = meterSales + shopSales

        // 3. Declarations
        const cash = pumperDeclaredCash[pumperName] || 0
        const slips = posSlips[pumperName] || []
        const totalPos = slips.reduce((sum, s) => sum + (s.amount || 0), 0)

        const credits = pumperDeclaredCreditAmounts[pumperName] || {}
        const totalCredit = Object.values(credits).reduce((sum, val) => sum + val, 0)

        const cheques = pumperDeclaredCheques[pumperName] || []
        const totalCheque = cheques.reduce((sum, c) => sum + c.amount, 0)

        const totalDeclared = cash + totalPos + totalCredit + totalCheque
        const variance = calculatedSales - totalDeclared
        const varianceStatus = Math.abs(variance) > 50
            ? (variance > 50 ? 'DEDUCT_FROM_SALARY' : 'ADD_TO_SALARY')
            : 'NORMAL'

        breakdowns.push({
            pumperName,
            meterSales,
            shopSales,
            calculatedSales,
            declaredCash: cash,
            declaredCardAmounts: slips.reduce((acc, s) => ({ ...acc, [s.terminalId]: (acc[s.terminalId] || 0) + s.amount }), {} as Record<string, number>),
            declaredCreditAmounts: credits,
            declaredCheque: totalCheque,
            cheques,
            variance,
            varianceStatus,
            assignments: pumperAssignments,
            declaredAmount: totalDeclared,
            advanceTaken: 0, // Simplified for now
            expenses: [],
            totalExpenses: 0
        })
    })

    return breakdowns.sort((a, b) => a.pumperName.localeCompare(b.pumperName))
}
