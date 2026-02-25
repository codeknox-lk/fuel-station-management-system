import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface OfficeStaffSalaryData {
  id: string
  name: string
  employeeId: string | null
  role: string
  baseSalary: number
  specialAllowance: number
  otherAllowances: number
  medicalAllowance: number
  holidayAllowance: number
  fuelAllowance: number
  totalAllowances: number
  advances: number
  loans: number
  absentDays: number
  absentDeduction: number
  epf: number
  totalDeductions: number
  grossSalary: number
  netSalary: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const month = searchParams.get('month') // Format: YYYY-MM

    if (!stationId) {
      return NextResponse.json(
        { error: 'Station ID is required' },
        { status: 400 }
      )
    }

    if (!month) {
      return NextResponse.json(
        { error: 'Month is required (format: YYYY-MM)' },
        { status: 400 }
      )
    }

    // Get all active office staff for the station
    // Get all active office staff for the station
    // Define types consistent with Prisma models
    // Since we're not importing the full Prisma client types, we define compatible interfaces or use 'any' with care
    // Ideally we should import from @prisma/client but let's try to infer or use simple any if imports are hard
    // But since the goal is to Remove any... let's try to use proper typing if possible or acceptable replacement
    // We can use typeof result inference? No, we initialize with [].

    // Let's use basic interfaces for what we need
    interface OfficeStaff {
      id: string;
      name: string;
      role: string;
      employeeId: string | null;
      baseSalary: number | null;
      specialAllowance: number | null;
      otherAllowances: number | null;
      medicalAllowance: number | null;
      holidayAllowance: number | null;
      fuelAllowance: number | null;
    }

    let officeStaff: OfficeStaff[] = []
    try {
      officeStaff = await prisma.officeStaff.findMany({
        where: {
          stationId,
          isActive: true
        },
        orderBy: [
          { role: 'asc' },
          { name: 'asc' }
        ]
      })
    } catch (staffError) {
      console.error('Error fetching office staff:', staffError)
      // Return empty array if there's an error (e.g., table doesn't exist yet)
      officeStaff = []
    }

    // Parse month to create proper date (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number)
    const monthStartDate = new Date(year, monthNum - 1, 1)
    const monthEndDate = new Date(year, monthNum, 0, 23, 59, 59, 999) // Last day of the month

    // Get active loan records for office staff
    interface OfficeStaffLoan {
      id: string;
      staffName: string;
      amount: number;
      monthlyRental: number | null;
      status: string;
      reason: string;
    }
    let officeStaffLoans: OfficeStaffLoan[] = []
    try {
      officeStaffLoans = await prisma.loanOfficeStaff.findMany({
        where: {
          stationId,
          status: 'ACTIVE',
          createdAt: {
            lte: monthEndDate // Loans created before or during the month
          }
        },
        select: {
          id: true,
          staffName: true,
          amount: true,
          monthlyRental: true,
          status: true,
          reason: true
        }
      })
    } catch (loanCategoryError) {
      console.error('Error fetching office staff loans:', loanCategoryError)
      officeStaffLoans = []
    }

    // Fetch all advance expenses once for the month (Legacy fallback)
    interface Expense {
      amount: number;
      description: string | null;
      paidBy: string | null;
    }
    let advanceExpenses: Expense[] = []
    try {
      advanceExpenses = await prisma.expense.findMany({
        where: {
          stationId,
          expenseDate: {
            gte: monthStartDate,
            lte: monthEndDate
          },
          OR: [
            { category: 'ADVANCE' },
            { description: { contains: 'advance', mode: 'insensitive' } }
          ]
        }
      })
    } catch (expenseError) {
      console.error('Error fetching legacy advances for office staff:', expenseError)
      advanceExpenses = []
    }

    // Calculate salary for each office staff member
    const salaryData: OfficeStaffSalaryData[] = officeStaff.map((staff) => {
      // Get allowances from staff record
      const baseSalary = staff.baseSalary || 0
      const specialAllowance = staff.specialAllowance || 0
      const otherAllowances = staff.otherAllowances || 0
      const medicalAllowance = staff.medicalAllowance || 0
      const holidayAllowance = staff.holidayAllowance || 0
      // Fuel allowance only for managers
      const fuelAllowance = (staff.role === 'MANAGER') ? (staff.fuelAllowance || 0) : 0

      const totalAllowances = specialAllowance + otherAllowances + medicalAllowance + holidayAllowance + fuelAllowance

      // Calculate gross salary: baseSalary + all allowances
      const grossSalary = baseSalary + totalAllowances

      // Calculate advances from expenses (match by staff name in description or paidBy field)
      const staffAdvancesFromExpenses = advanceExpenses.filter(expense =>
        expense.description?.toLowerCase().includes(staff.name.toLowerCase()) ||
        expense.paidBy?.toLowerCase().includes(staff.name.toLowerCase())
      )
      const legacyAdvances = staffAdvancesFromExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Calculate categories from new loan records (distinguished by reason prefix)
      const pumperLoansFromRecords = officeStaffLoans.filter(loan =>
        loan.staffName.toLowerCase().trim() === staff.name.toLowerCase().trim()
      )

      let safeAdvances = 0
      let safeLoans = 0

      pumperLoansFromRecords.forEach(loan => {
        const isAdvance = loan.reason?.startsWith('[ADVANCE]')
        const rental = loan.monthlyRental || 0
        if (isAdvance) {
          safeAdvances += rental
        } else {
          safeLoans += rental
        }
      })

      const advances = legacyAdvances + safeAdvances
      const loans = safeLoans

      // Absent days deduction
      // Note: Absent days tracking is a future feature that will require:
      // 1. Attendance tracking system for office staff
      // 2. Integration with shift/attendance records
      // 3. Policy configuration for deduction rates
      // For now, defaulting to 0 absent days
      const absentDays = 0
      const absentDeductionPerDay = baseSalary / 30 // Daily salary rate
      const absentDeduction = absentDays * absentDeductionPerDay

      // Calculate EPF: 8% of gross salary
      const epf = Math.round(grossSalary * 0.08 * 100) / 100

      // Total deductions: advances + loans + absent deduction + EPF
      const totalDeductions = advances + loans + absentDeduction + epf

      // Calculate net salary: grossSalary - totalDeductions
      const netSalary = Math.max(0, grossSalary - totalDeductions)

      return {
        id: staff.id,
        name: staff.name,
        employeeId: staff.employeeId,
        role: staff.role,
        baseSalary,
        specialAllowance,
        otherAllowances,
        medicalAllowance,
        holidayAllowance,
        fuelAllowance,
        totalAllowances,
        advances: Math.round(advances * 100) / 100,
        loans: Math.round(loans * 100) / 100,
        absentDays,
        absentDeduction: Math.round(absentDeduction * 100) / 100,
        epf,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        netSalary: Math.round(netSalary * 100) / 100
      }
    })

    return NextResponse.json({
      month,
      stationId,
      salaryData
    })
  } catch (error) {
    console.error('Error calculating office staff salary:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}
