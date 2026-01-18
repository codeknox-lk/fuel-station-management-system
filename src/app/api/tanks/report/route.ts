import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const date = searchParams.get('date')

    if (!stationId || !date) {
      return NextResponse.json({ 
        error: 'Station ID and date are required' 
      }, { status: 400 })
    }

    // Parse date and set time range for the day
    const reportDate = new Date(date)
    const startOfDay = new Date(reportDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(reportDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get station
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Get all tanks for this station (excluding OIL)
    const tanks = await prisma.tank.findMany({
      where: { 
        stationId,
        fuelType: { not: 'OIL' }
      },
      select: {
        id: true,
        tankNumber: true,
        fuelType: true,
        capacity: true
      }
    })

    // Get opening stock (tank level at start of day)
    // We'll need to track this historically. For now, use current level minus transactions
    const tankReports = await Promise.all(tanks.map(async (tank) => {
      // Get deliveries for this tank on this date
      const deliveries = await prisma.delivery.findMany({
        where: {
          tankId: tank.id,
          deliveryDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: {
          quantity: true
        }
      })
      const totalDeliveries = deliveries.reduce((sum, d) => sum + d.quantity, 0)

      // Get sales (from shifts closed on this date)
      const closedShifts = await prisma.shift.findMany({
        where: {
          stationId,
          status: 'CLOSED',
          endTime: {
            gte: startOfDay,
            lte: endOfDay
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
              select: {
                tankId: true
              }
            }
          }
        }
      }
      })

      // Calculate sales for this tank
      let totalSales = 0
      for (const shift of closedShifts) {
        for (const assignment of shift.assignments) {
          if (assignment.nozzle.tankId === tank.id) {
            const litersSold = assignment.endMeterReading! - assignment.startMeterReading
            if (litersSold > 0) {
              totalSales += litersSold
            }
          }
        }
      }

      // Get ALL test pours for this date (both returned and not returned)
      // Test pours that were returned should be added back to book stock
      // Test pours that were NOT returned should be deducted from book stock (fuel was taken for testing)
      const testPours = await prisma.testPour.findMany({
        where: {
          timestamp: {
            gte: startOfDay,
            lte: endOfDay
          },
          nozzle: {
            tankId: tank.id
          }
        },
        include: {
          nozzle: {
            select: {
              tankId: true
            }
          }
        }
      })

      // Calculate net test pour effect: returned test pours add to stock, non-returned subtract
      let testReturns = 0 // Test pours that were returned (added back)
      let testDiscards = 0 // Test pours that were not returned (deducted)
      for (const test of testPours) {
        if (test.nozzle.tankId === tank.id) {
          if (test.returned) {
            testReturns += test.amount
          } else {
            testDiscards += test.amount
          }
        }
      }

      // For opening stock, we'll estimate based on current level minus today's transactions
      // In production, you'd track opening balances daily
      const currentTank = await prisma.tank.findUnique({
        where: { id: tank.id },
        select: { currentLevel: true }
      })
      
      // Calculate opening stock: Get opening stock from first dip of the day or estimate from previous day
      // WARNING: Using currentLevel for historical dates is incorrect. This is a limitation.
      // Opening Stock = Current Level - Today's Net Changes
      // Today's Net Changes = Deliveries - Sales + Test Returns (returned) - Test Discards (not returned)
      const netTestEffect = testReturns - testDiscards
      const estimatedOpeningStock = Math.max(0, (currentTank?.currentLevel || 0) - totalDeliveries + totalSales - netTestEffect)

      // Calculate closing book stock
      // Closing Book Stock = Opening Stock + Deliveries - Sales + Test Returns - Test Discards
      // Note: Test returns add to stock (fuel returned), test discards subtract (fuel taken for testing)
      const closingBookStock = estimatedOpeningStock + totalDeliveries - totalSales + testReturns - testDiscards
      
      // Validate closing book stock is non-negative
      const validatedClosingBookStock = Math.max(0, closingBookStock)

      // Get latest dip reading
      const latestDip = await prisma.tankDip.findFirst({
        where: {
          tankId: tank.id
        },
        orderBy: {
          dipDate: 'desc'
        },
        select: {
          reading: true,
          dipDate: true
        }
      })

      const closingDipStock = latestDip?.reading || 0
      // Variance = Book Stock - Physical Dip Reading
      // Positive variance = book shows more than physical (shortage/loss)
      // Negative variance = physical has more than book (excess/gain)
      const variance = validatedClosingBookStock - closingDipStock
      const variancePercentage = validatedClosingBookStock > 0 
        ? (Math.abs(variance) / validatedClosingBookStock) * 100 
        : (closingDipStock > 0 ? 100 : 0) // If book is 0 but dip > 0, variance is 100%

      // Tolerance calculation (2% or 200L, whichever is greater)
      const toleranceLimit = Math.max(validatedClosingBookStock * 0.02, 200)
      let toleranceStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
      
      if (Math.abs(variance) <= toleranceLimit * 0.5) {
        toleranceStatus = 'NORMAL'
      } else if (Math.abs(variance) <= toleranceLimit) {
        toleranceStatus = 'WARNING'
      } else {
        toleranceStatus = 'CRITICAL'
      }

      return {
        tankId: tank.id,
        tankNumber: tank.tankNumber || 'TANK-1',
        fuelType: tank.fuelType,
        capacity: tank.capacity,
            openingStock: Math.round(estimatedOpeningStock * 100) / 100,
            deliveries: Math.round(totalDeliveries * 100) / 100,
            sales: Math.round(totalSales * 100) / 100,
            testReturns: Math.round(testReturns * 100) / 100,
            testDiscards: Math.round(testDiscards * 100) / 100,
            closingBookStock: Math.round(validatedClosingBookStock * 100) / 100,
        closingDipStock: Math.round(closingDipStock * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercentage: Math.round(variancePercentage * 100) / 100,
        toleranceStatus,
        toleranceLimit: Math.round(toleranceLimit * 100) / 100
      }
    }))

    // Calculate totals
    const totalVariance = tankReports.reduce((sum, r) => sum + r.variance, 0)
    const totalBookStock = tankReports.reduce((sum, r) => sum + r.closingBookStock, 0)
    const totalVariancePercentage = totalBookStock > 0 ? (totalVariance / totalBookStock) * 100 : 0

    // Determine overall status
    const criticalCount = tankReports.filter(r => r.toleranceStatus === 'CRITICAL').length
    const warningCount = tankReports.filter(r => r.toleranceStatus === 'WARNING').length
    const overallStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 
      criticalCount > 0 ? 'CRITICAL' : (warningCount > 0 ? 'WARNING' : 'NORMAL')

    return NextResponse.json({
      stationId,
      stationName: station.name,
      reportDate: date,
      tanks: tankReports,
      totalVariance: Math.round(totalVariance * 100) / 100,
      totalVariancePercentage: Math.round(totalVariancePercentage * 100) / 100,
      overallStatus
    })
  } catch (error) {
    console.error('Error generating variance report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

