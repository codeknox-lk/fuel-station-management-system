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
    let officeStaff: any[] = []
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
    
    // Get loan records for office staff (we'll use external loans or create office staff loans later)
    // For now, we'll check external loans by matching names
    let externalLoans: any[] = []
    try {
      externalLoans = await prisma.loanExternal.findMany({
        where: {
          stationId,
          status: 'ACTIVE',
          createdAt: {
            lte: monthEndDate // Loans created before or during the month
          }
        }
      })
    } catch (loanError) {
      console.error('Error fetching external loans for office staff:', loanError)
      // Continue without loans if there's an error
      externalLoans = []
    }

    // Fetch all advance expenses once for the month
    
    let advanceExpenses: any[] = []
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
      console.error('Error fetching advances for office staff:', expenseError)
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
      const staffAdvances = advanceExpenses.filter(expense => 
        expense.description?.toLowerCase().includes(staff.name.toLowerCase()) ||
        expense.paidBy?.toLowerCase().includes(staff.name.toLowerCase())
      )
      const advances = staffAdvances.reduce((sum, expense) => sum + (expense.amount || 0), 0)

      // Calculate loans (matching by name from external loans)
      const staffLoans = externalLoans.filter(loan => 
        loan.borrowerName.toLowerCase().trim() === staff.name.toLowerCase().trim()
      )
      const loans = staffLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0)

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