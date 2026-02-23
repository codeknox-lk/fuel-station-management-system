import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStationContext } from '@/lib/api-utils'

interface ShiftData {
  shiftId: string
  date: Date
  sales: number
  variance: number
  liters: number
}

export async function GET(request: NextRequest) {
  try {
    const { stationId, organizationId, searchParams, errorResponse } = await getAuthenticatedStationContext(request)
    if (errorResponse) return errorResponse

    if (!stationId || !organizationId) throw new Error("Context missing after auth check")

    const startDate = searchParams!.get('startDate')
    const endDate = searchParams!.get('endDate')
    const pumperId = searchParams!.get('pumperId')

    // Parse dates or use defaults (current business month)
    let dateStart: Date
    let dateEnd: Date

    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateStart.setHours(0, 0, 0, 0)
      dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
    } else {
      // Default to current business month (7th to 6th)
      const now = new Date()
      const currentDay = now.getDate()

      if (currentDay < 7) {
        dateStart = new Date(now.getFullYear(), now.getMonth() - 1, 7, 0, 0, 0, 0)
        dateEnd = new Date(now.getFullYear(), now.getMonth(), 6, 23, 59, 59, 999)
      } else {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 7, 0, 0, 0, 0)
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 6, 23, 59, 59, 999)
      }
    }

    // Get all pumpers or specific pumper
    const pumpers = await prisma.pumper.findMany({
      where: {
        stationId: stationId === 'all' ? undefined : stationId,
        organizationId: organizationId,
        isActive: true,
        ...(pumperId ? { id: pumperId } : {})
      },
      include: {
        station: {
          select: {
            name: true,
            city: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get shift assignments for the period
    const shiftAssignments = await prisma.shiftAssignment.findMany({
      where: {
        shift: {
          stationId: stationId === 'all' ? undefined : stationId,
          organizationId: organizationId,
          status: 'CLOSED',
          endTime: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        pumperName: {
          in: pumpers.map(p => p.name)
        }
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            declaredAmounts: true
          }
        },
        nozzle: {
          include: {
            tank: {
              select: {
                fuelId: true,
                fuel: true
              }
            }
          }
        }
      }
    })

    // Get active loans for pumpers
    const loans = await prisma.loanPumper.findMany({
      where: {
        stationId: stationId === 'all' ? undefined : stationId,
        organizationId: organizationId,
        status: 'ACTIVE',
        pumperName: {
          in: pumpers.map(p => p.name)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Build comprehensive pumper details
    const pumperDetails = await Promise.all(pumpers.map(async (pumper) => {
      // Local tracking for this pumper
      let totalSales = 0
      let totalLiters = 0
      let totalVariance = 0
      let shiftsWithVariance = 0
      let periodAdvances = 0
      const recentShiftsData: ShiftData[] = []

      const pumperAssignments = shiftAssignments.filter(a => a.pumperName === pumper.name)
      const uniqueShifts = new Set(pumperAssignments.map(a => a.shift.id))
      const totalShifts = uniqueShifts.size
      const varianceThreshold = 20
      const shiftIds = Array.from(uniqueShifts)

      // Temporary storage for daily aggregation
      const dailyAggregation = new Map<string, {
        sales: number,
        variance: number,
        liters: number
      }>()

      for (const shiftId of shiftIds) {
        const shiftAssignment = shiftAssignments.find(a => a.shift.id === shiftId)
        const shift = shiftAssignment?.shift
        if (!shift || !shift.declaredAmounts) continue

        interface PumperBreakdown {
          pumperName: string
          calculatedSales?: number
          totalSales?: number
          variance?: number
          advanceTaken?: number
        }
        interface DeclaredAmounts {
          pumperBreakdown?: PumperBreakdown[]
        }

        const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
        const pumperBreakdown = declaredAmounts.pumperBreakdown || []
        const pumperData = pumperBreakdown.find(p => p.pumperName === pumper.name)

        let shiftSales = 0
        let shiftVariance = 0
        let shiftLiters = 0

        if (pumperData) {
          shiftSales = pumperData.calculatedSales || pumperData.totalSales || 0
          shiftVariance = pumperData.variance || 0
          periodAdvances += pumperData.advanceTaken || 0

          totalSales += shiftSales
          totalVariance += Math.abs(shiftVariance)

          if (Math.abs(shiftVariance) > varianceThreshold) {
            shiftsWithVariance++
          }
        }

        // Calculate liters for this shift
        const shiftAssignmentsForPumper = pumperAssignments.filter(a => a.shift.id === shiftId)
        for (const assignment of shiftAssignmentsForPumper) {
          if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
            let liters = assignment.endMeterReading - assignment.startMeterReading
            if (liters < 0) {
              const METER_MAX = 99999
              if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
                liters = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
              } else {
                liters = 0
              }
            }
            if (liters > 0) shiftLiters += liters
          }
        }
        totalLiters += shiftLiters

        // Add to daily aggregation
        const dateKey = new Date(shift.startTime).toISOString().split('T')[0]
        if (!dailyAggregation.has(dateKey)) {
          dailyAggregation.set(dateKey, { sales: 0, variance: 0, liters: 0 })
        }
        const dailyData = dailyAggregation.get(dateKey)!
        dailyData.sales += shiftSales
        dailyData.variance += shiftVariance
        dailyData.liters += shiftLiters

        recentShiftsData.push({
          shiftId,
          date: new Date(shift.startTime),
          sales: shiftSales,
          variance: shiftVariance,
          liters: shiftLiters
        })
      }

      // Prepare aggregated chart data (last 10 days)
      const recentShifts = Array.from(dailyAggregation.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 10)
        .map(([date, data]) => ({
          date,
          sales: Math.round(data.sales),
          variance: Math.round(data.variance),
          liters: Math.round(data.liters)
        }))

      // All shifts in period sorted descending for table
      const shiftsInPeriod = recentShiftsData
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(s => ({
          ...s,
          date: s.date.toISOString()
        }))

      // Calculate variance rate
      const varianceRate = totalShifts > 0
        ? (shiftsWithVariance / totalShifts) * 100
        : 0

      // Determine performance rating
      let performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'
      if (varianceRate <= 5) {
        performanceRating = 'EXCELLENT'
      } else if (varianceRate <= 15) {
        performanceRating = 'GOOD'
      } else if (varianceRate <= 30) {
        performanceRating = 'NEEDS_IMPROVEMENT'
      } else {
        performanceRating = 'CRITICAL'
      }

      // Get loans for this pumper
      const pumperLoans = loans.filter(l => l.pumperName === pumper.name)
      const totalLoanBalance = pumperLoans.reduce((sum, loan) => sum + (loan.amount - loan.paidAmount), 0)
      const totalMonthlyRental = pumperLoans.reduce((sum, loan) => sum + (loan.monthlyRental || 0), 0)

      // Calculate advance limit (50,000 - monthly rental)
      const advanceLimit = 50000 - totalMonthlyRental

      // Get salary payments for the period
      const salaryPayments = await prisma.salaryPayment.findMany({
        where: {
          pumperId: pumper.id,
          organizationId: organizationId,
          paymentDate: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        orderBy: {
          paymentDate: 'desc'
        }
      })

      const totalSalaryPaid = salaryPayments.reduce((sum, payment) => sum + payment.netSalary, 0)
      const totalSettledAdvances = salaryPayments.reduce((sum, payment) => sum + payment.advances, 0)
      const totalLoanDeductions = salaryPayments.reduce((sum, payment) => sum + payment.loans, 0)

      // Fuel type breakdown
      const fuelTypeBreakdown = new Map<string, { liters: number, shifts: number }>()
      for (const assignment of pumperAssignments) {
        if (assignment.status !== 'CLOSED' || !assignment.endMeterReading || !assignment.startMeterReading) continue

        let litersSold = assignment.endMeterReading - assignment.startMeterReading
        if (litersSold < 0) {
          const METER_MAX = 99999
          if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
            litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
          } else {
            continue
          }
        }

        if (litersSold > 0 && assignment.nozzle?.tank?.fuel?.name) {
          const fuelType = assignment.nozzle.tank.fuel.category
          if (!fuelTypeBreakdown.has(fuelType)) {
            fuelTypeBreakdown.set(fuelType, { liters: 0, shifts: 0 })
          }
          const data = fuelTypeBreakdown.get(fuelType)!
          data.liters += litersSold
          data.shifts++
        }
      }

      return {
        id: pumper.id,
        name: pumper.name,
        employeeId: pumper.employeeId || 'N/A',
        phoneNumber: pumper.phone || 'N/A',
        address: 'N/A',
        nic: 'N/A',
        baseSalary: pumper.baseSalary || 0,
        holidayAllowance: pumper.holidayAllowance || 0,

        // Performance metrics
        totalShifts,
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters),
        averageSalesPerShift: totalShifts > 0 ? Math.round(totalSales / totalShifts) : 0,
        averageLitersPerShift: totalShifts > 0 ? Math.round(totalLiters / totalShifts) : 0,

        // Recent shifts for charts (aggregated)
        recentShifts,

        // Variance metrics
        totalVariance: Math.round(totalVariance),
        shiftsWithVariance,
        varianceRate: Math.round(varianceRate * 100) / 100,
        performanceRating,

        // Financial data
        totalLoanBalance,
        totalMonthlyRental,
        advanceLimit,
        activeLoansCount: pumperLoans.length,
        totalSalaryPaid,
        periodAdvances: Math.round(periodAdvances),
        totalSettledAdvances: Math.round(totalSettledAdvances),
        totalLoanDeductions,

        // Salary payments
        recentSalaryPayments: salaryPayments.slice(0, 5).map(payment => ({
          id: payment.id,
          paymentDate: payment.paymentDate,
          baseSalary: payment.baseSalary,
          varianceAdd: payment.varianceAdd,
          varianceDeduct: payment.varianceDeduct,
          advances: payment.advances,
          loans: payment.loans,
          netSalary: payment.netSalary
        })),

        // All shifts in the period for the table
        shiftsInPeriod,

        // Loans
        activeLoans: pumperLoans.map(loan => ({
          id: loan.id,
          amount: loan.amount,
          balance: loan.amount - loan.paidAmount,
          monthlyRental: loan.monthlyRental,
          createdAt: loan.createdAt,
          description: loan.reason
        })),

        // Fuel type breakdown
        fuelTypeBreakdown: Array.from(fuelTypeBreakdown.entries()).map(([fuelType, data]) => ({
          fuelType,
          liters: Math.round(data.liters),
          shifts: data.shifts
        }))
      }
    }))

    // Sort by total sales (highest first)
    pumperDetails.sort((a, b) => b.totalSales - a.totalSales)

    // Calculate summary statistics
    const totalSales = pumperDetails.reduce((sum, p) => sum + p.totalSales, 0)
    const totalVariance = pumperDetails.reduce((sum, p) => sum + Math.abs(p.totalVariance), 0)

    // Identified top performer (highest efficiency with significant shifts)
    const candidates = pumperDetails.filter(p => p.totalShifts >= 3)
    const topPerformer = candidates.length > 0
      ? candidates.sort((a, b) => (100 - a.varianceRate) - (100 - b.varianceRate))[0]
      : pumperDetails.sort((a, b) => (100 - a.varianceRate) - (100 - b.varianceRate))[0]

    const summary = {
      totalPumpers: pumpers.length,
      totalShifts: pumperDetails.reduce((sum, p) => sum + p.totalShifts, 0),
      totalSales,
      totalLiters: pumperDetails.reduce((sum, p) => sum + p.totalLiters, 0),
      excellentPerformers: pumperDetails.filter(p => p.performanceRating === 'EXCELLENT').length,
      goodPerformers: pumperDetails.filter(p => p.performanceRating === 'GOOD').length,
      needsImprovement: pumperDetails.filter(p => p.performanceRating === 'NEEDS_IMPROVEMENT').length,
      criticalPerformers: pumperDetails.filter(p => p.performanceRating === 'CRITICAL').length,
      totalActiveLoans: pumperDetails.reduce((sum, p) => sum + p.activeLoansCount, 0),
      totalLoanBalance: pumperDetails.reduce((sum, p) => sum + p.totalLoanBalance, 0),
      totalSalaryPaid: pumperDetails.reduce((sum, p) => sum + p.totalSalaryPaid, 0),
      totalVariance,
      avgEfficiency: totalSales > 0 ? Math.max(0, 100 - (totalVariance / totalSales * 100)) : 100,
      topPerformer: topPerformer ? {
        name: topPerformer.name,
        efficiency: 100 - topPerformer.varianceRate,
        id: topPerformer.id
      } : null
    }

    return NextResponse.json({
      summary,
      pumperDetails,
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      }
    })
  } catch (error) {
    console.error('[Pumper Report] ERROR:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch pumper details report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
