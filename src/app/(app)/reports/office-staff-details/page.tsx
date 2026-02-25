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
    RefreshCw,
    Download,
    ArrowLeft,
    Activity,
    AlertTriangle,
    AlertCircle,
    FileText,
    FileSpreadsheet,
    Wallet,
    CheckCircle2,
    Briefcase,
    ArrowRight
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

interface StaffPayment {
    id: string
    date: string
    amount: number
    method: string
    status: string
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
    recentPayments: StaffPayment[]
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
                            Detailed professional profiles and financial records for office personnel
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
                                    <SelectValue placeholder="All Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">View All Staff</SelectItem>
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
                                <div className="text-3xl font-bold mb-1">{reportData.summary.totalStaff}</div>
                                <p className="text-xs text-purple-100 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {reportData.summary.activeStaff} Active Personnel
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Activity className="h-6 w-6 text-white" />
                                    </div>
                                    <Badge variant="outline" className="text-white border-white/40 bg-white/10">Role Mix</Badge>
                                </div>
                                <div className="text-3xl font-bold mb-1">{reportData.summary.managers}</div>
                                <p className="text-xs text-blue-100 italic">Managers / {reportData.summary.officeStaffCount} Staff</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Wallet className="h-6 w-6 text-white" />
                                    </div>
                                    <Badge variant="outline" className="text-white border-white/40 bg-white/10">Total Payroll</Badge>
                                </div>
                                <div className="text-2xl font-bold mb-1">Rs. {reportData.summary.totalGrossSalary.toLocaleString()}</div>
                                <p className="text-xs text-green-100">Monthly Gross Commitment</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-none shadow-md dark:bg-slate-900 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    Loan Exposure
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-2xl font-bold text-foreground">
                                    Rs. {(reportData.summary.totalLoanBalance || 0).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>{reportData.summary.totalActiveLoans} Active Staff Loans</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Individual Staff View - Profile Card Style */}
            {selectedStaffData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Card */}
                    <Card className="lg:col-span-1 border-none shadow-md">
                        <div className="h-2 bg-gradient-to-r from-purple-500 to-violet-400 rounded-t-xl"></div>
                        <CardContent className="p-4 space-y-4">
                            {/* Name + badge */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground leading-tight">{selectedStaffData.name}</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">{selectedStaffData.employeeId} · {selectedStaffData.role.replace('_', ' ')}</p>
                                    {selectedStaffData.phone && (
                                        <p className="text-[11px] text-muted-foreground">{selectedStaffData.phone}</p>
                                    )}
                                </div>
                                <Badge className={`${roleColors[selectedStaffData.role]} shrink-0 text-[10px] px-2 py-0.5`}>
                                    {selectedStaffData.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                            </div>

                            {/* Quick stats / Professional Mix */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/10 p-2 text-center">
                                    <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Role</div>
                                    <div className="text-sm font-bold text-purple-700 dark:text-purple-400">
                                        {selectedStaffData.role === 'MANAGER' ? 'Management' : 'Office'}
                                    </div>
                                </div>
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-2 text-center">
                                    <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Commitment</div>
                                    <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                        Full Time
                                    </div>
                                </div>
                            </div>

                            {/* Financial Status */}
                            <div className="space-y-1.5 border-t pt-3">
                                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-1">
                                    <Wallet className="h-3 w-3" /> Financial Status
                                </h3>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Base Salary</span>
                                    <span className="font-medium font-mono">Rs. {selectedStaffData.baseSalary.toLocaleString()}</span>
                                </div>
                                {selectedStaffData.specialAllowance > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Special Allowance</span>
                                        <span className="font-medium text-green-600 font-mono">+Rs. {selectedStaffData.specialAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.medicalAllowance > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Medical</span>
                                        <span className="font-medium text-green-600 font-mono">+Rs. {selectedStaffData.medicalAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.holidayAllowance > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Holiday</span>
                                        <span className="font-medium text-green-600 font-mono">+Rs. {selectedStaffData.holidayAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.fuelAllowance > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Fuel</span>
                                        <span className="font-medium text-green-600 font-mono">+Rs. {selectedStaffData.fuelAllowance.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedStaffData.otherAllowances > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Other</span>
                                        <span className="font-medium text-green-600 font-mono">+Rs. {selectedStaffData.otherAllowances.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs border-t pt-1.5 mt-0.5">
                                    <span className="font-semibold text-foreground">Gross Salary</span>
                                    <span className="font-bold text-purple-600 font-mono text-sm">
                                        Rs. {selectedStaffData.grossSalary.toLocaleString()}
                                    </span>
                                </div>
                                {selectedStaffData.totalLoanBalance > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Loan Balance</span>
                                        <span className="font-medium text-red-600 font-mono">Rs. {selectedStaffData.totalLoanBalance.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Contact & Info */}
                            <div className="space-y-1.5 border-t pt-3">
                                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-1">
                                    <Users className="h-3 w-3" /> Professional Info
                                </h3>
                                {selectedStaffData.email && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Email</span>
                                        <span className="text-foreground truncate ml-4">{selectedStaffData.email}</span>
                                    </div>
                                )}
                                {selectedStaffData.hireDate && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Joined</span>
                                        <span className="text-foreground">{new Date(selectedStaffData.hireDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Middle & Right Column - Stats & History */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="h-full">
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-purple-600" />
                                        Salary Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Base Proportion</span>
                                                <span className="text-muted-foreground">{((selectedStaffData.baseSalary / selectedStaffData.grossSalary) * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 dark:bg-purple-400"
                                                    style={{ width: `${(selectedStaffData.baseSalary / selectedStaffData.grossSalary) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Allowances</span>
                                                <span className="text-muted-foreground">{((selectedStaffData.totalAllowances / selectedStaffData.grossSalary) * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 dark:bg-green-400"
                                                    style={{ width: `${(selectedStaffData.totalAllowances / selectedStaffData.grossSalary) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="h-full">
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        Active Loans
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedStaffData.activeLoans.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedStaffData.activeLoans.map(loan => (
                                                <div key={loan.id} className="flex justify-between items-center p-2 border rounded-lg bg-red-50/30 dark:bg-red-900/10">
                                                    <div>
                                                        <div className="font-medium text-xs truncate max-w-[120px]">{loan.description}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">Bal: Rs. {loan.balance.toLocaleString()}</div>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] px-1 h-5 border-red-200 text-red-700">ACTIVE</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                                            <CheckCircle2 className="h-6 w-6 mb-1 text-green-500 opacity-50" />
                                            <p className="text-xs">No active loans</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Payment History Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-lg">Payment History</CardTitle>
                                    <CardDescription>Recent salary disbursements for this period</CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono">
                                    {selectedStaffData.recentPayments.length} Payments
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/30">
                                                <th className="text-left p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Date</th>
                                                <th className="text-left p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Method</th>
                                                <th className="text-right p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Amount</th>
                                                <th className="text-center p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedStaffData.recentPayments.map((payment) => (
                                                <tr
                                                    key={payment.id}
                                                    className="hover:bg-muted/50 transition-colors border-b"
                                                >
                                                    <td className="px-3 py-2 text-xs">
                                                        {new Date(payment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-medium text-muted-foreground">
                                                        {payment.method}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-mono font-bold text-right text-purple-600">
                                                        Rs. {payment.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <Badge variant="outline" className="text-[9px] h-4 bg-green-50 text-green-700 border-green-200 px-1">
                                                            {payment.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedStaffData.recentPayments.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
                                                        No payment records found for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
                                                    <ArrowRight className="h-4 w-4" />
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
