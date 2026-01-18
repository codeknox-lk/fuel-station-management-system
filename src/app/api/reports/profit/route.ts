import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const month = searchParams.get('month') // Format: YYYY-MM
    const year = searchParams.get('year')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    const startOfMonth = new Date(yearNum, monthNum - 1, 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999)

    // Get all closed shifts for the month
    // Use endTime to capture shifts that ended in this month (even if started previous month)
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED',
        endTime: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        assignments: {
          where: {
            status: 'CLOSED',
            endMeterReading: { not: null }
          },
          include: {
            nozzle: {
              include: {
                tank: true
              }
            }
          }
        }
      }
    })

    // Get all expenses for the month
    const expenses = await prisma.expense.findMany({
      where: {
        stationId,
        expenseDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    // Get all prices
    const prices = await prisma.price.findMany({
      where: {
        stationId,
        isActive: true
      },
      orderBy: { effectiveDate: 'desc' }
    })

    // Calculate daily profit data
    const daysInMonth = endOfMonth.getDate()
    const dailyData = await Promise.all(Array.from({ length: daysInMonth }, async (_, i) => {
      const dayDate = new Date(yearNum, monthNum - 1, i + 1)
      const dayStart = new Date(dayDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayDate)
      dayEnd.setHours(23, 59, 59, 999)

      // Filter shifts for this day - use endTime to capture shifts that ended on this day
      const dayShifts = shifts.filter(s => {
        const shiftEndDate = s.endTime ? new Date(s.endTime) : new Date(s.startTime)
        return shiftEndDate >= dayStart && shiftEndDate <= dayEnd
      })

      // Calculate revenue from shifts
      let revenue = 0
      for (const shift of dayShifts) {
        for (const assignment of shift.assignments) {
          // Only process closed assignments with valid meter readings
          if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
            let litersSold = assignment.endMeterReading - assignment.startMeterReading
            // Handle meter rollover
            if (litersSold < 0) {
              const METER_MAX = 99999
              if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
                litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
              } else {
                continue // Skip invalid readings (not a rollover)
              }
            }
            
            if (litersSold <= 0) continue

            const fuelType = assignment.nozzle?.tank?.fuelType
            if (!fuelType) continue

            // Get price effective at shift end time (when shift closed)
            const price = prices.find(p => 
              p.fuelType === fuelType && 
              new Date(p.effectiveDate) <= (shift.endTime || shift.startTime)
            ) || prices.find(p => p.fuelType === fuelType)

            const pricePerLiter = price ? price.price : 0
            revenue += litersSold * pricePerLiter
          }
        }
      }

      // Get expenses for this day
      const dayExpenses = expenses
        .filter(e => {
          const expDate = new Date(e.expenseDate)
          return expDate >= dayStart && expDate <= dayEnd
        })
        .reduce((sum, exp) => sum + exp.amount, 0)

      const profit = revenue - dayExpenses
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0

      return {
        day: i + 1,
        date: `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
        revenue: Math.round(revenue),
        expenses: Math.round(dayExpenses),
        profit: Math.round(profit),
        margin: Math.round(margin * 100) / 100
      }
    }))

    // Calculate totals
    const totalRevenue = dailyData.reduce((sum, day) => sum + day.revenue, 0)
    const totalExpenses = dailyData.reduce((sum, day) => sum + day.expenses, 0)
    const totalProfit = totalRevenue - totalExpenses
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Get revenue breakdown by fuel type
    const revenueByFuelType = new Map<string, number>()
    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        // Only process closed assignments with valid meter readings
        if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
          let litersSold = assignment.endMeterReading - assignment.startMeterReading
          if (litersSold < 0) {
            const METER_MAX = 99999
            if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
              litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
            } else {
              continue // Skip invalid readings (not a rollover)
            }
          }
          
          if (litersSold <= 0) continue

          const fuelType = assignment.nozzle?.tank?.fuelType
          if (!fuelType) continue

          const price = prices.find(p => 
            p.fuelType === fuelType && 
            new Date(p.effectiveDate) <= (shift.endTime || shift.startTime)
          ) || prices.find(p => p.fuelType === fuelType)

          const pricePerLiter = price ? price.price : 0
          const salesAmount = litersSold * pricePerLiter

          const current = revenueByFuelType.get(fuelType) || 0
          revenueByFuelType.set(fuelType, current + salesAmount)
        }
      }
    }

    // Get expense breakdown by category
    const expensesByCategory = new Map<string, number>()
    for (const expense of expenses) {
      const category = expense.category || 'Other'
      const current = expensesByCategory.get(category) || 0
      expensesByCategory.set(category, current + expense.amount)
    }

    // Build revenue breakdown
    const revenueBreakdown = Array.from(revenueByFuelType.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100 * 100) / 100 : 0
    })).sort((a, b) => b.amount - a.amount)

    // Build expense breakdown
    const expenseBreakdown = Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100 * 100) / 100 : 0
    })).sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      month: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
      stationId,
      dailyData,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalExpenses: Math.round(totalExpenses),
        totalProfit: Math.round(totalProfit),
        averageMargin: Math.round(averageMargin * 100) / 100,
        bestDay: dailyData.reduce((best, day) => day.profit > best.profit ? day : best, dailyData[0] || { day: 0, profit: 0 }),
        worstDay: dailyData.reduce((worst, day) => day.profit < worst.profit ? day : worst, dailyData[0] || { day: 0, profit: 0 })
      },
      breakdown: {
        revenue: revenueBreakdown,
        expenses: expenseBreakdown
      }
    })
  } catch (error) {
    console.error('Error generating profit report:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

