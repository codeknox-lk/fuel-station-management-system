import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')

        if (!stationId) {
            return NextResponse.json({ error: 'stationId is required' }, { status: 400 })
        }

        // Verify station belongs to organization
        const station = await prisma.station.findFirst({
            where: { id: stationId, organizationId: user.organizationId }
        })
        if (!station) {
            return NextResponse.json({ error: 'Station not found' }, { status: 404 })
        }

        // Fetch all office staff for the station
        const officeStaff = await prisma.officeStaff.findMany({
            where: { stationId, organizationId: user.organizationId },
            orderBy: [{ role: 'asc' }, { name: 'asc' }]
        })

        // Fetch active loans for office staff (matched by staffName)
        const activeLoans = await prisma.loanOfficeStaff.findMany({
            where: {
                stationId,
                organizationId: user.organizationId,
                status: 'ACTIVE'
            }
        })

        // Fetch salary payments for office staff
        const salaryPayments = await prisma.officeStaffSalaryPayment.findMany({
            where: {
                stationId,
                organizationId: user.organizationId,
                status: 'PAID'
            },
            orderBy: { paymentDate: 'desc' },
            take: 100 // Get recent payments to filter per staff
        })

        // Build per-staff detail objects
        const staffDetails = officeStaff.map(staff => {
            const staffLoans = activeLoans.filter(
                loan => loan.staffName?.toLowerCase().trim() === staff.name.toLowerCase().trim()
            )

            const staffPayments = salaryPayments.filter(
                p => p.officeStaffId === staff.id
            )

            const totalLoanBalance = staffLoans.reduce(
                (s, l) => s + Math.max(0, l.amount - (l.paidAmount || 0)),
                0
            )

            const totalAllowances =
                (staff.specialAllowance || 0) +
                (staff.otherAllowances || 0) +
                (staff.medicalAllowance || 0) +
                (staff.holidayAllowance || 0) +
                (staff.fuelAllowance || 0)

            const grossSalary = (staff.baseSalary || 0) + totalAllowances

            return {
                id: staff.id,
                name: staff.name,
                employeeId: staff.employeeId || '—',
                role: staff.role,
                phone: staff.phone || '',
                email: staff.email || '',
                isActive: staff.isActive,
                hireDate: staff.hireDate ? staff.hireDate.toISOString() : null,
                baseSalary: staff.baseSalary || 0,
                specialAllowance: staff.specialAllowance || 0,
                otherAllowances: staff.otherAllowances || 0,
                medicalAllowance: staff.medicalAllowance || 0,
                holidayAllowance: staff.holidayAllowance || 0,
                fuelAllowance: staff.fuelAllowance || 0,
                totalAllowances,
                grossSalary,
                totalLoanBalance,
                activeLoansCount: staffLoans.length,
                activeLoans: staffLoans.map(l => ({
                    id: l.id,
                    description: l.reason || 'General Loan',
                    amount: l.amount,
                    paidAmount: l.paidAmount || 0,
                    balance: Math.max(0, l.amount - (l.paidAmount || 0)),
                    monthlyRental: l.monthlyRental || 0,
                    createdAt: l.createdAt.toISOString(),
                    dueDate: l.dueDate ? l.dueDate.toISOString() : null
                })),
                recentPayments: staffPayments.map(p => ({
                    id: p.id,
                    date: p.paymentDate?.toISOString() || p.createdAt.toISOString(),
                    amount: p.netSalary,
                    method: p.paymentMethod,
                    status: p.status
                }))
            }
        })

        // Summary
        return NextResponse.json({
            summary: {
                totalStaff: staffDetails.length,
                activeStaff: staffDetails.filter(s => s.isActive).length,
                managers: staffDetails.filter(s => s.role === 'MANAGER').length,
                officeStaffCount: staffDetails.filter(s => s.role === 'OFFICE_STAFF').length,
                totalGrossSalary: staffDetails.reduce((s, p) => s + p.grossSalary, 0),
                totalLoanBalance: staffDetails.reduce((s, p) => s + p.totalLoanBalance, 0),
                totalActiveLoans: staffDetails.reduce((s, p) => s + p.activeLoansCount, 0)
            },
            staffDetails
        })
    } catch (error) {
        console.error('Error fetching office staff details report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
