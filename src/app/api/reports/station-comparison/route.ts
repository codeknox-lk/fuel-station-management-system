import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('Station Comparison API called with:', { startDate, endDate })

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    console.log('Date range:', { start, end })

    // Get all active stations
    const stations = await prisma.station.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    })

    console.log(`Found ${stations.length} active stations`)

    // If no stations, return empty array
    if (stations.length === 0) {
      return NextResponse.json([])
    }

    // Get data for each station
    const stationStats = await Promise.all(
      stations.map(async (station) => {
        console.log(`Processing station: ${station.name} (${station.id})`)
        try {
          // Get shifts in date range
          const shifts = await prisma.shift.findMany({
            where: {
              stationId: station.id,
              startTime: {
                gte: start,
                lte: end
              },
              status: 'CLOSED'
            }
          })

          console.log(`  Found ${shifts.length} closed shifts for ${station.name}`)

          // Calculate total sales (cash + POS + credit)
          let totalSales = 0
          let totalVolume = 0

          interface ShiftStatistics {
            cashSales: number
            posSales: number
            creditSales: number
            totalVolume: number
          }

          for (const shift of shifts) {
            const stats = shift.statistics as unknown as ShiftStatistics
            if (stats) {
              totalSales += (stats.cashSales || 0) + (stats.posSales || 0) + (stats.creditSales || 0)
              totalVolume += stats.totalVolume || 0
            }
          }

          console.log(`  Sales: ${totalSales}, Volume: ${totalVolume}`)

          // Get expenses for the station
          const expenses = await prisma.expense.findMany({
            where: {
              stationId: station.id,
              expenseDate: {
                gte: start,
                lte: end
              }
            }
          })

          const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
          console.log(`  Expenses: ${totalExpenses}`)

          // Calculate profit (simplified - sales minus expenses)
          const totalProfit = totalSales - totalExpenses

          // Get unique pumpers count
          const pumpers = await prisma.pumper.findMany({
            where: {
              stationId: station.id,
              isActive: true
            }
          })

          // Calculate average daily sales
          const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1
          const avgDailySales = totalSales / daysCount

          // Calculate profit margin
          const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

          return {
            id: station.id,
            name: station.name,
            totalSales: Math.round(totalSales),
            totalVolume: Math.round(totalVolume),
            totalProfit: Math.round(totalProfit),
            avgDailySales: Math.round(avgDailySales),
            pumperCount: pumpers.length,
            shiftsCount: shifts.length,
            profitMargin: Math.round(profitMargin * 100) / 100
          }
        } catch (stationError) {
          console.error(`Error processing station ${station.name}:`, stationError)
          // Return empty stats for this station
          return {
            id: station.id,
            name: station.name,
            totalSales: 0,
            totalVolume: 0,
            totalProfit: 0,
            avgDailySales: 0,
            pumperCount: 0,
            shiftsCount: 0,
            profitMargin: 0
          }
        }
      })
    )

    console.log('Successfully processed all stations')
    return NextResponse.json(stationStats)
  } catch (error) {
    console.error('Error fetching station comparison data:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : '')
    return NextResponse.json(
      {
        error: 'Failed to fetch station comparison data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
