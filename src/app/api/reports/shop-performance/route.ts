import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface ProductStat {
    productId: string
    productName: string
    category: string
    quantitySold: number
    revenue: number
    cost: number
    profit: number
    margin: number
}

interface CategoryStat {
    category: string
    revenue: number
    profit: number
    itemsSold: number
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')
        const startDateStr = searchParams.get('startDate')
        const endDateStr = searchParams.get('endDate')

        if (!stationId) {
            return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
        }

        const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const endDate = endDateStr ? new Date(endDateStr) : new Date()

        // 1. Get all shop sales for the period
        const sales = await prisma.shopSale.findMany({
            where: {
                assignment: {
                    shift: {
                        stationId,
                        endTime: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                }
            },
            include: {
                product: true,
                assignment: {
                    include: {
                        shift: true
                    }
                }
            }
        })

        // 2. Get all wastage for the period
        const wastage = await prisma.shopWastage.findMany({
            where: {
                product: {
                    stationId
                },
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                product: true
            }
        })

        // 3. Get all current products and their batches for valuation
        const products = await prisma.shopProduct.findMany({
            where: {
                stationId,
                isActive: true
            },
            include: {
                batches: {
                    where: {
                        currentQuantity: { gt: 0 }
                    }
                }
            }
        })

        // 4. Calculate Inventory Valuation
        let totalValuation = 0
        const categoryValuation: { [key: string]: number } = {}

        products.forEach(product => {
            const productValuation = product.batches.reduce((sum, batch) => sum + (batch.currentQuantity * batch.costPrice), 0)
            totalValuation += productValuation

            const category = product.category || 'Other'
            categoryValuation[category] = (categoryValuation[category] || 0) + productValuation
        })

        // 5. Aggregate Sales Data by Product
        const productStats: { [productId: string]: ProductStat } = {}

        sales.forEach(sale => {
            if (!productStats[sale.productId]) {
                productStats[sale.productId] = {
                    productId: sale.productId,
                    productName: sale.product.name,
                    category: sale.product.category || 'Other',
                    quantitySold: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    margin: 0
                }
            }

            productStats[sale.productId].quantitySold += sale.quantity
            productStats[sale.productId].revenue += sale.totalAmount
            productStats[sale.productId].cost += sale.costPrice * sale.quantity
        })

        // 5.5 Generate chronological daily sales map
        const dailySalesMap = new Map<string, Map<string, number>>() // date -> productName -> revenue
        const currD = new Date(startDate)
        while (currD <= endDate) {
            const dateKey = `${currD.getFullYear()}-${String(currD.getMonth() + 1).padStart(2, '0')}-${String(currD.getDate()).padStart(2, '0')}`
            dailySalesMap.set(dateKey, new Map())
            currD.setDate(currD.getDate() + 1)
        }

        const allSoldProductNames = new Set<string>()

        sales.forEach(sale => {
            const shiftEndTime = sale.assignment.shift.endTime || sale.assignment.shift.startTime
            const sDate = new Date(shiftEndTime)
            const dateKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${String(sDate.getDate()).padStart(2, '0')}`

            if (dailySalesMap.has(dateKey)) {
                const dayMap = dailySalesMap.get(dateKey)!
                const productName = sale.product.name
                allSoldProductNames.add(productName)

                const currentAmount = dayMap.get(productName) || 0
                dayMap.set(productName, currentAmount + sale.totalAmount)
            }
        })

        const dailySales = Array.from(dailySalesMap.entries()).map(([dateKey, dayMap]) => {
            const salesRecord: Record<string, number> = {}
            let totalSales = 0

            allSoldProductNames.forEach(pName => {
                const amount = dayMap.get(pName) || 0
                salesRecord[pName] = amount
                totalSales += amount
            })

            return {
                date: dateKey,
                day: parseInt(dateKey.split('-')[2]),
                sales: salesRecord,
                totalSales
            }
        })

        const totalsByProduct: Record<string, number> = {}
        allSoldProductNames.forEach(pName => {
            totalsByProduct[pName] = dailySales.reduce((sum, day) => sum + (day.sales[pName] || 0), 0)
        })

        // 6. Subtract Wastage from Profit (or record as loss)
        const totalWastageLoss = wastage.reduce((sum, w) => sum + (w.costPrice * w.quantity), 0)

        // 7. Finalize product stats
        const performance = Object.values(productStats).map(stat => ({
            ...stat,
            profit: stat.revenue - stat.cost,
            margin: stat.revenue > 0 ? ((stat.revenue - stat.cost) / stat.revenue) * 100 : 0
        })).sort((a, b) => b.profit - a.profit)

        // 8. Category Breakdown
        const categoryStats: { [key: string]: CategoryStat } = {}
        performance.forEach(p => {
            if (!categoryStats[p.category]) {
                categoryStats[p.category] = { category: p.category, revenue: 0, profit: 0, itemsSold: 0 }
            }
            categoryStats[p.category].revenue += p.revenue
            categoryStats[p.category].profit += p.profit
            categoryStats[p.category].itemsSold += p.quantitySold
        })

        // 9. Format Wastage Breakdown
        const wastageBreakdown = wastage.map(w => ({
            id: w.id,
            productName: w.product.name,
            quantity: w.quantity,
            cost: w.costPrice * w.quantity,
            reason: w.reason,
            date: w.timestamp.toISOString()
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // 10. Low Stock Alerts
        const lowStockAlerts = products
            .map(p => {
                const currentTotal = p.batches.reduce((sum, b) => sum + b.currentQuantity, 0)
                return {
                    productId: p.id,
                    productName: p.name,
                    category: p.category,
                    currentQuantity: currentTotal,
                    threshold: 10 // Arbitrary threshold for now
                }
            })
            .filter(p => p.currentQuantity <= p.threshold)
            .sort((a, b) => a.currentQuantity - b.currentQuantity)

        return NextResponse.json({
            summary: {
                totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
                totalCost: sales.reduce((sum, s) => sum + (s.costPrice * s.quantity), 0),
                totalProfit: sales.reduce((sum, s) => sum + s.totalAmount - (s.costPrice * s.quantity), 0) - totalWastageLoss,
                totalWastageLoss,
                inventoryValuation: totalValuation
            },
            performance,
            categories: Object.values(categoryStats),
            valuationBreakdown: categoryValuation,
            dailySales,
            totalsByProduct,
            productNames: Array.from(allSoldProductNames),
            wastageBreakdown,
            lowStockAlerts
        })

    } catch (error) {
        console.error('Error fetching shop performance:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
