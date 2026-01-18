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

    if (!month) {
      return NextResponse.json({ error: 'Month is required (format: YYYY-MM)' }, { status: 400 })
    }

    const [year, monthNum] = month.split('-').map(Number)
    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format' }, { status: 400 })
    }

    const startOfMonth = new Date(year, monthNum - 1, 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

    // Get all closed shifts for the month
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED',
        startTime: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        declaredAmounts: true
      }
    })

    // Extract pumper breakdowns from shift declaredAmounts
    const pumperVarianceMap = new Map<string, {
      pumperId: string
      pumperName: string
      totalShifts: number
      shiftsWithVariance: number
      varianceCount: number
      totalVarianceAmount: number
      maxSingleVariance: number
      varianceRate: number
      dailyVariances: Array<{ day: number; variance: number }>
    }>()

    // Get all pumpers
    const pumpers = await prisma.pumper.findMany({
      where: {
        stationId,
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    })

    // Initialize pumper map
    for (const pumper of pumpers) {
      pumperVarianceMap.set(pumper.name, {
        pumperId: pumper.id,
        pumperName: pumper.name,
        totalShifts: 0,
        shiftsWithVariance: 0,
        varianceCount: 0,
        totalVarianceAmount: 0,
        maxSingleVariance: 0,
        varianceRate: 0,
        dailyVariances: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, variance: 0 }))
      })
    }

    // Process each shift's pumper breakdown
    for (const shift of shifts) {
      const declaredAmounts = shift.declaredAmounts as any
      const pumperBreakdown = declaredAmounts?.pumperBreakdown || []

      for (const breakdown of pumperBreakdown) {
        const pumperName = breakdown.pumperName
        if (!pumperName) continue

        let pumperData = pumperVarianceMap.get(pumperName)
        if (!pumperData) {
          // Create entry for pumper not in list
          pumperData = {
            pumperId: `pumper-${pumperName}`,
            pumperName,
            totalShifts: 0,
            shiftsWithVariance: 0,
            varianceCount: 0,
            totalVarianceAmount: 0,
            maxSingleVariance: 0,
            varianceRate: 0,
            dailyVariances: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, variance: 0 }))
          }
          pumperVarianceMap.set(pumperName, pumperData)
        }

        pumperData.totalShifts += 1

        const variance = breakdown.variance || 0
        const varianceStatus = breakdown.varianceStatus || 'NORMAL'
        const varianceThreshold = 20 // Threshold for considering it a variance

        if (Math.abs(variance) > varianceThreshold) {
          pumperData.shiftsWithVariance += 1
          pumperData.varianceCount += 1
          pumperData.totalVarianceAmount += Math.abs(variance)
          pumperData.maxSingleVariance = Math.max(pumperData.maxSingleVariance, Math.abs(variance))

          // Add to daily variance for the day of the shift
          const shiftDate = new Date(shift.startTime)
          const dayOfMonth = shiftDate.getDate()
          if (dayOfMonth >= 1 && dayOfMonth <= 31) {
            pumperData.dailyVariances[dayOfMonth - 1].variance += variance
          }
        }
      }
    }

    // Calculate variance rate and performance rating for each pumper
    const pumperVariances = Array.from(pumperVarianceMap.values()).map(pumperData => {
      pumperData.varianceRate = pumperData.totalShifts > 0 
        ? (pumperData.shiftsWithVariance / pumperData.totalShifts) * 100 
        : 0

      let performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'
      if (pumperData.varianceRate <= 5) {
        performanceRating = 'EXCELLENT'
      } else if (pumperData.varianceRate <= 15) {
        performanceRating = 'GOOD'
      } else if (pumperData.varianceRate <= 30) {
        performanceRating = 'NEEDS_IMPROVEMENT'
      } else {
        performanceRating = 'CRITICAL'
      }

      return {
        ...pumperData,
        performanceRating,
        averageVariance: pumperData.varianceCount > 0
          ? Math.round((pumperData.totalVarianceAmount / pumperData.varianceCount) * 100) / 100
          : 0
      }
    }).sort((a, b) => {
      // Sort by variance rate (worst first)
      return b.varianceRate - a.varianceRate
    })

    return NextResponse.json({
      month,
      stationId,
      pumperVariances,
      summary: {
        totalPumpers: pumperVariances.length,
        excellent: pumperVariances.filter(p => p.performanceRating === 'EXCELLENT').length,
        good: pumperVariances.filter(p => p.performanceRating === 'GOOD').length,
        needsImprovement: pumperVariances.filter(p => p.performanceRating === 'NEEDS_IMPROVEMENT').length,
        critical: pumperVariances.filter(p => p.performanceRating === 'CRITICAL').length
      }
    })
  } catch (error) {
    console.error('Error generating pumper variance report:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}



