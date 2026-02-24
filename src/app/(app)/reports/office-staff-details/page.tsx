'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth } from '@/lib/businessMonth'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
    Users,
    ArrowLeft,
    RefreshCw,
    Download,
    AlertTriangle,
    AlertCircle,
    FileText,
    FileSpreadsheet,
    Wallet,
    CheckCircle2,
    Briefcase,
    PhoneCall,
    Mail,
    Calendar
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import * as XLSX from 'xlsx'

interface ActiveLoan {
    id: string
    description: string
    amount: number
    paidAmount: number
    balance: number
    monthlyRental: number
    createdAt: string
    dueDate: string | null
}

interface StaffDetail {
    id: string
    name: string
    employeeId: string
    role: string
    phone: string
    email: string
    isActive: boolean
    hireDate: string | null
    baseSalary: number
    specialAllowance: number
    otherAllowances: number
    medicalAllowance: number
    holidayAllowance: number
    fuelAllowance: number
    totalAllowances: number
    grossSalary: number
    totalLoanBalance: number
    activeLoansCount: number
    activeLoans: ActiveLoan[]
}

interface ReportData {
    summary: {
        totalStaff: number
        activeStaff: number
        managers: number
        officeStaffCount: number
        totalGrossSalary: number
        totalLoanBalance: number
        totalActiveLoans: number
    }
    staffDetails: StaffDetail[]
}

const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
]

const roleColors: Record<string, string> = {
    MANAGER: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    OFFICE_STAFF: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
}

export default function OfficeStaffDetailsReport() {
    const { stations, selectedStation, isAllStations } = useStation()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [selectedStaff, setSelectedStaff] = useState<string>('all')

    const station = stations.find(s => s.id === selectedStation)
    const monthStartDay = station?.monthStartDate || 1

    const currentBusinessMonth = getCurrentBusinessMonth(monthStartDay)
    const [selectedYear, setSelectedYear] = useState(currentBusinessMonth.year.toString())
    const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))

    const years = Array.from({ length: 3 }, (_, i) => {
        const year = currentBusinessMonth.year - i
        return { value: year.toString(), label: year.toString() }
    })

    const fetchReport = useCallback(async () => {
        if (!selectedStation) {
            setError('Please select a station')
            return
        }

        try {
            setLoading(true)
            setError('')
            const res = await fetch(`/api/reports/office-staff-details?stationId=${selectedStation}`)
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to fetch report')
            }
            const data = await res.json()
            setReportData(data)
        } catch (err) {
            console.error('Error fetching office staff details:', err)
            setError(err instanceof Error ? err.message : 'Failed to load report')
        } finally {
            setLoading(false)
        }
    }, [selectedStation])

    useEffect(() => {
        if (selectedStation) {
            fetchReport()
        }
    }, [selectedStation, fetchReport])

    const exportToPDF = () => {
        if (!reportData) return
        const station = stations.find(s => s.id === selectedStation)
        const stationName = station?.name || 'All Stations'
        const monthLabel = `${selectedYear}-${selectedMonth}`
        // Build a simple PDF using the data
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.setFontSize(18)
        doc.text(`Office Staff Details Report — ${stationName}`, 14, 20)
        doc.setFontSize(11)
        doc.text(`Period: ${monthLabel}`, 14, 28)
        doc.setFontSize(10)
        doc.text(`Total Staff: ${reportData.summary.totalStaff}  |  Managers: ${reportData.summary.managers}  |  Total Gross Salary: Rs. ${reportData.summary.totalGrossSalary.toLocaleString()}  |  Active Loans: ${reportData.summary.totalActiveLoans}`, 14, 36)

        autoTable(doc, {
            startY: 44,
            head: [['Name', 'ID', 'Role', 'Phone', 'Base Salary', 'Allowances', 'Gross Salary', 'Loan Balance', 'Loans', 'Status']],
            body: reportData.staffDetails.map(s => [
                s.name,
                s.employeeId,
                s.role.replace('_', ' '),
                s.phone || '—',
                `Rs. ${s.baseSalary.toLocaleString()}`,
                `Rs. ${s.totalAllowances.toLocaleString()}`,
                `Rs. ${s.grossSalary.toLocaleString()}`,
                s.totalLoanBalance > 0 ? `Rs. ${s.totalLoanBalance.toLocaleString()}` : '—',
                s.activeLoansCount || '—',
                s.isActive ? 'Active' : 'Inactive'
            ]),
            headStyles: { fillColor: [139, 92, 246] },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            styles: { fontSize: 8, cellPadding: 2.5 }
        })
        doc.save(`office-staff-details-${stationName.replace(/\s+/g, '-')}-${monthLabel}.pdf`)
    }

    const exportToExcel = () => {
        if (!reportData) return
        const station = stations.find(s => s.id === selectedStation)
        const stationName = station?.name || 'All Stations'
        const monthLabel = `${selectedYear}-${selectedMonth}`
        const excelData = reportData.staffDetails.map(s => ({
            'Name': s.name,
            'Employee ID': s.employeeId,
            'Role': s.role.replace('_', ' '),
            'Phone': s.phone || '',
            'Email': s.email || '',
            'Status': s.isActive ? 'Active' : 'Inactive',
            'Hire Date': s.hireDate ? new Date(s.hireDate).toLocaleDateString() : '',
            'Base Salary (Rs)': s.baseSalary,
            'Special Allowance (Rs)': s.specialAllowance,
            'Other Allowances (Rs)': s.otherAllowances,
            'Medical Allowance (Rs)': s.medicalAllowance,
            'Holiday Allowance (Rs)': s.holidayAllowance,
            'Fuel Allowance (Rs)': s.fuelAllowance,
            'Total Allowances (Rs)': s.totalAllowances,
            'Gross Salary (Rs)': s.grossSalary,
            'Active Loans': s.activeLoansCount,
            'Loan Balance (Rs)': s.totalLoanBalance
        }))
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(excelData)
        ws['!cols'] = [
            { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 28 },
            { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 22 },
            { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 18 },
            { wch: 14 }, { wch: 18 }
        ]
        XLSX.utils.book_append_sheet(wb, ws, 'Office Staff')
        XLSX.writeFile(wb, `office-staff-details-${stationName.replace(/\s+/g, '-')}-${monthLabel}.xlsx`)
    }

    if (loading && !reportData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
            </div>
        )
    }

    const selectedStaffData = selectedStaff && selectedStaff !== 'all'
        ? reportData?.staffDetails.find(s => s.id === selectedStaff)
        : null

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                            <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                            Office Staff Details
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Profiles, allowances and financial records for office staff
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchReport} size="sm" disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={!reportData}>
                                <Download className="h-4 w-4 mr-2" />
                                Export Report
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                                <FileText className="mr-2 h-4 w-4 text-red-600" />
                                <span>Export as PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                                <span>Export as Excel</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* All Stations Warning */}
            {isAllStations && (
                <div className="flex items-center p-4 text-amber-800 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="font-medium">Please select a specific station to view this report.</span>
                </div>
            )}

            {/* Filters */}
            <Card className="border-none shadow-sm bg-muted/40">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Period Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-1">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Period Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Employee Profile</Label>
                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="All Staff Members" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">View All Staff Members</SelectItem>
                                    {reportData?.staffDetails.map(staff => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.name} - {staff.employeeId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Summary Cards */}
            {reportData && selectedStaff === 'all' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <Badge variant="outline" className="text-white border-white/40 bg-white/10">Total Staff</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-3xl font-bold">{reportData.summary.totalStaff}</p>
                                    <p className="text-sm text-purple-100 flex items-center justify-between">
                                        <span>Active: {reportData.summary.activeStaff}</span>
                                        <span>{reportData.summary.managers} Managers</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Payroll</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                    Rs. {(reportData.summary.totalGrossSalary || 0).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Wallet className="h-3 w-3" />
                                    <span>Combined gross salary</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className={`${roleColors.MANAGER} border-transparent`}>
                                        {reportData.summary.managers} Managers
                                    </Badge>
                                    <Badge variant="outline" className={`${roleColors.OFFICE_STAFF} border-transparent`}>
                                        {reportData.summary.officeStaffCount} Office Staff
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Financial Health</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                    Rs. {(reportData.summary.totalLoanBalance || 0).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{reportData.summary.totalActiveLoans} Active Loans</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Individual Staff View */}
            {selectedStaffData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Card */}
                    <Card className="lg:col-span-1 overflow-hidden border-none shadow-md">
                        <div className="h-32 bg-gradient-to-br from-purple-800 to-violet-900 relative">
                            <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-background to-transparent"></div>
                        </div>
                        <CardContent className="relative pt-0 px-6 pb-6">
                            <div className="flex justify-between items-end -mt-12 mb-6">
                                <div className="h-24 w-24 rounded-full border-4 border-background bg-purple-100 flex items-center justify-center text-purple-600 text-3xl font-bold shadow-sm">
                                    {selectedStaffData.name.charAt(0)}
                                </div>
                                <Badge className={`${roleColors[selectedStaffData.role] || ''} text-sm px-3 py-1`}>
                                    {selectedStaffData.role.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-foreground">{selectedStaffData.name}</h2>
                                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                    <span>ID: {selectedStaffData.employeeId}</span>
                                    {!selectedStaffData.isActive && (
                                        <Badge variant="outline" className="text-red-600 border-red-300 text-xs">Inactive</Badge>
                                    )}
                                </p>
                            </div>

                            <div className="space-y-3 text-sm">
                                {selectedStaffData.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <PhoneCall className="h-4 w-4" />
                                        <span>{selectedStaffData.phone}</span>
                                    </div>
                                )}
                                {selectedStaffData.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span>{selectedStaffData.email}</span>
                                    </div>
                                )}
                                {selectedStaffData.hireDate && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Joined {new Date(selectedStaffData.hireDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-4 border-t mt-4">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Wallet className="h-4 w-4" /> Salary Breakdown
                                </h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Base Salary</span>
                                    <span className="font-medium">Rs. {selectedStaffData.baseSalary.toLocaleString()}</span>
                                </div>
                                {selectedStaffData.specialAllowance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Special Allowance</span>
                                        <span className="font-medium text-green-600">+Rs. {selectedStaffData.specialAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.medicalAllowance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Medical</span>
                                        <span className="font-medium text-green-600">+Rs. {selectedStaffData.medicalAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.holidayAllowance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Holiday</span>
                                        <span className="font-medium text-green-600">+Rs. {selectedStaffData.holidayAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.fuelAllowance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Fuel</span>
                                        <span className="font-medium text-green-600">+Rs. {selectedStaffData.fuelAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.otherAllowances > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Other</span>
                                        <span className="font-medium text-green-600">+Rs. {selectedStaffData.otherAllowances.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                    <span className="font-semibold text-foreground">Gross Salary</span>
                                    <span className="font-bold text-purple-600">Rs. {selectedStaffData.grossSalary.toLocaleString()}</span>
                                </div>
                                {selectedStaffData.totalLoanBalance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Loan Balance</span>
                                        <span className="font-medium text-red-600">Rs. {selectedStaffData.totalLoanBalance.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Column - Loans */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Gross Monthly</div>
                                    <div className="text-2xl font-bold text-purple-600">Rs. {selectedStaffData.grossSalary.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Allowances</div>
                                    <div className="text-2xl font-bold text-green-600">Rs. {selectedStaffData.totalAllowances.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Active Loans</CardTitle>
                                <CardDescription>Outstanding loan balances for this staff member</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {selectedStaffData.activeLoans.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedStaffData.activeLoans.map(loan => (
                                            <div key={loan.id} className="flex justify-between items-start p-3 border rounded-lg bg-muted/20">
                                                <div>
                                                    <div className="font-medium text-sm">{loan.description}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(loan.createdAt).toLocaleDateString()}
                                                        {loan.dueDate && ` · Due ${new Date(loan.dueDate).toLocaleDateString()}`}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Total: Rs. {loan.amount.toLocaleString()} · Paid: Rs. {loan.paidAmount.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-red-600 text-sm">Rs. {loan.balance.toLocaleString()}</div>
                                                    {loan.monthlyRental > 0 && (
                                                        <div className="text-xs text-muted-foreground">Rs. {loan.monthlyRental.toLocaleString()}/mo</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <CheckCircle2 className="h-8 w-8 mb-2 text-green-500 opacity-50" />
                                        <p className="text-sm">No active loans</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* All Staff Table */}
            {reportData && selectedStaff === 'all' && (
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Staff Overview</CardTitle>
                        <CardDescription>
                            Office staff profiles and salary snapshot for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left p-3 font-semibold text-muted-foreground">Staff Member</th>
                                        <th className="text-left p-3 font-semibold text-muted-foreground">Role</th>
                                        <th className="text-right p-3 font-semibold text-muted-foreground">Base Salary</th>
                                        <th className="text-right p-3 font-semibold text-muted-foreground">Allowances</th>
                                        <th className="text-right p-3 font-semibold text-muted-foreground">Gross Salary</th>
                                        <th className="text-right p-3 font-semibold text-muted-foreground">Loan Balance</th>
                                        <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                                        <th className="text-center p-3 font-semibold text-muted-foreground">View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.staffDetails.map((staff) => (
                                        <tr key={staff.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center font-bold text-xs text-purple-600">
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{staff.name}</p>
                                                        <p className="text-xs text-muted-foreground">{staff.employeeId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className={roleColors[staff.role] || ''}>
                                                    {staff.role.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="text-right p-3 font-medium">Rs. {staff.baseSalary.toLocaleString()}</td>
                                            <td className="text-right p-3 text-green-600 font-medium">
                                                {staff.totalAllowances > 0 ? `+Rs. ${staff.totalAllowances.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="text-right p-3 font-bold text-purple-600">Rs. {staff.grossSalary.toLocaleString()}</td>
                                            <td className="text-right p-3">
                                                {staff.activeLoansCount > 0 ? (
                                                    <span className="text-red-600 font-medium text-xs">Rs. {staff.totalLoanBalance.toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant={staff.isActive ? 'outline' : 'secondary'} className={staff.isActive ? 'text-green-600 border-green-300' : ''}>
                                                    {staff.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="text-center p-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setSelectedStaff(staff.id)}
                                                >
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
