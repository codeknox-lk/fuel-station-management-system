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

    // Parse month or use current month
    let startDate: Date
    let endDate: Date
    
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = new Date(year, monthNum - 1, 1)
      endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)
    } else {
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    // Get all closed shifts for the month
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
                  select: {
                    id: true,
                    fuelType: true
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

    // Create a map for daily sales by fuel type
    const dailySalesMap = new Map<string, Map<string, number>>() // date -> fuelType -> amount

    // Initialize all days in the month
    const daysInMonth = endDate.getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      dailySalesMap.set(dateKey, new Map())
    }

    // Process each shift
    for (const shift of shifts) {
      if (!shift.endTime) continue
      
      const shiftDate = new Date(shift.endTime)
      const dateKey = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}-${String(shiftDate.getDate()).padStart(2, '0')}`
      
      if (!dailySalesMap.has(dateKey)) continue

      const daySales = dailySalesMap.get(dateKey)!

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

        const fuelType = assignment.nozzle.tank.fuelType
        if (!fuelType) continue
        
        // Find price effective at shift end time
        const price = prices.find(p => 
          p.fuelType === fuelType && 
          new Date(p.effectiveDate) <= (shift.endTime || new Date())
        ) || prices.find(p => p.fuelType === fuelType)

        const pricePerLiter = price ? price.price : 0
        const salesAmount = litersSold * pricePerLiter

        // Add to daily sales for this fuel type
        const currentAmount = daySales.get(fuelType) || 0
        daySales.set(fuelType, currentAmount + salesAmount)
      }
    }

    // Convert to array format
    const dailySales: Array<{
      date: string
      day: number
      sales: Record<string, number> // fuelType -> amount
      totalSales: number
    }> = []

    // Get all unique fuel types
    const allFuelTypes = new Set<string>()
    dailySalesMap.forEach(daySales => {
      daySales.forEach((_, fuelType) => allFuelTypes.add(fuelType))
    })

    // Sort dates and build response
    const sortedDates = Array.from(dailySalesMap.keys()).sort()
    
    for (const dateKey of sortedDates) {
      const daySales = dailySalesMap.get(dateKey)!
      const totalSales = Array.from(daySales.values()).reduce((sum, amount) => sum + amount, 0)
      
      const salesByFuelType: Record<string, number> = {}
      allFuelTypes.forEach(fuelType => {
        salesByFuelType[fuelType] = daySales.get(fuelType) || 0
      })

      dailySales.push({
        date: dateKey,
        day: parseInt(dateKey.split('-')[2]),
        sales: salesByFuelType,
        totalSales
      })
    }

    // Calculate totals by fuel type
    const totalsByFuelType: Record<string, number> = {}
    allFuelTypes.forEach(fuelType => {
      totalsByFuelType[fuelType] = dailySales.reduce((sum, day) => sum + (day.sales[fuelType] || 0), 0)
    })

    return NextResponse.json({
      month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      dailySales,
      totalsByFuelType,
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

