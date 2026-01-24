'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth, formatBusinessMonthRange } from '@/lib/businessMonth'
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  PieLabelRenderProps
} from 'recharts'
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { exportCreditCustomerReportPDF, exportCreditCustomerReportExcel } from '@/lib/exportUtils'

interface CreditCustomerReport {
  summary: {
    totalCustomers: number
    activeCustomers: number
    totalOutstanding: number
    totalCreditSales: number
    totalPayments: number
    overdueCustomers: number
    averageBalance: number
  }
  customerDetails: Array<{
    id: string
    name: string
    company: string
    phoneNumber: string
    address: string
    currentBalance: number
    creditLimit: number
    salesInPeriod: number
    paymentsInPeriod: number
    transactionCount: number
    paymentCount: number
    lastPaymentDate: string | null
    daysSinceLastPayment: number | null
    isOverdue: boolean
    agingCategory: string
    utilizationPercent: number
  }>
  agingBreakdown: {
    'Current': { count: number, amount: number }
    '1-30 days': { count: number, amount: number }
    '31-60 days': { count: number, amount: number }
    '61-90 days': { count: number, amount: number }
    '90+ days': { count: number, amount: number }
  }
  dailyBreakdown: Array<{
    date: string
    sales: number
    payments: number
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

const AGING_COLORS = {
  'Current': '#10b981',
  '1-30 days': '#3b82f6',
  '31-60 days': '#f59e0b',
  '61-90 days': '#ef4444',
  '90+ days': '#7c2d12'
}

export default function CreditReportPage() {
  const router = useRouter()
  const { selectedStation, stations } = useStation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState<CreditCustomerReport | null>(null)

  // Month selection - using business month
  const currentBusinessMonth = getCurrentBusinessMonth()
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
      customerDetails: reportData.customerDetails
    }

    exportCreditCustomerReportPDF(exportData, stationName, monthLabel)
  }

  const exportToExcel = () => {
    if (!reportData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const exportData = {
      summary: reportData.summary,
      customerDetails: reportData.customerDetails
    }

    exportCreditCustomerReportExcel(exportData, stationName, monthLabel)
  }

  useEffect(() => {
    if (selectedStation) {
      fetchReport()
    }
  }, [selectedStation, selectedYear, selectedMonth])

  const fetchReport = async () => {
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
      const startDate = new Date(year, month - 1, 7)
      const endDate = new Date(year, month, 6, 23, 59, 59)

      const res = await fetch(
        `/api/reports/credit-summary?stationId=${selectedStation}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Credit Summary API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to fetch credit customer report')
      }

      const data = await res.json()
      setReportData(data)
    } catch (err) {
      console.error('Error fetching credit customer report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  // Prepare pie chart data
  const agingPieData = reportData ? Object.entries(reportData.agingBreakdown)
    .filter(([_, data]) => data.amount > 0)
    .map(([category, data]) => ({
      name: category,
      value: data.amount,
      count: data.count
    })) : []

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
            <h1 className="text-3xl font-bold text-foreground">Credit Customer Reports</h1>
            <p className="text-muted-foreground mt-2">
              Credit sales, payments, and outstanding balance analysis
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select year and month to view credit customer data</CardDescription>
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
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Total Customers</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {reportData.summary.totalCustomers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reportData.summary.activeCustomers} with balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Outstanding</h3>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  Rs. {reportData.summary.totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: Rs. {reportData.summary.averageBalance.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Credit Sales</h3>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  Rs. {reportData.summary.totalCreditSales.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Overdue</h3>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {reportData.summary.overdueCustomers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Customers 30+ days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend Chart */}
          <FormCard
            title="Daily Credit Sales & Payments"
            description={`Business Month: ${formatBusinessMonthRange({ startDate: new Date(reportData.dateRange.start), endDate: new Date(reportData.dateRange.end), month: parseInt(selectedMonth), year: parseInt(selectedYear), label: `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` })}`}
          >
            <div className="w-full h-96 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const d = new Date(value)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Credit Sales"
                  />
                  <Line
                    type="monotone"
                    dataKey="payments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Payments Received"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </FormCard>

          {/* Aging Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormCard title="Aging Analysis" description="Outstanding balance by age">
              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: PieLabelRenderProps) => {
                        const percent = ((props.percent as number) ?? 0) * 100
                        return `${props.name}: ${percent.toFixed(0)}%`
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agingPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={AGING_COLORS[entry.name as keyof typeof AGING_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </FormCard>

            <FormCard title="Aging Breakdown" description="Detailed aging statistics">
              <div className="space-y-3 mt-4">
                {Object.entries(reportData.agingBreakdown).map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 rounded border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: AGING_COLORS[category as keyof typeof AGING_COLORS] }}
                      />
                      <div>
                        <p className="font-semibold">{category}</p>
                        <p className="text-sm text-muted-foreground">{data.count} customers</p>
                      </div>
                    </div>
                    <p className="font-semibold">Rs. {data.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </FormCard>
          </div>

          {/* Customer Details Table */}
          <FormCard title="Customer Details" description="Complete credit customer overview">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 bg-muted/30">
                    <th className="text-left p-3 font-semibold">Customer</th>
                    <th className="text-right p-3 font-semibold">Outstanding</th>
                    <th className="text-right p-3 font-semibold">Credit Limit</th>
                    <th className="text-right p-3 font-semibold">Utilization</th>
                    <th className="text-right p-3 font-semibold">Sales (Period)</th>
                    <th className="text-right p-3 font-semibold">Payments (Period)</th>
                    <th className="text-left p-3 font-semibold">Last Payment</th>
                    <th className="text-left p-3 font-semibold">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.customerDetails.map((customer, index) => (
                    <tr key={customer.id} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.company}</p>
                          <p className="text-xs text-muted-foreground">{customer.phoneNumber}</p>
                        </div>
                      </td>
                      <td className="text-right p-3">
                        <span className={customer.currentBalance > 0 ? 'text-red-600 font-semibold' : ''}>
                          Rs. {customer.currentBalance.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-right p-3">
                        Rs. {customer.creditLimit.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        <span className={`px-2 py-1 rounded text-xs ${customer.utilizationPercent > 80 ? 'bg-red-100 text-red-700' :
                          customer.utilizationPercent > 50 ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {customer.utilizationPercent.toFixed(0)}%
                        </span>
                      </td>
                      <td className="text-right p-3">Rs. {customer.salesInPeriod.toLocaleString()}</td>
                      <td className="text-right p-3">Rs. {customer.paymentsInPeriod.toLocaleString()}</td>
                      <td className="p-3">
                        {customer.lastPaymentDate
                          ? new Date(customer.lastPaymentDate).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="p-3">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${AGING_COLORS[customer.agingCategory as keyof typeof AGING_COLORS]}20`,
                            color: AGING_COLORS[customer.agingCategory as keyof typeof AGING_COLORS]
                          }}
                        >
                          {customer.agingCategory}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormCard>
        </>
      )}
    </div>
  )
}
