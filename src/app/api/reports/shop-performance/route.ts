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
                product: true
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
            valuationBreakdown: categoryValuation
        })

    } catch (error) {
        console.error('Error fetching shop performance:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
