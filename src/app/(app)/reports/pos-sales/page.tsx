'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth, getBusinessMonth, formatBusinessMonthRange } from '@/lib/businessMonth'
import { FormCard } from '@/components/ui/FormCard'
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  DollarSign,
  CreditCard,
  Building,
  FileText,
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react'
import { exportPOSSalesReportPDF, exportPOSSalesReportExcel } from '@/lib/exportUtils'

interface POSSalesReport {
  summary: {
    totalSales: number
    totalTransactions: number
    totalTerminals: number
    totalBanks: number
    missingSlipsCount: number
    reconciledBatches: number
    unreconciledBatches: number
  }
  dailyBreakdown: Array<{
    date: string
    totalAmount: number
    transactionCount: number
  }>
  dailyByBank: Array<{
    bankId: string
    bankName: string
    dailySales: Array<{
      date: string
      amount: number
    }>
  }>
  dailyByTerminal: Array<{
    terminalId: string
    terminalName: string
    terminalNumber: string
    bankName: string
    dailySales: Array<{
      date: string
      amount: number
    }>
  }>
  bankBreakdown: Array<{
    bankName: string
    totalAmount: number
    transactionCount: number
    visa: number
    master: number
    amex: number
    qr: number
    dialogTouch: number
  }>
  terminalBreakdown: Array<{
    terminalId: string
    terminalName: string
    terminalNumber: string
    bankName: string
    totalAmount: number
    transactionCount: number
    visa: number
    master: number
    amex: number
    qr: number
    dialogTouch: number
  }>

  missingSlips: Array<{
    id: string
    terminalName: string
    lastFourDigits: string
    amount: number
    timestamp: string
    reportedBy: string
  }>
  dateRange: {
    start: string
    end: string
  }
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

export default function POSSalesReportPage() {
  const router = useRouter()
  const { selectedStation, stations, isAllStations } = useStation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState<POSSalesReport | null>(null)
  const [dailyViewMode, setDailyViewMode] = useState<'bank' | 'pos'>('bank')

  const station = stations.find(s => s.id === selectedStation)
  const monthStartDay = station?.monthStartDate || 1

  // Month selection - using business month
  const currentBusinessMonth = getCurrentBusinessMonth(monthStartDay)
  const [selectedYear, setSelectedYear] = useState(currentBusinessMonth.year.toString())
  const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))

  // Generate years
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
      bankBreakdown: reportData.bankBreakdown,
      terminalBreakdown: reportData.terminalBreakdown
    }

    exportPOSSalesReportPDF(exportData, stationName, monthLabel)
  }

  const exportToExcel = () => {
    if (!reportData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const exportData = {
      summary: reportData.summary,
      bankBreakdown: reportData.bankBreakdown,
      terminalBreakdown: reportData.terminalBreakdown
    }

    exportPOSSalesReportExcel(exportData, stationName, monthLabel)
  }

  const fetchReport = useCallback(async () => {
    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Calculate business month date range
      const year = parseInt(selectedYear)
      const month = parseInt(selectedMonth)

      const { startDate, endDate } = getBusinessMonth(month, year, monthStartDay)

      const res = await fetch(
        `/api/reports/pos-sales?stationId=${selectedStation}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('POS Sales API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to fetch POS sales report')
      }

      const data = await res.json()
      setReportData(data)
    } catch (err) {
      console.error('Error fetching POS sales report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [selectedStation, selectedYear, selectedMonth, monthStartDay])

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">POS/Bank Sales Report</h1>
            <p className="text-muted-foreground mt-2">
              ATM and POS machine sales with bank reconciliation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!reportData}>
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
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select year and month to view POS sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Total POS Sales</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  Rs. {(reportData.summary.totalSales || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Card Transactions</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(reportData.summary.totalTransactions || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Banks</h3>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {reportData.summary.totalBanks}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Missing Slips</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {reportData.summary.missingSlipsCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend Chart - Multiple Lines (One per Bank) */}
          <FormCard
            title="Daily POS Sales Trend by Bank"
            description={`Sales trends grouped by bank - Business Month: ${formatBusinessMonthRange({ startDate: new Date(reportData.dateRange.start), endDate: new Date(reportData.dateRange.end), month: parseInt(selectedMonth), year: parseInt(selectedYear), label: `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` })}`}
          >
            <div className="w-full h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  // Merge all bank data into single data points per date
                  interface ChartDataPoint {
                    date: string
                    totalAmount: number
                    [key: string]: string | number
                  }
                  return reportData.dailyBreakdown.map(day => {
                    const dataPoint: ChartDataPoint = { date: day.date, totalAmount: day.totalAmount }
                    reportData.dailyByBank.forEach(bank => {
                      const bankDay = bank.dailySales.find(s => s.date === day.date)
                      dataPoint[bank.bankName] = bankDay?.amount || 0
                    })
                    return dataPoint
                  })
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      if (typeof value === 'string' && value.includes('-')) {
                        const parts = value.split('-')
                        if (parts.length === 3) return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}`
                      }
                      return value
                    }}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                    labelFormatter={(date) => {
                      if (typeof date === 'string' && date.includes('-')) {
                        const parts = date.split('-')
                        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
                      }
                      return date
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {/* Create a line for each POS terminal */}
                  {reportData.dailyByBank.map((bank, index) => {
                    // Generate different colors for each bank
                    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
                    const color = colors[index % colors.length]

                    return (
                      <Line
                        key={bank.bankId}
                        type="monotone"
                        dataKey={bank.bankName}
                        stroke={color}
                        strokeWidth={3}
                        name={bank.bankName}
                        dot={{ r: 4 }}
                      />
                    )
                  })}
                  {/* Total line removed as per user request */}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </FormCard>

          {/* Daily Sales View with Dropdown */}
          <FormCard
            title="Daily Sales Breakdown"
            description="View daily sales by bank or POS machine"
          >
            <div className="mb-4">
              <Label htmlFor="daily-view-mode" className="mb-2 block font-semibold">
                Group By:
              </Label>
              <Select value={dailyViewMode} onValueChange={(value) => setDailyViewMode(value as 'bank' | 'pos')}>
                <SelectTrigger id="daily-view-mode" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Wise Sales (Daily)</SelectItem>
                  <SelectItem value="pos">POS Machine Wise Sales (Daily)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 bg-orange-100 dark:bg-orange-900/30">
                    <th className="text-left p-3 font-bold sticky left-0 bg-orange-100 dark:bg-orange-900/30">Date</th>
                    {dailyViewMode === 'bank' ? (
                      reportData.dailyByBank.map(bank => (
                        <th key={bank.bankId} className="text-right p-3 font-bold min-w-[150px]">
                          {bank.bankName}
                        </th>
                      ))
                    ) : (
                      reportData.dailyByTerminal.map(terminal => (
                        <th key={terminal.terminalId} className="text-right p-3 font-bold min-w-[120px]">
                          {terminal.terminalNumber}
                        </th>
                      ))
                    )}
                    <th className="text-right p-3 font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/40 min-w-[150px]">
                      Daily Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.dailyBreakdown.map((day, index) => (
                    <tr key={day.date} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-3 font-semibold sticky left-0 bg-inherit">{day.date}</td>
                      {dailyViewMode === 'bank' ? (
                        reportData.dailyByBank.map(bank => {
                          const bankDay = bank.dailySales.find(s => s.date === day.date)
                          return (
                            <td key={bank.bankId} className="text-right p-3 text-sm">
                              Rs. {(bankDay?.amount || (0) || 0).toLocaleString()}
                            </td>
                          )
                        })
                      ) : (
                        reportData.dailyByTerminal.map(terminal => {
                          const terminalDay = terminal.dailySales.find(s => s.date === day.date)
                          return (
                            <td key={terminal.terminalId} className="text-right p-3 text-sm">
                              Rs. {(terminalDay?.amount || (0) || 0).toLocaleString()}
                            </td>
                          )
                        })
                      )}
                      <td className="text-right p-3 font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                        Rs. {(day.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormCard>

          {/* Individual POS Machines - Summary Table */}
          <FormCard title="POS Machine Summary" description="Total sales by each POS terminal">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 bg-orange-100 dark:bg-orange-900/30">
                    <th className="text-left p-3 font-bold">POS Terminal</th>
                    <th className="text-left p-3 font-bold">Terminal #</th>
                    <th className="text-left p-3 font-bold">Bank</th>
                    <th className="text-right p-3 font-bold">Transactions</th>
                    <th className="text-right p-3 font-bold">Visa</th>
                    <th className="text-right p-3 font-bold">Master</th>
                    <th className="text-right p-3 font-bold">Amex</th>
                    <th className="text-right p-3 font-bold">QR</th>
                    <th className="text-right p-3 font-bold">Dialog</th>
                    <th className="text-right p-3 font-bold text-orange-600">Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.terminalBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-muted-foreground">
                        No POS sales data available for this period
                      </td>
                    </tr>
                  ) : (
                    reportData.terminalBreakdown.map((terminal, index) => (
                      <tr key={terminal.terminalId} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                        <td className="p-3 font-bold text-orange-600">{terminal.terminalName}</td>
                        <td className="p-3 text-sm bg-gray-100 dark:bg-gray-800">{terminal.terminalNumber}</td>
                        <td className="p-3 text-sm">{terminal.bankName}</td>
                        <td className="text-right p-3 font-semibold">{terminal.transactionCount}</td>
                        <td className="text-right p-3 text-sm text-orange-600">Rs. {(terminal.visa || 0).toLocaleString()}</td>
                        <td className="text-right p-3 text-sm text-orange-600">Rs. {(terminal.master || 0).toLocaleString()}</td>
                        <td className="text-right p-3 text-sm text-green-600">Rs. {(terminal.amex || 0).toLocaleString()}</td>
                        <td className="text-right p-3 text-sm text-orange-600">Rs. {(terminal.qr || 0).toLocaleString()}</td>
                        <td className="text-right p-3 text-sm text-red-600">Rs. {(terminal.dialogTouch || 0).toLocaleString()}</td>
                        <td className="text-right p-3 font-bold text-lg text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                          Rs. {(terminal.totalAmount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </FormCard>

          {/* Bank Totals */}
          <FormCard title="Total by Bank" description="Aggregated sales totals by bank">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 bg-muted/30">
                    <th className="text-left p-3 font-semibold">Bank</th>
                    <th className="text-right p-3 font-semibold">Transactions</th>
                    <th className="text-right p-3 font-semibold">Visa</th>
                    <th className="text-right p-3 font-semibold">Master</th>
                    <th className="text-right p-3 font-semibold">Amex</th>
                    <th className="text-right p-3 font-semibold">QR</th>
                    <th className="text-right p-3 font-semibold">Dialog Touch</th>
                    <th className="text-right p-3 font-semibold text-orange-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.bankBreakdown.map((bank, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-3 font-medium">{bank.bankName}</td>
                      <td className="text-right p-3">{bank.transactionCount}</td>
                      <td className="text-right p-3 text-sm">Rs. {(bank.visa || 0).toLocaleString()}</td>
                      <td className="text-right p-3 text-sm">Rs. {(bank.master || 0).toLocaleString()}</td>
                      <td className="text-right p-3 text-sm">Rs. {(bank.amex || 0).toLocaleString()}</td>
                      <td className="text-right p-3 text-sm">Rs. {(bank.qr || 0).toLocaleString()}</td>
                      <td className="text-right p-3 text-sm">Rs. {(bank.dialogTouch || 0).toLocaleString()}</td>
                      <td className="text-right p-3 font-semibold text-orange-600">
                        Rs. {(bank.totalAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormCard>


          {/* Missing Slips */}
          {reportData.missingSlips.length > 0 && (
            <FormCard title="Missing Slips" description="Unresolved missing POS slips" className="border-orange-500/20">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 bg-muted/30">
                      <th className="text-left p-3 font-semibold">Terminal</th>
                      <th className="text-left p-3 font-semibold">Last 4 Digits</th>
                      <th className="text-right p-3 font-semibold">Amount</th>
                      <th className="text-left p-3 font-semibold">Timestamp</th>
                      <th className="text-left p-3 font-semibold">Reported By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.missingSlips.map((slip) => (
                      <tr key={slip.id} className="border-b">
                        <td className="p-3">{slip.terminalName}</td>
                        <td className="p-3">****{slip.lastFourDigits}</td>
                        <td className="text-right p-3">Rs. {(slip.amount || 0).toLocaleString()}</td>
                        <td className="p-3">{new Date(slip.timestamp).toLocaleString()}</td>
                        <td className="p-3">{slip.reportedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FormCard>
          )}
        </>
      )}
    </div>
  )
}
