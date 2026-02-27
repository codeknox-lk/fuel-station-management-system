import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedStationContext } from '@/lib/api-utils'
import { calculateBillingPeriod } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const { stationId, searchParams, errorResponse } = await getAuthenticatedStationContext(request)
    if (errorResponse) return errorResponse

    if (!stationId) throw new Error("Station ID missing after auth check")

    const month = searchParams!.get('month') // Format: YYYY-MM
    const year = searchParams!.get('year')

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
    }

    const station = await prisma.station.findUnique({ where: { id: stationId } })
    const monthStartDay = station?.monthStartDate || 1
    const monthEndDay = station?.monthEndDate

    const currentPeriod = calculateBillingPeriod(yearNum, monthNum - 1, monthStartDay, monthEndDay)
    const startOfMonth = currentPeriod.startDate
    const endOfMonth = currentPeriod.endDate


    // Generate report for current month
    const currentMonthData = await calculateProfitForPeriod(stationId, startOfMonth, endOfMonth)

    // Generate report for previous month (for comparison)
    const prevPeriod = calculateBillingPeriod(yearNum, monthNum - 2, monthStartDay, monthEndDay)
    const startOfPrevMonth = prevPeriod.startDate
    const endOfPrevMonth = prevPeriod.endDate

    const prevMonthData = await calculateProfitForPeriod(stationId, startOfPrevMonth, endOfPrevMonth)

    // Calculate growth
    const previousMonthProfit = prevMonthData.summary.totalProfit
    const profitGrowth = previousMonthProfit !== 0
      ? ((currentMonthData.summary.totalProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100
      : 0

    return NextResponse.json({
      month: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
      stationId,
      dailyData: currentMonthData.dailyData,
      summary: {
        ...currentMonthData.summary,
        previousMonthProfit,
        profitGrowth: Math.round(profitGrowth * 10) / 10
      },
      breakdown: currentMonthData.breakdown
    })
  } catch (error) {
    console.error('Error generating profit report:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function calculateProfitForPeriod(stationId: string, startDate: Date, endDate: Date) {
  // Get all closed shifts for the period
  const shifts = await prisma.shift.findMany({
    where: {
      stationId,
      status: 'CLOSED',
      endTime: {
        gte: startDate,
        lte: endDate
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
              tank: {
                include: {
                  fuel: true
                }
              }
            }
          }
        }
      }
    }
  })

  // Get all shop sales for the period
  const shopSales = await prisma.shopSale.findMany({
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
      assignment: {
        select: {
          shift: {
            select: {
              startTime: true,
              endTime: true
            }
          }
        }
      }
    }
  })

  // Get all shop wastage for the period
  const shopWastage = await prisma.shopWastage.findMany({
    where: {
      product: {
        stationId
      },
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  // Get all expenses for the period
  const expenses = await prisma.expense.findMany({
    where: {
      stationId,
      expenseDate: {
        gte: startDate,
        lte: endDate
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
  const dailyData = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Filter shifts for this day
    const dayShifts = shifts.filter(s => {
      const shiftEndDate = s.endTime ? new Date(s.endTime) : new Date(s.startTime)
      return shiftEndDate >= dayStart && shiftEndDate <= dayEnd
    })

    // Calculate revenue from shifts
    let revenue = 0
    for (const shift of dayShifts) {
      for (const assignment of shift.assignments) {
        if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
          let litersSold = assignment.endMeterReading - assignment.startMeterReading
          if (litersSold < 0) {
            const METER_MAX = 99999
            if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
              litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
            } else {
              continue
            }
          }

          if (litersSold <= 0) continue

          const fuelId = assignment.nozzle?.tank?.fuelId
          if (!fuelId) continue

          const price = prices.find(p =>
            p.fuelId === fuelId &&
            new Date(p.effectiveDate) <= (shift.endTime || shift.startTime)
          ) || prices.find(p => p.fuelId === fuelId)

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

    // Calculate shop revenue and COGS for this day
    const dayShopSales = shopSales.filter(s => {
      const saleDate = s.timestamp || s.assignment?.shift?.endTime || s.assignment?.shift?.startTime
      if (!saleDate) return false
      const d = new Date(saleDate)
      return d >= dayStart && d <= dayEnd
    })

    const shopRevenue = dayShopSales.reduce((sum, s) => sum + s.totalAmount, 0)
    const shopCOGS = dayShopSales.reduce((sum, s) => sum + (s.costPrice * s.quantity), 0)

    // Calculate shop wastage (Cost Loss)
    const dayWastageLoss = shopWastage
      .filter(w => {
        const wDate = new Date(w.timestamp)
        return wDate >= dayStart && wDate <= dayEnd
      })
      .reduce((sum, w) => sum + (w.costPrice * w.quantity), 0)

    const totalDayRevenue = revenue + shopRevenue
    const totalDayExpenses = dayExpenses + shopCOGS + dayWastageLoss

    const profit = totalDayRevenue - totalDayExpenses
    const margin = totalDayRevenue > 0 ? (profit / totalDayRevenue) * 100 : 0

    dailyData.push({
      day: currentDate.getDate(),
      date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
      revenue: Math.round(totalDayRevenue),
      expenses: Math.round(totalDayExpenses),
      profit: Math.round(profit),
      margin: Math.round(margin * 100) / 100
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate totals
  const totalRevenue = dailyData.reduce((sum, day) => sum + day.revenue, 0)
  const totalExpenses = dailyData.reduce((sum, day) => sum + day.expenses, 0)
  const totalProfit = totalRevenue - totalExpenses
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // Get revenue breakdown by fuel type
  const revenueByFuelType = new Map<string, number>()
  for (const shift of shifts) {
    for (const assignment of shift.assignments) {
      if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
        let litersSold = assignment.endMeterReading - assignment.startMeterReading
        if (litersSold < 0) {
          const METER_MAX = 99999
          if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
            litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
          } else {
            continue
          }
        }

        if (litersSold <= 0) continue

        const fuelId = assignment.nozzle?.tank?.fuelId
        if (!fuelId) continue

        const price = prices.find(p =>
          p.fuelId === fuelId &&
          new Date(p.effectiveDate) <= (shift.endTime || shift.startTime)
        ) || prices.find(p => p.fuelId === fuelId)

        const salesAmount = litersSold * (price ? price.price : 0)
        const fuelTypeName = assignment.nozzle?.tank?.fuel?.name || 'Unknown'
        const current = revenueByFuelType.get(fuelTypeName) || 0
        revenueByFuelType.set(fuelTypeName, current + salesAmount)
      }
    }
  }

  // Add Shop Sales to revenue breakdown
  const totalShopRevenue = shopSales.reduce((sum, s) => sum + s.totalAmount, 0)
  const totalShopCOGS = shopSales.reduce((sum, s) => sum + (s.costPrice * s.quantity), 0)
  const totalWastageLoss = shopWastage.reduce((sum, w) => sum + (w.costPrice * w.quantity), 0)

  if (totalShopRevenue > 0) {
    revenueByFuelType.set('Shop Sales', totalShopRevenue)
  }

  // Get expense breakdown by category
  const expensesByCategory = new Map<string, number>()
  for (const expense of expenses) {
    const category = expense.category || 'Other'
    const current = expensesByCategory.get(category) || 0
    expensesByCategory.set(category, current + expense.amount)
  }

  if (totalShopCOGS > 0) {
    expensesByCategory.set('Shop COGS', totalShopCOGS)
  }
  if (totalWastageLoss > 0) {
    expensesByCategory.set('Shop Wastage/Loss', totalWastageLoss)
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

  const today = new Date()
  const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const completedDays = dailyData.filter(day => {
    const hasActivity = day.revenue > 0 || day.expenses > 0 || day.profit !== 0
    const isFutureOrToday = day.date >= todayDateString
    return !isFutureOrToday && hasActivity
  })

  // Only calculate best/worst for current/future reports if we have data
  const bestDay = completedDays.length > 0
    ? completedDays.reduce((best, day) => day.profit > best.profit ? day : best, completedDays[0])
    : { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }

  const worstDay = completedDays.length > 0
    ? completedDays.reduce((worst, day) => day.profit < worst.profit ? day : worst, completedDays[0])
    : { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }

  return {
    dailyData,
    summary: {
      totalRevenue: Math.round(totalRevenue),
      totalExpenses: Math.round(totalExpenses),
      totalProfit: Math.round(totalProfit),
      averageMargin: Math.round(averageMargin * 100) / 100,
      bestDay,
      worstDay
    },
    breakdown: {
      revenue: revenueBreakdown,
      expenses: expenseBreakdown
    }
  }
}

