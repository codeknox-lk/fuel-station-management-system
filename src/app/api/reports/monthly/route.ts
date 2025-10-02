import { NextRequest, NextResponse } from 'next/server'
import { getSafeSummary } from '@/data/safeLedger.seed'
import { getCreditAging } from '@/data/credit.seed'
import { getTankVarianceSummary } from '@/data/tankOps.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId') || '1'
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7) // YYYY-MM

    // Mock monthly data - in real app, this would aggregate daily data
    const monthlyData = {
      month,
      stationId,
      summary: {
        totalSales: 45000000, // 45M LKR
        totalExpenses: 2500000, // 2.5M LKR
        totalProfit: 42500000, // 42.5M LKR
        profitMargin: 94.4,
        totalDeposits: 40000000, // 40M LKR
        totalLoansGiven: 500000, // 500K LKR
        totalLoansRepaid: 300000, // 300K LKR
        totalCreditSales: 2000000, // 2M LKR
        totalCreditRepayments: 1800000, // 1.8M LKR
        totalChequeReceived: 1500000, // 1.5M LKR
        totalChequeEncashed: 1200000 // 1.2M LKR
      },
      trends: {
        salesByDay: Array.from({ length: 30 }, (_, i) => ({
          date: `${month}-${String(i + 1).padStart(2, '0')}`,
          sales: Math.floor(Math.random() * 2000000) + 1000000,
          profit: Math.floor(Math.random() * 1800000) + 900000
        })),
        profitTrend: Array.from({ length: 30 }, (_, i) => ({
          date: `${month}-${String(i + 1).padStart(2, '0')}`,
          profit: Math.floor(Math.random() * 2000000) + 1000000
        })),
        tankVarianceTrend: Array.from({ length: 30 }, (_, i) => ({
          date: `${month}-${String(i + 1).padStart(2, '0')}`,
          variance: Math.floor(Math.random() * 200) - 100
        }))
      },
      credit: {
        aging: getCreditAging(),
        totalOutstanding: 200000, // 200K LKR
        overdueAmount: 50000, // 50K LKR
        averageDaysOutstanding: 15
      },
      tanks: {
        totalVariance: -500, // 500L variance
        variancePercentage: 0.5,
        lowStockAlerts: 2,
        deliveryCount: 12
      }
    }

    return NextResponse.json(monthlyData)
  } catch (error) {
    console.error('Error generating monthly report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
