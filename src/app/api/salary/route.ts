import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const month = searchParams.get('month') // Format: YYYY-MM
    const pumperId = searchParams.get('pumperId')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Parse month or use current month
    // Salary month runs from 7th of current month to 6th of next month
    let startDate: Date
    let endDate: Date

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      // Start: 7th of the specified month
      startDate = new Date(year, monthNum - 1, 7, 0, 0, 0, 0)
      // End: 6th of next month at 23:59:59
      endDate = new Date(year, monthNum, 6, 23, 59, 59, 999)
    } else {
      const now = new Date()
      // If current date is before 7th, use previous month's salary period
      // If current date is 7th or after, use current month's salary period
      let salaryMonth = now.getMonth()
      let salaryYear = now.getFullYear()

      if (now.getDate() < 7) {
        // Use previous month
        salaryMonth = now.getMonth() - 1
        if (salaryMonth < 0) {
          salaryMonth = 11
          salaryYear = now.getFullYear() - 1
        }
      }

      startDate = new Date(salaryYear, salaryMonth, 7, 0, 0, 0, 0)
      endDate = new Date(salaryYear, salaryMonth + 1, 6, 23, 59, 59, 999)
    }

    // Get all pumpers for the station with base salary
    const pumpers = await prisma.pumper.findMany({
      where: {
        stationId,
        isActive: true,
        ...(pumperId ? { id: pumperId } : {})
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        baseSalary: true,
        holidayAllowance: true // This field exists in schema but Prisma client might not be regenerated yet
      }
    })

    // Get closed shifts for the month
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
        startTime: true,
        endTime: true,
        statistics: true,
        declaredAmounts: true,
        assignments: {
          select: {
            pumperName: true,
            startMeterReading: true,
            endMeterReading: true
          }
        }
      },
      orderBy: {
        endTime: 'asc'
      }
    })

    // Get ALL active (unpaid) loans for pumpers
    // Monthly rental should be deducted every month for active loans, regardless of when they were created
    // Only include loans that were created before or during the salary period (to avoid future loans)
    const loanPumperRecords = await prisma.loanPumper.findMany({
      where: {
        stationId,
        status: 'ACTIVE', // Only count active (unpaid) loans
        createdAt: {
          lte: endDate // Loan was created before or during this salary period
        }
      },
      select: {
        id: true,
        pumperName: true,
        amount: true,
        monthlyRental: true,
        reason: true,
        createdAt: true,
        dueDate: true,
        status: true,
        paidAmount: true
      }
    })

    // Debug: Log all loans found
    console.log(`[Salary API] Found ${loanPumperRecords.length} active loans for station ${stationId} (created before ${endDate.toISOString()})`)
    if (loanPumperRecords.length > 0) {
      console.log('[Salary API] Loan details:', loanPumperRecords.map(l => ({
        id: l.id,
        amount: l.amount,
        monthlyRental: l.monthlyRental,
        status: l.status,
        createdAt: l.createdAt,
        paidAmount: l.paidAmount // Ensure paidAmount is logged for debugging
      })))
    }



    // Process salary data for each pumper
    const salaryData = pumpers.map(pumper => {
      // Filter shifts where this pumper worked
      interface PumperBreakdown {
        pumperName: string
        calculatedSales?: number
        advanceTaken?: number
        variance?: number
        varianceStatus?: string
      }
      interface DeclaredAmounts {
        pumperBreakdown?: PumperBreakdown[]
      }

      const pumperShifts = shifts.filter(shift => {
        const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
        const pumperBreakdown = declaredAmounts?.pumperBreakdown || []
        return pumperBreakdown.some(pb => pb.pumperName === pumper.name) ||
          shift.assignments.some(a => a.pumperName === pumper.name)
      })

      // Get base salary (default to 27000 if not set)
      const baseSalary = (pumper.baseSalary !== null && pumper.baseSalary !== undefined && pumper.baseSalary > 0)
        ? pumper.baseSalary
        : 27000

      // Get holiday allowance from pumper settings (default to 4500 if not set)
      const holidayAllowance = (pumper.holidayAllowance !== null && pumper.holidayAllowance !== undefined && pumper.holidayAllowance > 0)
        ? pumper.holidayAllowance
        : 4500
      const restDayDeduction = 900 // Deduction per rest day
      const allowedRestDays = 5 // 5 rest days per month

      // Calculate OT rate per hour: ((basic/30) / 8) * 1.5
      const dailySalary = baseSalary / 30
      const hourlyRate = dailySalary / 8
      const overtimeRate = hourlyRate * 1.5

      let totalHours = 0
      let totalSales = 0
      let totalAdvances = 0
      let totalVarianceAdd = 0 // Amount to add to salary
      let totalVarianceDeduct = 0 // Amount to deduct from salary
      let shiftCount = 0
      let totalOvertimeHours = 0
      let totalOvertimeAmount = 0
      const workedDates = new Set<string>() // Track unique dates worked
      const shiftDetails: Array<{
        shiftId: string
        date: string
        hours: number
        sales: number
        advance: number
        variance: number
        varianceStatus: string
        overtimeHours?: number
        overtimeAmount?: number
      }> = []

      pumperShifts.forEach(shift => {
        const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
        const pumperBreakdown = declaredAmounts?.pumperBreakdown || []
        const breakdown = pumperBreakdown.find(pb => pb.pumperName === pumper.name)

        if (breakdown) {
          const shiftStart = new Date(shift.startTime)
          const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date()
          const hours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60)

          // Track worked date (just the date, not time)
          const workedDate = shiftEnd.toISOString().split('T')[0]
          workedDates.add(workedDate)

          totalHours += hours
          totalSales += breakdown.calculatedSales || 0
          totalAdvances += breakdown.advanceTaken || 0

          // Calculate overtime for this shift (if > 8 hours)
          let shiftOvertimeHours = 0
          let shiftOvertimeAmount = 0
          if (hours > 8) {
            shiftOvertimeHours = hours - 8
            shiftOvertimeAmount = shiftOvertimeHours * overtimeRate
            totalOvertimeHours += shiftOvertimeHours
            totalOvertimeAmount += shiftOvertimeAmount
          }

          // Handle variance adjustments based on varianceStatus from shift close
          // Variance = Calculated Sales - Effective Declared
          // If |variance| > 20: add/deduct FULL variance amount
          // If |variance| <= 20: ignore (NORMAL - no adjustment)
          // The varianceStatus is already correctly set in shift close page, so trust it
          if (breakdown.varianceStatus === 'ADD_TO_SALARY') {
            // Surplus - declared more than calculated, reward with FULL variance bonus
            totalVarianceAdd += Math.abs(breakdown.variance || 0)
          } else if (breakdown.varianceStatus === 'DEDUCT_FROM_SALARY') {
            // Shortage - declared less than calculated, deduct FULL variance from salary
            totalVarianceDeduct += Math.abs(breakdown.variance || 0)
          }
          // If status is 'NORMAL', no variance adjustment needed (|variance| <= 20)

          shiftCount++

          shiftDetails.push({
            shiftId: shift.id,
            date: workedDate,
            hours: Math.round(hours * 100) / 100,
            sales: breakdown.calculatedSales || 0,
            advance: breakdown.advanceTaken || 0,
            variance: breakdown.variance || 0,
            varianceStatus: breakdown.varianceStatus || 'NORMAL',
            overtimeHours: Math.round(shiftOvertimeHours * 100) / 100,
            overtimeAmount: Math.round(shiftOvertimeAmount * 100) / 100
          })
        }
      })

      // Get loans for this pumper from LoanPumper records
      // Match by exact pumper name (case-insensitive for safety)
      const pumperLoansFromRecords = loanPumperRecords.filter(loan =>
        loan.pumperName.toLowerCase().trim() === pumper.name.toLowerCase().trim()
      )

      // Debug: Log loans for this pumper
      if (pumperLoansFromRecords.length > 0) {
        console.log(`[Salary API] Pumper: ${pumper.name}, Found ${pumperLoansFromRecords.length} loans:`,
          pumperLoansFromRecords.map(l => ({
            id: l.id,
            amount: l.amount,
            monthlyRental: l.monthlyRental,
            status: l.status,
            createdAt: l.createdAt,
            pumperName: l.pumperName
          }))
        )
      }

      // Calculate monthly loan rental deductions (not total loan amount)
      // All loans in pumperLoansFromRecords are already active and created before endDate
      // Sum monthly rental amounts from all active loans
      const totalMonthlyRental = pumperLoansFromRecords.reduce((sum, loan) => {
        const rental = loan.monthlyRental || 0
        console.log(`[Salary API] Loan ${loan.id}: monthlyRental = ${rental}`)
        return sum + rental
      }, 0)

      // Calculate total outstanding loan amount (sum of remaining balances)
      const totalLoanAmount = pumperLoansFromRecords.reduce((sum, loan) => {
        const paidAmount = loan.paidAmount || 0
        const remainingAmount = loan.amount - paidAmount
        return sum + remainingAmount
      }, 0)

      // Note: Safe transactions for pumper loans are now tracked via LoanPumper records
      // We no longer count safe transactions separately for monthly rental calculation
      // Loans created from safe page now create LoanPumper records with monthlyRental

      const totalLoans = totalMonthlyRental // Use monthly rental instead of loan amount

      if (totalLoans > 0) {
        console.log(`[Salary API] Total monthly rental for ${pumper.name}: Rs. ${totalLoans}`)
      } else if (loanPumperRecords.length > 0) {
        console.log(`[Salary API] Warning: Found ${loanPumperRecords.length} active loans but 0 for pumper ${pumper.name}. Pumper names in loans:`,
          loanPumperRecords.map(l => l.pumperName)
        )
      }

      // Calculate commission: 1 rs per 1000rs sales
      const commission = Math.floor(totalSales / 1000)

      // Calculate rest days deduction
      // Total days in salary period (from 7th to 6th of next month = ~30 days)
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysWorked = workedDates.size
      // Rest days taken = total days in period - days worked
      // They are allowed 5 rest days. For each rest day taken (up to 5), deduct 900rs
      const totalRestDays = daysInPeriod - daysWorked
      const restDaysTaken = Math.min(totalRestDays, allowedRestDays) // Cap at 5 allowed rest days
      // Deduct 900rs for each rest day taken (up to the 5 allowed)
      const restDayDeductionAmount = restDaysTaken * restDayDeduction
      const actualHolidayAllowance = holidayAllowance - restDayDeductionAmount

      // Calculate EPF (Employee Provident Fund) - typically 8% of gross salary
      // EPF = 8% of (baseSalary + holidayAllowance + overtime + commission)
      const grossSalary = baseSalary + actualHolidayAllowance + totalOvertimeAmount + commission
      const epf = Math.round(grossSalary * 0.08 * 100) / 100

      // Calculate net salary
      // Formula: Base Salary + Holiday Allowance + Overtime + Commission + Variance Bonuses 
      //          - Variance Deductions - Advances - Loans - EPF
      // Net Salary = Base + Allowance + OT + Commission + Additions - Deductions - EPF
      const netSalary = baseSalary + actualHolidayAllowance + totalOvertimeAmount + commission + totalVarianceAdd
        - totalVarianceDeduct - totalAdvances - totalLoans - epf

      // Always return data for the pumper, even if they have no shifts
      return {
        pumperId: pumper.id,
        pumperName: pumper.name,
        employeeId: pumper.employeeId,
        baseSalary: baseSalary,
        holidayAllowance: actualHolidayAllowance,
        restDaysTaken: restDaysTaken,
        daysWorked: daysWorked,
        shiftCount,
        totalHours: Math.round(totalHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalOvertimeAmount: Math.round(totalOvertimeAmount * 100) / 100,
        commission: commission,
        totalSales: Math.round(totalSales),
        totalAdvances: Math.round(totalAdvances * 100) / 100,
        totalLoans: Math.round(totalLoans * 100) / 100,
        totalLoanAmount: Math.round(totalLoanAmount * 100) / 100,
        varianceAdd: Math.round(totalVarianceAdd * 100) / 100,
        varianceDeduct: Math.round(totalVarianceDeduct * 100) / 100,
        epf: epf,
        netSalary: Math.round(netSalary * 100) / 100,
        shiftDetails
      }
    })

    // If pumperId is specified and no data found, return empty data for that pumper
    if (pumperId && salaryData.length === 0) {
      const pumper = await prisma.pumper.findUnique({
        where: { id: pumperId },
        select: {
          id: true,
          name: true,
          employeeId: true,
          baseSalary: true,
          holidayAllowance: true
        }
      })

      if (pumper) {
        // Get loans even if no shifts
        const pumperLoansFromRecords = loanPumperRecords.filter(loan =>
          loan.pumperName.toLowerCase().trim() === pumper.name.toLowerCase().trim()
        )
        // Calculate monthly loan rental deductions (not total loan amount)
        // All loans in pumperLoansFromRecords are already active and created before endDate
        // Sum monthly rental amounts from all active loans
        const totalMonthlyRental = pumperLoansFromRecords.reduce((sum, loan) => {
          return sum + (loan.monthlyRental || 0)
        }, 0)

        const totalLoans = totalMonthlyRental // Use monthly rental instead of loan amount
        const baseSalary = (pumper.baseSalary !== null && pumper.baseSalary !== undefined && pumper.baseSalary > 0)
          ? pumper.baseSalary
          : 27000
        const holidayAllowance = (pumper.holidayAllowance !== null && pumper.holidayAllowance !== undefined && pumper.holidayAllowance > 0)
          ? pumper.holidayAllowance
          : 4500
        const restDayDeduction = 900
        const allowedRestDays = 5
        const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        // If no shifts worked, assume they took all 5 rest days (deduct full allowance)
        const totalRestDays = daysInPeriod - 0 // 0 days worked
        const restDaysTaken = Math.min(totalRestDays, allowedRestDays)
        const restDayDeductionAmount = restDaysTaken * restDayDeduction
        const actualHolidayAllowance = holidayAllowance - restDayDeductionAmount
        const grossSalary = baseSalary + actualHolidayAllowance
        const epf = Math.round(grossSalary * 0.08 * 100) / 100
        const netSalary = baseSalary + actualHolidayAllowance - totalLoans - epf

        return NextResponse.json({
          month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          salaryData: [{
            pumperId: pumper.id,
            pumperName: pumper.name,
            employeeId: pumper.employeeId,
            baseSalary: baseSalary,
            holidayAllowance: actualHolidayAllowance,
            restDaysTaken: restDaysTaken,
            daysWorked: 0,
            shiftCount: 0,
            totalHours: 0,
            totalOvertimeHours: 0,
            totalOvertimeAmount: 0,
            commission: 0,
            totalSales: 0,
            totalAdvances: 0,
            totalLoans: Math.round(totalLoans * 100) / 100,
            varianceAdd: 0,
            varianceDeduct: 0,
            epf: epf,
            netSalary: Math.round(netSalary * 100) / 100,
            shiftDetails: []
          }]
        })
      }
    }

    return NextResponse.json({
      month: month || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      salaryData
    })
  } catch (error) {
    console.error('Error fetching salary data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch salary data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

