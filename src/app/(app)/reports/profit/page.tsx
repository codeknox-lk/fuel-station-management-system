'use client'

import { useState } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth, getBusinessMonth } from '@/lib/businessMonth'
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
import { DataTable, Column } from '@/components/ui/DataTable'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Cell
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calculator,
  Download,
  FileText,
  ArrowLeft,
  FileSpreadsheet,
  Wallet,
  Briefcase,
  DollarSign
} from 'lucide-react'
import { exportProfitReportPDF } from '@/lib/exportUtils'



interface ProfitData {
  day: number
  date: string
  revenue: number
  expenses: number
  profit: number
  margin: number
}

interface ProfitBreakdown {
  category: string
  amount: number
  percentage: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  previousMonth: number
}

interface MonthlyProfitReport {
  month: string
  year: number
  stationId: string
  stationName: string

  // Summary
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  averageMargin: number

  // Daily data for chart
  dailyData: ProfitData[]

  // Breakdown
  revenueBreakdown: ProfitBreakdown[]
  expenseBreakdown: ProfitBreakdown[]

  // Comparisons
  previousMonthProfit: number
  profitGrowth: number
  bestDay: ProfitData
  worstDay: ProfitData
}

interface BreakdownItem {
  category: string
  amount: number
  percentage: number
}

interface ProfitReportResponse {
  dailyData: ProfitData[]
  breakdown: {
    revenue: BreakdownItem[]
    expenses: BreakdownItem[]
  }
  summary: {
    totalRevenue: number
    totalExpenses: number
    totalProfit: number
    averageMargin: number
    bestDay?: ProfitData
    worstDay?: ProfitData
    previousMonthProfit?: number
    profitGrowth?: number
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

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default function ProfitReportsPage() {
  const router = useRouter()
  // REMOVED local stations state
  const [profitReport, setProfitReport] = useState<MonthlyProfitReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  // Use isAllStations from context
  const { selectedStation, isAllStations } = useStation()
  const currentBusinessMonth = getCurrentBusinessMonth()
  const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(String(currentBusinessMonth.year))

  // REMOVED loadStations useEffect

  const generateReport = async () => {
    if (!selectedStation || !selectedMonth || !selectedYear) {
      setError('Please select month and year')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Get business month date range (7th to 6th)
      const businessMonth = getBusinessMonth(parseInt(selectedMonth), parseInt(selectedYear))
      const url = `/api/reports/profit?stationId=${selectedStation}&month=${selectedMonth}&year=${selectedYear}&startDate=${businessMonth.startDate.toISOString()}&endDate=${businessMonth.endDate.toISOString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error || `Failed to fetch profit report: ${response.status}`)
      }

      const reportData = await response.json() as ProfitReportResponse

      const stationName = 'Current Station' // Simplified as we removed local station list
      const monthName = businessMonth.label

      // Transform API data to match frontend interface
      const dailyData: ProfitData[] = reportData.dailyData || []

      // Transform breakdown data
      const revenueBreakdown: ProfitBreakdown[] = (reportData.breakdown?.revenue || []).map((item: BreakdownItem) => ({
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
        trend: 'STABLE' as const, // Would need previous month data to calculate trend
        previousMonth: 0 // Would need to fetch previous month for comparison
      }))

      const expenseBreakdown: ProfitBreakdown[] = (reportData.breakdown?.expenses || []).map((item: BreakdownItem) => ({
        category: item.category,
        amount: item.amount,
        percentage: item.percentage,
        trend: 'STABLE' as const,
        previousMonth: 0
      }))

      // Calculate totals from API data
      const totalRevenue = reportData.summary?.totalRevenue || 0
      const totalExpenses = reportData.summary?.totalExpenses || 0
      const totalProfit = reportData.summary?.totalProfit || 0
      const averageMargin = reportData.summary?.averageMargin || 0

      // Use best and worst days from API (which excludes today)
      const bestDay = reportData.summary.bestDay || dailyData[0] || { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }
      const worstDay = reportData.summary.worstDay || dailyData[0] || { day: 0, date: '', profit: 0, revenue: 0, expenses: 0, margin: 0 }

      // Use API values for previous month comparison
      const previousMonthProfit = reportData.summary.previousMonthProfit || 0
      const profitGrowth = reportData.summary.profitGrowth || 0

      const report: MonthlyProfitReport = {
        month: monthName,
        year: parseInt(selectedYear),
        stationId: selectedStation,
        stationName: stationName,
        totalRevenue,
        totalExpenses,
        totalProfit,
        averageMargin,
        dailyData,
        revenueBreakdown,
        expenseBreakdown,
        previousMonthProfit,
        profitGrowth,
        bestDay,
        worstDay
      }

      setProfitReport(report)

    } catch {
      setError('Failed to generate profit report')
    } finally {
      setLoading(false)
    }
  }

  // Calculate Waterfall Data
  const waterfallData = profitReport ? (() => {
    const revenue = profitReport.totalRevenue;
    const cogs = profitReport.expenseBreakdown.find(e => e.category === 'Shop COGS')?.amount || 0;
    const wastage = profitReport.expenseBreakdown.find(e => e.category === 'Shop Wastage/Loss')?.amount || 0;
    const operatingExpenses = profitReport.totalExpenses - cogs - wastage;
    const netProfit = profitReport.totalProfit;

    return [
      { name: 'Revenue', value: revenue, fill: '#10b981', type: 'positive' },
      { name: 'Cost of Goods', value: -cogs, fill: '#f59e0b', type: 'negative' },
      { name: 'Wastage', value: -wastage, fill: '#f97316', type: 'negative' },
      { name: 'Op. Expenses', value: -operatingExpenses, fill: '#ef4444', type: 'negative' },
      { name: 'Net Profit', value: netProfit, fill: netProfit >= 0 ? '#3b82f6' : '#ef4444', type: 'total' }
    ].filter(d => d.value !== 0 || d.name === 'Net Profit');
  })() : [];

  const exportToPDF = () => {
    if (!profitReport || !selectedStation) {
      alert('Please select a station and generate a report first')
      return
    }

    const stationName = 'Current Station'
    const monthStr = `${selectedYear}-${selectedMonth}`

    exportProfitReportPDF(profitReport, stationName, monthStr)
  }

  const exportToExcel = () => {
    // Excel export for profit reports - can be implemented similarly
    alert('Excel export for profit reports - to be implemented')
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      default: return <div className="h-4 w-4 bg-muted-foreground rounded-full" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'UP': return 'text-green-600 dark:text-green-400'
      case 'DOWN': return 'text-red-600 dark:text-red-400'
      default: return 'text-muted-foreground'
    }
  }

  const revenueColumns: Column<ProfitBreakdown>[] = [
    {
      key: 'category' as keyof ProfitBreakdown,
      title: 'Revenue Source',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof ProfitBreakdown,
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-semibold text-green-600 dark:text-green-400">
          Rs. {Math.floor(value as (number) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage' as keyof ProfitBreakdown,
      title: 'Percentage',
      render: (value: unknown) => (
        <span className="">{value as number}%</span>
      )
    },
    {
      key: 'trend' as keyof ProfitBreakdown,
      title: 'Trend',
      render: (value: unknown, row: ProfitBreakdown) => (
        <div className="flex items-center gap-2">
          {getTrendIcon(value as string)}
          <span className={`text-sm ${getTrendColor(value as string)}`}>
            {((row.amount - row.previousMonth) / row.previousMonth * 100).toFixed(1)}%
          </span>
        </div>
      )
    }
  ]

  const expenseColumns: Column<ProfitBreakdown>[] = [
    {
      key: 'category' as keyof ProfitBreakdown,
      title: 'Expense Category',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof ProfitBreakdown,
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          Rs. {Math.floor(value as (number) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage' as keyof ProfitBreakdown,
      title: 'Percentage',
      render: (value: unknown) => (
        <span className="">{value as number}%</span>
      )
    },
    {
      key: 'trend' as keyof ProfitBreakdown,
      title: 'Trend',
      render: (value: unknown, row: ProfitBreakdown) => (
        <div className="flex items-center gap-2">
          {getTrendIcon(value as string)}
          <span className={`text-sm ${getTrendColor(value as string)}`}>
            {((row.amount - row.previousMonth) / row.previousMonth * 100).toFixed(1)}%
          </span>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-green-600 dark:text-green-400" />
              Profit & Loss Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Financial performance analysis
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Report Configuration" description="Business month runs from 7th to 6th of next month">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {isAllStations && (
            <div className="col-span-full md:col-span-4 flex items-center p-4 text-amber-800 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-4">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="font-medium">Please select a specific station to generate report.</span>
            </div>
          )}

          {!isAllStations && (
            <>
              <div>
                <Label htmlFor="month">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={loading}>
                  <SelectTrigger id="month">
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

              <div>
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear} disabled={loading}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={generateReport} disabled={loading || isAllStations || !selectedMonth || !selectedYear} className="w-full">
                  {loading ? 'Generating...' : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </FormCard>

      {profitReport && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Glassmorphic Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                  <span>Total Revenue</span>
                  <Wallet className="h-4 w-4 text-white/80" />
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">
                  Rs. {(profitReport.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Daily Avg: Rs. {Math.floor(profitReport.totalRevenue / (profitReport.dailyData.length || 1)).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  Rs. {(profitReport.totalExpenses || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((profitReport.totalExpenses / profitReport.totalRevenue) * 100).toFixed(1)}% of Revenue
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                  <span>Net Profit</span>
                  <DollarSign className="h-4 w-4 text-white/80" />
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">
                  Rs. {(profitReport.totalProfit || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/70 mt-1">
                  {profitReport.averageMargin.toFixed(1)}% Net Margin
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">M-o-M Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitReport.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitReport.profitGrowth >= 0 ? '+' : ''}{profitReport.profitGrowth.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  vs previous month
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profit Bridge / Waterfall */}
            <FormCard
              title="Profit Bridge"
              description="Revenue to Net Profit Flow"
              className="lg:col-span-1"
            >
              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => `Rs. ${(value).toLocaleString()}`}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </FormCard>

            {/* Main Composed Chart */}
            <FormCard
              title="Daily Profit & Margin Analysis"
              description={`Business Month: ${profitReport.month} ${profitReport.year}`}
              className="lg:col-span-2"
            >
              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={profitReport.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => {
                        const d = new Date(value)
                        return `${d.getDate()}`
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#f97316' }}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="margin"
                      name="Net Margin %"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </FormCard>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormCard title="Revenue Distribution" description="Income sources breakdown">
              <DataTable
                data={profitReport.revenueBreakdown}
                columns={revenueColumns}
                searchPlaceholder="Search sources..."
                pagination={false}
              />
            </FormCard>

            <FormCard title="Expense Distribution" description="Cost breakdown">
              <DataTable
                data={profitReport.expenseBreakdown}
                columns={expenseColumns}
                searchPlaceholder="Search expenses..."
                pagination={false}
              />
            </FormCard>
          </div>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={!profitReport}>
                      <Download className="mr-2 h-4 w-4" />
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
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Email Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
