import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Find the first active station
    const station = await prisma.station.findFirst({
        where: { isActive: true }
    })

    if (!station) {
        console.error("No active station found in database.")
        return
    }

    // Define verification period (January 2026 as per simulation data)
    const startDate = new Date('2026-01-01T00:00:00.000Z')
    const endDate = new Date('2026-01-31T23:59:59.999Z')

    console.log(`\n=== FINANCIAL INTEGRITY VERIFICATION ===`)
    console.log(`Station: ${station.name}`)
    console.log(`Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // 1. Verify Bank Deposits
    console.log(`\n--- 1. BANK DEPOSITS ---`)
    const deposits = await prisma.deposit.aggregate({
        where: {
            stationId: station.id,
            depositDate: {
                gte: startDate,
                lte: endDate
            }
        },
        _sum: { amount: true },
        _count: true
    })

    const totalDeposits = deposits._sum.amount || 0
    console.log(`Record Count: ${deposits._count}`)
    console.log(`Total Amount (DB Aggregation): Rs. ${totalDeposits.toLocaleString()}`)

    // 2. Verify Credit Sales
    console.log(`\n--- 2. CREDIT SALES ---`)
    // Get credit sales linked to shifts in this period 
    // (Note: Reports usually filter by shift time)
    const creditSales = await prisma.creditSale.aggregate({
        where: {
            shift: {
                stationId: station.id,
                startTime: {
                    gte: startDate,
                    lte: endDate
                }
            }
        },
        _sum: { amount: true },
        _count: true
    })

    const totalCreditSales = creditSales._sum.amount || 0
    console.log(`Record Count: ${creditSales._count}`)
    console.log(`Total Amount (DB Aggregation): Rs. ${totalCreditSales.toLocaleString()}`)

    // 3. Verify Shift Sales vs Declared
    console.log(`\n--- 3. SHIFT SALES CONSISTENCY ---`)
    const shifts = await prisma.shift.findMany({
        where: {
            stationId: station.id,
            startTime: {
                gte: startDate,
                lte: endDate
            },
            status: 'CLOSED'
        },
        select: {
            id: true,
            startTime: true,
            declaredAmounts: true,
            statistics: true
        }
    })

    let totalShiftSalesParams = 0
    let totalDeclaredParams = 0

    for (const shift of shifts) {
        const stats = shift.statistics as any
        const declared = shift.declaredAmounts as any

        if (stats && declared) {
            totalShiftSalesParams += (stats.totalSales || 0)
            totalDeclaredParams += (declared.total || 0)
        }
    }

    console.log(`Analyzed Shifts: ${shifts.length}`)
    console.log(`Total Shift Sales (Calculated): Rs. ${totalShiftSalesParams.toLocaleString()}`)
    console.log(`Total Declared (Cash/Card/Credit): Rs. ${totalDeclaredParams.toLocaleString()}`)
    console.log(`Variance: Rs. ${(totalShiftSalesParams - totalDeclaredParams).toLocaleString()}`)

    console.log(`\n=== VERIFICATION COMPLETE ===`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
