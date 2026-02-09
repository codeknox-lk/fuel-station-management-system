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

    // Business month: 7th of selected month to 6th of next month
    const startOfMonth = new Date(yearNum, monthNum - 1, 7, 0, 0, 0, 0)
    const endOfMonth = new Date(yearNum, monthNum, 6, 23, 59, 59, 999)


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

    // Get all shop sales for the month
    const shopSales = await prisma.shopSale.findMany({
      where: {
        assignment: {
          shift: {
            stationId,
            endTime: {
              gte: startOfMonth,
              lte: endOfMonth
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

    // Get all shop wastage for the month
    const shopWastage = await prisma.shopWastage.findMany({
      where: {
        product: {
          stationId
        },
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth
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

    // Calculate daily profit data for business month (7th to 6th)
    const dailyData = []
    const currentDate = new Date(startOfMonth)

    while (currentDate <= endOfMonth) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentDate)
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

            const fuelId = assignment.nozzle?.tank?.fuelId
            if (!fuelId) continue

            // Get price effective at shift end time (when shift closed)
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

      // Move to next day
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

          // Corrected: Use fuelId from tank and filter prices by fuelId
          const fuelId = assignment.nozzle?.tank?.fuelId
          if (!fuelId) continue

          const price = prices.find(p =>
            p.fuelId === fuelId &&
            new Date(p.effectiveDate) <= (shift.endTime || shift.startTime)
          ) || prices.find(p => p.fuelId === fuelId) // Fallback to any price for that fuelId if no effective date match

          const salesAmount = litersSold * (price ? price.price : 0)

          const fuelTypeName = assignment.nozzle?.tank?.fuel?.name || 'Unknown' // Get fuel name for breakdown category
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

    // Exclude days with no activity (revenue = 0, expenses = 0, profit = 0)
    // This handles both incomplete days and future dates with no data
    const today = new Date()
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    console.log('[Profit Report] Today date string:', todayDateString)
    console.log('[Profit Report] Daily data dates:', dailyData.map(d => d.date))

    const completedDays = dailyData.filter(day => {
      const isToday = day.date === todayDateString
      const hasActivity = day.revenue > 0 || day.expenses > 0 || day.profit !== 0
      const isFutureOrToday = day.date >= todayDateString

      console.log(`[Profit Report] Date ${day.date}: isToday=${isToday}, hasActivity=${hasActivity}, isFutureOrToday=${isFutureOrToday}`)

      // Exclude: (1) today/future dates OR (2) days with no activity
      return !isFutureOrToday && hasActivity
    })

    console.log('[Profit Report] Completed days with activity:', completedDays.length)

    // If there are no completed days yet, use empty data
    const bestDay = completedDays.length > 0
      ? completedDays.reduce((best, day) => day.profit > best.profit ? day : best, completedDays[0])
      : { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }

    const worstDay = completedDays.length > 0
      ? completedDays.reduce((worst, day) => day.profit < worst.profit ? day : worst, completedDays[0])
      : { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }

    console.log('[Profit Report] Best day:', bestDay.date, 'Profit:', bestDay.profit)
    console.log('[Profit Report] Worst day:', worstDay.date, 'Profit:', worstDay.profit)

    return NextResponse.json({
      month: `${yearNum}-${String(monthNum).padStart(2, '0')}`,
      stationId,
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
    })
  } catch (error) {
    console.error('Error generating profit report:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

