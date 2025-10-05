import { NextRequest, NextResponse } from 'next/server'
import { getSafeSummary } from '@/data/safeLedger.seed'
import { getCreditAging } from '@/data/credit.seed'
import { getTankVarianceSummary } from '@/data/tankOps.seed'
import { calculateDailyProfit } from '@/lib/calc'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId') || '1'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Get safe summary
    const safeSummary = getSafeSummary(stationId, date)
    
    // Get credit aging
    const creditAging = getCreditAging()
    
    // Get tank variance summary (mock data for now)
    const tankVariances = [
      getTankVarianceSummary('1'),
      getTankVarianceSummary('2'),
      getTankVarianceSummary('3'),
      getTankVarianceSummary('4')
    ]

    // Calculate daily profit
    const dailyProfit = calculateDailyProfit(
      safeSummary.totalCashIn,
      safeSummary.totalExpenses,
      safeSummary.totalLoansGiven,
      safeSummary.totalCreditRepayments,
      safeSummary.totalChequeEncashed,
      safeSummary.totalDeposits
    )

    const report = {
      date,
      stationId,
      safe: safeSummary,
      credit: {
        aging: creditAging,
        totalOutstanding: creditAging.reduce((sum, customer) => sum + customer.currentBalance, 0)
      },
      tanks: {
        variances: tankVariances,
        totalVariance: tankVariances.reduce((sum, tank) => sum + tank.currentVariance, 0)
      },
      profit: {
        daily: dailyProfit,
        sales: safeSummary.totalCashIn,
        expenses: safeSummary.totalExpenses,
        netMargin: safeSummary.totalCashIn > 0 ? (dailyProfit / safeSummary.totalCashIn) * 100 : 0
      }
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

