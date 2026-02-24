import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const month = searchParams.get('month') // Format: YYYY-MM

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Parse month and calculate business month range (7th to 6th)
    let startDate: Date
    let endDate: Date

    const station = await prisma.station.findUnique({ where: { id: stationId } })
    const monthStartDay = station?.monthStartDate || 1

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      // Business month
      startDate = new Date(year, monthNum - 1, monthStartDay, 0, 0, 0, 0)
      endDate = new Date(year, monthNum, monthStartDay - 1, 23, 59, 59, 999)
    } else {
      const now = new Date()
      const currentDay = now.getDate()

      if (currentDay < monthStartDay) {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, monthStartDay, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), monthStartDay - 1, 23, 59, 59, 999)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), monthStartDay, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, monthStartDay - 1, 23, 59, 59, 999)
      }
    }

    // OPTIMIZED: Get all closed shifts for the month with select
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED',
        endTime: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        endTime: true,
        assignments: {
          where: {
            status: 'CLOSED',
            endMeterReading: { not: null }
          },
          select: {
            id: true,
            status: true,
            startMeterReading: true,
            endMeterReading: true,
            nozzle: {
              select: {
                id: true,
                tank: {
                  select: {
                    id: true,
                    fuelId: true,
                    fuel: {
                      select: {
                        id: true,
                        name: true,
                        code: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    // Get all prices for the month
    const prices = await prisma.price.findMany({
      where: {
        stationId,
        isActive: true
      },
      orderBy: { effectiveDate: 'desc' }
    })

    // Create maps for daily sales by fuel type (both Rs and Liters)
    const dailySalesMap = new Map<string, Map<string, number>>() // date -> fuelType -> amount in Rs
    const dailyLitersMap = new Map<string, Map<string, number>>() // date -> fuelType -> liters sold

    // Initialize all days in the business month (7th to 6th)
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
      dailySalesMap.set(dateKey, new Map())
      dailyLitersMap.set(dateKey, new Map())
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Process each shift
    for (const shift of shifts) {
      if (!shift.endTime) continue

      const shiftDate = new Date(shift.endTime)
      const dateKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}-${String(shiftDate.getDate()).padStart(2, '0')}`

      if (!dailySalesMap.has(dateKey)) continue

      const daySales = dailySalesMap.get(dateKey)!
      const dayLiters = dailyLitersMap.get(dateKey)!

      // Process each assignment
      for (const assignment of shift.assignments) {
        // Double-check assignment is closed (already filtered in query, but verify for safety)
        if (assignment.status !== 'CLOSED' || !assignment.endMeterReading || !assignment.startMeterReading) continue
        if (!assignment.nozzle || !assignment.nozzle.tank) continue

        // Handle meter rollover
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

        const fuel = assignment.nozzle.tank.fuel
        if (!fuel) continue

        const fuelName = fuel.name

        // Find price effective at shift end time
        const price = prices.find(p =>
          p.fuelId === fuel.id &&
          new Date(p.effectiveDate) <= (shift.endTime || new Date())
        ) || prices.find(p => p.fuelId === fuel.id)

        const pricePerLiter = price ? price.price : 0
        const salesAmount = litersSold * pricePerLiter

        // Add to daily sales for this fuel type (Rs)
        const currentAmount = daySales.get(fuelName) || 0
        daySales.set(fuelName, currentAmount + salesAmount)

        // Add to daily liters for this fuel type
        const currentLiters = dayLiters.get(fuelName) || 0
        dayLiters.set(fuelName, currentLiters + litersSold)
      }
    }

    // Convert to array format
    const dailySales: Array<{
      date: string
      day: number
      sales: Record<string, number> // fuelType -> amount in Rs
      liters: Record<string, number> // fuelType -> liters sold
      totalSales: number
      totalLiters: number
    }> = []

    // Get all unique fuel types from BOTH sales data AND station tanks (to show all fuel types even with zero sales)
    const allFuelTypes = new Set<string>()

    // Add fuel types from actual sales
    dailySalesMap.forEach(daySales => {
      daySales.forEach((_, fuelName) => allFuelTypes.add(fuelName))
    })

    // Add all fuel types from station tanks (so we show columns even with no sales)
    const stationTanks = await prisma.tank.findMany({
      where: { stationId },
      include: { fuel: true },
      distinct: ['fuelId']
    })
    stationTanks.forEach(tank => {
      if (tank.fuel && tank.fuel.code !== 'OIL') { // Exclude OIL from sales reports
        allFuelTypes.add(tank.fuel.name)
      }
    })

    // Sort dates and build response
    const sortedDates = Array.from(dailySalesMap.keys()).sort()

    for (const dateKey of sortedDates) {
      const daySales = dailySalesMap.get(dateKey)!
      const dayLiters = dailyLitersMap.get(dateKey)!
      const totalSales = Array.from(daySales.values()).reduce((sum, amount) => sum + amount, 0)
      const totalLiters = Array.from(dayLiters.values()).reduce((sum, liters) => sum + liters, 0)

      const salesByFuelType: Record<string, number> = {}
      const litersByFuelType: Record<string, number> = {}
      allFuelTypes.forEach(fuelName => {
        salesByFuelType[fuelName] = daySales.get(fuelName) || 0
        litersByFuelType[fuelName] = dayLiters.get(fuelName) || 0
      })

      dailySales.push({
        date: dateKey,
        day: parseInt(dateKey.split('-')[2]),
        sales: salesByFuelType,
        liters: litersByFuelType,
        totalSales,
        totalLiters
      })
    }

    // Calculate totals by fuel type (both Rs and Liters)
    const totalsByFuelType: Record<string, number> = {}
    const totalLitersByFuelType: Record<string, number> = {}
    allFuelTypes.forEach(fuelName => {
      totalsByFuelType[fuelName] = dailySales.reduce((sum, day) => sum + (day.sales[fuelName] || 0), 0)
      totalLitersByFuelType[fuelName] = dailySales.reduce((sum, day) => sum + (day.liters[fuelName] || 0), 0)
    })

    return NextResponse.json({
      month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dailySales,
      totalsByFuelType,
      totalLitersByFuelType,
      fuelTypes: Array.from(allFuelTypes)
    })
  } catch (error) {
    console.error('Error fetching daily sales data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily sales data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

