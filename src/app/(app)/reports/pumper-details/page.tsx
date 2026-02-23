'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth } from '@/lib/businessMonth'
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
  Fuel,
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Wallet,
  Activity,
  CheckCircle2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { exportPumperDetailsReportPDF, exportPumperDetailsReportExcel } from '@/lib/exportUtils'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

interface ActiveLoan {
  id: string
  description?: string
  amount: number
  balance: number
  monthlyRental: number
  createdAt: string
}

interface RecentShift {
  shiftId: string
  date: string
  sales: number
  variance: number
  liters: number
}

interface PumperDetail {
  id: string
  name: string
  code: string
  status: string
  employeeId: string
  phoneNumber: string
  address: string
  nic: string
  baseSalary: number
  holidayAllowance: number
  epfNumber: string
  totalShifts: number
  totalSales: number
  totalLiters: number
  averageSalesPerShift: number
  averageLitersPerShift: number
  totalVariance: number
  shiftsWithVariance: number
  varianceRate: number
  performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'
  totalLoanBalance: number
  totalMonthlyRental: number
  advanceLimit: number
  activeLoansCount: number
  totalSalaryPaid: number
  periodAdvances: number
  totalSettledAdvances: number
  totalLoanDeductions: number
  activeLoans: ActiveLoan[]
  loanTotal: number
  attendanceDays: number
  performanceScore: number
  lastActive: string
  recentShifts: RecentShift[]
  shiftsInPeriod: RecentShift[]
  fuelTypeBreakdown: Array<{
    fuelType: string
    liters: number
    shifts: number
  }>
  recentSalaryPayments: Array<{
    id: string
    paymentDate: string
    baseSalary: number
    varianceAdd: number
    varianceDeduct: number
    advances: number
    loans: number
    netSalary: number
  }>
}

interface ReportData {
  summary: {
    totalPumpers: number
    activePumpers: number
    totalShifts: number
    totalSales: number
    totalLiters: number
    totalShortages: number
    totalAllowances: number
    avgPerformance: number
    activeLoansCount: number
    totalSalaryPaid: number
    excellentPerformers: number
    goodPerformers: number
    needsImprovement: number
    criticalPerformers: number
    totalActiveLoans: number
    totalLoanBalance: number
    totalVariance: number
    avgEfficiency: number
    topPerformer: {
      name: string
      efficiency: number
      id: string
    } | null
  }
  pumperDetails: PumperDetail[]
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

const performanceColors: Record<PumperDetail['performanceRating'], string> = {
  EXCELLENT: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  GOOD: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  NEEDS_IMPROVEMENT: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
}

const formatFuelName = (fuelName: string | null | undefined): string => {
  if (!fuelName) return 'Unknown'
  return fuelName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function PumperDetailsReport() {
  const { stations, selectedStation, isAllStations } = useStation()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [selectedPumper, setSelectedPumper] = useState<string>('all')

  // Month selection
  const currentBusinessMonth = getCurrentBusinessMonth()
  const [selectedYear, setSelectedYear] = useState(currentBusinessMonth.year.toString())
  const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))

  const years = Array.from({ length: 3 }, (_, i) => {
    const year = currentBusinessMonth.year - i
    return { value: year.toString(), label: year.toString() }
  })

  const exportToPDF = () => {
    if (!reportData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const exportData = {
      summary: reportData.summary,
      pumperDetails: reportData.pumperDetails
    }

    exportPumperDetailsReportPDF(exportData, stationName, monthLabel)
  }

  const exportToExcel = () => {
    if (!reportData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const exportData = {
      summary: reportData.summary,
      pumperDetails: reportData.pumperDetails
    }

    exportPumperDetailsReportExcel(exportData, stationName, monthLabel)
  }

  const fetchReport = useCallback(async () => {
    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    try {
      setLoading(true)
      setError('')

      const year = parseInt(selectedYear)
      const month = parseInt(selectedMonth)
      const startDate = new Date(year, month - 1, 7)
      const endDate = new Date(year, month, 6, 23, 59, 59)

      const res = await fetch(
        `/api/reports/pumper-details?stationId=${selectedStation}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch report')
      }

      const data = await res.json()
      setReportData(data)
    } catch (err) {
      console.error('Error fetching pumper details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [selectedStation, selectedYear, selectedMonth])

  useEffect(() => {
    if (selectedStation) {
      fetchReport()
    }
  }, [selectedStation, selectedYear, selectedMonth, fetchReport])

  if (loading && !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
      </div>
    )
  }

  const selectedPumperData = selectedPumper && selectedPumper !== 'all'
    ? reportData?.pumperDetails.find(p => p.id === selectedPumper)
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
              <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Pumper Performance
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed performance metrics and financial records for pumpers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReport} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
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
              <Select value={selectedPumper} onValueChange={setSelectedPumper}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Pumpers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">View All Pumpers</SelectItem>
                  {reportData?.pumperDetails.map(pumper => (
                    <SelectItem key={pumper.id} value={pumper.id}>
                      {pumper.name} - {pumper.employeeId}
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
      {reportData && selectedPumper === 'all' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-white border-white/40 bg-white/10">Total Pumpers</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold">{reportData.summary.totalPumpers}</p>
                  <p className="text-sm text-orange-100 flex items-center justify-between">
                    <span>Active: {reportData.summary.activePumpers || reportData.summary.totalPumpers}</span>
                    <span>{reportData.summary.totalShifts} Shifts</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Period Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  Rs. {(reportData.summary.totalSales || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Fuel className="h-3 w-3" />
                  <span>{(reportData.summary.totalLiters || 0).toLocaleString()} L dispensed</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-100 italic">Top Performer</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.summary.topPerformer ? (
                  <div className="flex flex-col">
                    <div className="text-xl font-bold truncate">{reportData.summary.topPerformer.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white"
                          style={{ width: `${reportData.summary.topPerformer.efficiency}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-purple-100">{reportData.summary.topPerformer.efficiency.toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-purple-200">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Performance Overview</span>
                  <Activity className="h-3 w-3" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold">{(reportData.summary.avgEfficiency || 0).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground pb-1">Team Efficiency</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                    <span>Performance Mix</span>
                    <span>Total: {reportData.summary.totalPumpers}</span>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${(reportData.summary.excellentPerformers / reportData.summary.totalPumpers) * 100}%` }}></div>
                    <div className="bg-blue-500 h-full" style={{ width: `${(reportData.summary.goodPerformers / reportData.summary.totalPumpers) * 100}%` }}></div>
                    <div className="bg-orange-500 h-full" style={{ width: `${(reportData.summary.needsImprovement / reportData.summary.totalPumpers) * 100}%` }}></div>
                    <div className="bg-red-500 h-full" style={{ width: `${(reportData.summary.criticalPerformers / reportData.summary.totalPumpers) * 100}%` }}></div>
                  </div>
                  <div className="flex flex-wrap gap-y-1 gap-x-3 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                      <span>Exc: {reportData.summary.excellentPerformers}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      <span>Good: {reportData.summary.goodPerformers}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                      <span>Review: {reportData.summary.needsImprovement}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                      <span>Critical: {reportData.summary.criticalPerformers}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Financial Status</span>
                  <Wallet className="h-3 w-3" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold">Rs. {reportData.summary.totalLoanBalance.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      {reportData.summary.totalActiveLoans} Active Loans
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600">Rs. {reportData.summary.totalVariance.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Total Variation</div>
                  </div>
                </div>
                <div className="pt-2 border-t flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Salary Paid</span>
                  <span className="font-semibold text-foreground">Rs. {reportData.summary.totalSalaryPaid.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Individual Pumper View - Player Card Style */}
      {selectedPumperData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card (clean, consistent design) */}
          <Card className="lg:col-span-1 border-none shadow-md">
            <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-400 rounded-t-xl"></div>
            <CardContent className="p-4 space-y-4">
              {/* Name + badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground leading-tight">{selectedPumperData.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedPumperData.employeeId} · Pumper</p>
                  {selectedPumperData.phoneNumber && selectedPumperData.phoneNumber !== 'N/A' && (
                    <p className="text-[11px] text-muted-foreground">{selectedPumperData.phoneNumber}</p>
                  )}
                </div>
                <Badge className={`${performanceColors[selectedPumperData.performanceRating]} shrink-0 text-[10px] px-2 py-0.5`}>
                  {selectedPumperData.performanceRating.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/10 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Shifts</div>
                  <div className="text-lg font-bold text-orange-700 dark:text-orange-400">{selectedPumperData.totalShifts}</div>
                </div>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Liters</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{(selectedPumperData.totalLiters / 1000).toFixed(1)}k</div>
                </div>
              </div>

              {/* Financial Status */}
              <div className="space-y-1.5 border-t pt-3">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-1">
                  <Wallet className="h-3 w-3" /> Financial Status
                </h3>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span className="font-medium font-mono">Rs. {(selectedPumperData.baseSalary || 0).toLocaleString()}</span>
                </div>
                {selectedPumperData.holidayAllowance > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Holiday Allowance</span>
                    <span className="font-medium text-green-600 font-mono">+Rs. {selectedPumperData.holidayAllowance.toLocaleString()}</span>
                  </div>
                )}
                {selectedPumperData.periodAdvances > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Shift Advances</span>
                    <span className="font-medium text-orange-600 font-mono">-Rs. {selectedPumperData.periodAdvances.toLocaleString()}</span>
                  </div>
                )}
                {selectedPumperData.totalSettledAdvances > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Settled Advances</span>
                    <span className="font-medium text-blue-600 font-mono">-Rs. {selectedPumperData.totalSettledAdvances.toLocaleString()}</span>
                  </div>
                )}
                {selectedPumperData.totalLoanDeductions > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Loan Deductions</span>
                    <span className="font-medium text-red-600 font-mono">-Rs. {selectedPumperData.totalLoanDeductions.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Loan Balance</span>
                  <span className={`font-medium font-mono ${selectedPumperData.totalLoanBalance > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    Rs. {selectedPumperData.totalLoanBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t pt-1.5 mt-0.5">
                  <span className="font-semibold text-foreground">Net Pay (Latest)</span>
                  <span className="font-bold text-green-600 font-mono text-sm">
                    Rs. {(selectedPumperData.recentSalaryPayments[0]?.netSalary || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Variance Summary */}
              <div className="space-y-1.5 border-t pt-3">
                <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-1">
                  <Activity className="h-3 w-3" /> Performance
                </h3>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Variance Rate</span>
                  <span className={`font-medium ${selectedPumperData.varianceRate > 30 ? 'text-red-600' : selectedPumperData.varianceRate > 15 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedPumperData.varianceRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Shifts with Variance</span>
                  <span className="font-medium">{selectedPumperData.shiftsWithVariance} / {selectedPumperData.totalShifts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Middle & Right Column - Stats & Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedPumperData.recentShifts?.slice().reverse() || []}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={12}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(val: number) => [`Rs. ${val.toLocaleString()}`, 'Sales']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Fuel Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(selectedPumperData.fuelTypeBreakdown || []).filter(f => f.fuelType).map((fuel) => (
                      <div key={fuel.fuelType} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{formatFuelName(fuel.fuelType)}</span>
                          <span className="text-muted-foreground">{fuel.liters.toLocaleString()} L</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 dark:bg-orange-400"
                            style={{ width: `${selectedPumperData.totalLiters > 0 ? (fuel.liters / selectedPumperData.totalLiters) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">Active Loans</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPumperData.activeLoans.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPumperData.activeLoans.map(loan => (
                        <div key={loan.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/20">
                          <div>
                            <div className="font-medium text-sm">{loan.description || 'Personal Loan'}</div>
                            <div className="text-xs text-muted-foreground">{new Date(loan.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600 text-sm">Rs. {loan.balance.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">bal</div>
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

            {/* Shift History Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Shift History</CardTitle>
                  <CardDescription>Detailed list of all assignments in this period</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {selectedPumperData.shiftsInPeriod.length} Assignments
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Date</th>
                        <th className="text-left p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Shift ID</th>
                        <th className="text-right p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Sales</th>
                        <th className="text-right p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Liters</th>
                        <th className="text-right p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Variance</th>
                        <th className="text-center p-3 font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPumperData.shiftsInPeriod.map((shift) => (
                        <tr
                          key={shift.shiftId}
                          className="hover:bg-muted/50 cursor-pointer transition-colors group border-b"
                          onClick={() => router.push(`/shifts/${shift.shiftId}`)}
                        >
                          <td className="px-3 py-2 text-xs">
                            {new Date(shift.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono text-muted-foreground group-hover:text-foreground">
                            {shift.shiftId.slice(0, 8)}...
                          </td>
                          <td className="px-3 py-2 text-xs font-mono text-right">
                            Rs. {shift.sales.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-xs font-mono text-right">
                            {shift.liters.toLocaleString()} L
                          </td>
                          <td className={`px-3 py-2 text-xs font-mono text-right ${Math.abs(shift.variance) > 50 ? 'text-red-600 font-bold' :
                            shift.variance < 0 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                            {shift.variance > 0 ? '+' : ''}{shift.variance.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="outline" className="text-[9px] h-4 bg-green-50 text-green-700 border-green-200 px-1">
                              CLOSED
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {selectedPumperData.shiftsInPeriod.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                            No shift records found for this period.
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

      {/* All Pumpers Table */}
      {reportData && selectedPumper === 'all' && (
        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Pumper Overview</CardTitle>
            <CardDescription>Performance comparison for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Pumper</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Shifts</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Sales</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Efficiency</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Rating</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Loans</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Salary Paid</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.pumperDetails.map((pumper) => (
                    <tr key={pumper.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
                            {pumper.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{pumper.name}</p>
                            <p className="text-xs text-muted-foreground">{pumper.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right p-3">
                        <span className="font-medium bg-muted px-2 py-1 rounded text-xs">{pumper.totalShifts}</span>
                      </td>
                      <td className="text-right p-3 font-medium">Rs. {(pumper.totalSales || 0).toLocaleString()}</td>
                      <td className="text-right p-3">
                        <div className="flex flex-col items-end">
                          <span className={pumper.varianceRate > 15 ? 'text-red-600 font-bold' : 'text-green-600'}>
                            {(100 - pumper.varianceRate).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`${performanceColors[pumper.performanceRating]}`}>
                          {pumper.performanceRating.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="text-right p-3">
                        {pumper.activeLoansCount > 0 ? (
                          <span className="text-red-600 font-medium text-xs">Rs. {(pumper.totalLoanBalance || 0).toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="text-right p-3 text-muted-foreground">Rs. {(pumper.totalSalaryPaid || 0).toLocaleString()}</td>
                      <td className="text-center p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedPumper(pumper.id)}
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
