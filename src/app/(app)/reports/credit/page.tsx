'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth } from '@/lib/businessMonth'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  PieLabelRenderProps,
} from 'recharts'
import {
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Send,
  Wallet,
  DollarSign
} from 'lucide-react'
import { exportCreditCustomerReportPDF, exportCreditCustomerReportExcel } from '@/lib/exportUtils'
import { Badge } from '@/components/ui/badge'

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

  const fetchReport = useCallback(async () => {
    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('stationId', selectedStation)
      params.append('year', selectedYear)
      params.append('month', selectedMonth)

      // Fixed: Updated API route to correct endpoint
      const response = await fetch(`/api/reports/credit-summary?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report')
      }

      setReportData(data)
    } catch (err) {
      console.error('Error fetching credit customer report:', err)
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

  const handleSendReminder = (customerName: string) => {
    // In a real app, this would trigger an SMS or Email API
    alert(`Reminder sent to ${customerName}`)
  }

  if (loading && !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
      </div>
    )
  }

  // Prepare pie chart data
  const agingPieData = reportData ? Object.entries(reportData.agingBreakdown)
    .filter(([, data]) => data.amount > 0)
    .map(([category, data]) => ({
      name: category,
      value: data.amount,
      count: data.count
    })) : []

  // Top Overdue Customers
  const topOverdueCustomers = reportData?.customerDetails
    .filter(c => c.isOverdue)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5) || []

  // Collection Efficiency
  const collectionEfficiency = reportData && reportData.summary.totalCreditSales > 0
    ? (reportData.summary.totalPayments / reportData.summary.totalCreditSales) * 100
    : 0

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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Credit Report - {stations.find(s => s.id === selectedStation)?.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
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
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Label htmlFor="month" className="text-xs mb-1 block text-muted-foreground">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={loading}>
                <SelectTrigger id="month" className="bg-background">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Label htmlFor="year" className="text-xs mb-1 block text-muted-foreground">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={loading}>
                <SelectTrigger id="year" className="bg-background">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                <span>Total Outstanding</span>
                <DollarSign className="h-4 w-4 text-white/80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold">
                Rs. {(reportData.summary.totalOutstanding || 0).toLocaleString()}
              </div>
              <div className="text-xs text-white/70 mt-1">
                From {reportData.summary.activeCustomers} active customers
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                Rs. {(reportData.summary.totalPayments || 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                This month
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Collection Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {collectionEfficiency.toFixed(1)}%
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${collectionEfficiency > 90 ? 'bg-green-500' : collectionEfficiency > 75 ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(collectionEfficiency, 100)}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>


          <Card className="border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Overdue Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {reportData.summary.overdueCustomers}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Payment over 30 days due
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Overdue & Daily Trend */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FormCard
            title="Top Overdue Accounts"
            description="Highest outstanding balances > 30 days"
            className="lg:col-span-1"
          >
            <div className="space-y-4 mt-4">
              {topOverdueCustomers.length > 0 ? (
                topOverdueCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {customer.daysSinceLastPayment ? `${customer.daysSinceLastPayment} days` : 'No payments'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700 dark:text-red-300">Rs. {customer.currentBalance.toLocaleString()}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-red-600 p-0"
                        onClick={() => handleSendReminder(customer.name)}
                      >
                        <Send className="h-3 w-3 mr-1" /> Remind
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No overdue customers found. Good job!
                </div>
              )}
            </div>
          </FormCard>

          <FormCard
            title="Daily Credit Sales & Payments"
            description="Revenue vs Collection trend"
            className="lg:col-span-2"
          >
            <div className="w-full h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => {
                      const d = new Date(value)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Credit Sales"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="payments"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Payments Received"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </FormCard>
        </div>
      )}

      {/* Aging Analysis */}
      {reportData && (
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
                  <Tooltip formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`} />
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
                  <p className="font-semibold">Rs. {(data.amount || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </FormCard>
        </div>
      )}

      {/* Customer Details Table */}
      {reportData && (
        <FormCard title="Detailed Customer List" description="Complete credit customer overview with utilization">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Outstanding</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Limit</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Utilization</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Sales</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Payments</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Last Pay</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Aging</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportData.customerDetails.map((customer) => (
                  <tr key={customer.id} className={`border-b group hover:bg-muted/50 transition-colors`}>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phoneNumber}</p>
                      </div>
                    </td>
                    <td className="text-right p-3">
                      <span className={customer.currentBalance > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        Rs. {(customer.currentBalance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="text-right p-3 text-muted-foreground">
                      Rs. {(customer.creditLimit || 0).toLocaleString()}
                    </td>
                    <td className="text-right p-3">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs">{customer.utilizationPercent.toFixed(0)}%</span>
                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${customer.utilizationPercent > 90 ? 'bg-red-500' : customer.utilizationPercent > 50 ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(customer.utilizationPercent, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right p-3">Rs. {(customer.salesInPeriod || 0).toLocaleString()}</td>
                    <td className="text-right p-3 text-green-600">Rs. {(customer.paymentsInPeriod || 0).toLocaleString()}</td>
                    <td className="p-3 text-xs">
                      {customer.lastPaymentDate
                        ? new Date(customer.lastPaymentDate).toLocaleDateString()
                        : <span className="text-muted-foreground">Never</span>}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className="font-normal"
                        style={{
                          borderColor: `${AGING_COLORS[customer.agingCategory as keyof typeof AGING_COLORS]}40`,
                          color: AGING_COLORS[customer.agingCategory as keyof typeof AGING_COLORS],
                          backgroundColor: `${AGING_COLORS[customer.agingCategory as keyof typeof AGING_COLORS]}10`
                        }}
                      >
                        {customer.agingCategory}
                      </Badge>
                    </td>
                    <td className="text-right p-3">
                      {customer.isOverdue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleSendReminder(customer.name)}
                          title="Send Payment Reminder"
                        >
                          <Send className="h-3 w-3 text-blue-600" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FormCard>
      )}
    </div>
  )
}
