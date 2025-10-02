'use client'

import { useState, useEffect } from 'react'
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
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { 
  Building2, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle, 
  Calculator,
  Download,
  FileText
} from 'lucide-react'
import { exportProfitReportPDF } from '@/lib/exportUtils'

interface Station {
  id: string
  name: string
  city: string
}

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
  const [stations, setStations] = useState<Station[]>([])
  const [profitReport, setProfitReport] = useState<MonthlyProfitReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(String(currentYear))

  // Load initial data
  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await fetch('/api/stations?active=true')
        const stationsData = await response.json()
        setStations(stationsData)
      } catch (err) {
        setError('Failed to load stations')
      }
    }

    loadStations()
  }, [])

  const generateReport = async () => {
    if (!selectedStation || !selectedMonth || !selectedYear) {
      setError('Please select station, month, and year')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call the API endpoint
      // For now, we'll generate mock profit report data
      
      const station = stations.find(s => s.id === selectedStation)
      const monthName = months.find(m => m.value === selectedMonth)?.label || 'Unknown'
      
      // Generate mock daily data for the month
      const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate()
      const dailyData: ProfitData[] = []
      
      for (let day = 1; day <= daysInMonth; day++) {
        const baseRevenue = 180000 + Math.random() * 80000
        const baseExpenses = 25000 + Math.random() * 15000
        const revenue = Math.floor(baseRevenue + Math.sin(day / 7) * 20000) // Weekly pattern
        const expenses = Math.floor(baseExpenses + Math.random() * 10000)
        const profit = revenue - expenses
        const margin = (profit / revenue) * 100
        
        dailyData.push({
          day,
          date: `${selectedYear}-${selectedMonth}-${String(day).padStart(2, '0')}`,
          revenue,
          expenses,
          profit,
          margin
        })
      }

      // Calculate totals
      const totalRevenue = dailyData.reduce((sum, day) => sum + day.revenue, 0)
      const totalExpenses = dailyData.reduce((sum, day) => sum + day.expenses, 0)
      const totalProfit = totalRevenue - totalExpenses
      const averageMargin = (totalProfit / totalRevenue) * 100

      // Generate breakdown data
      const revenueBreakdown: ProfitBreakdown[] = [
        {
          category: 'Fuel Sales',
          amount: totalRevenue * 0.85,
          percentage: 85,
          trend: 'UP',
          previousMonth: totalRevenue * 0.82
        },
        {
          category: 'Oil & Lubricants',
          amount: totalRevenue * 0.10,
          percentage: 10,
          trend: 'STABLE',
          previousMonth: totalRevenue * 0.11
        },
        {
          category: 'Can Sales',
          amount: totalRevenue * 0.03,
          percentage: 3,
          trend: 'DOWN',
          previousMonth: totalRevenue * 0.04
        },
        {
          category: 'Other Services',
          amount: totalRevenue * 0.02,
          percentage: 2,
          trend: 'UP',
          previousMonth: totalRevenue * 0.03
        }
      ]

      const expenseBreakdown: ProfitBreakdown[] = [
        {
          category: 'Staff Salaries',
          amount: totalExpenses * 0.35,
          percentage: 35,
          trend: 'UP',
          previousMonth: totalExpenses * 0.33
        },
        {
          category: 'Utilities',
          amount: totalExpenses * 0.20,
          percentage: 20,
          trend: 'STABLE',
          previousMonth: totalExpenses * 0.21
        },
        {
          category: 'Maintenance',
          amount: totalExpenses * 0.15,
          percentage: 15,
          trend: 'DOWN',
          previousMonth: totalExpenses * 0.18
        },
        {
          category: 'Transport',
          amount: totalExpenses * 0.12,
          percentage: 12,
          trend: 'UP',
          previousMonth: totalExpenses * 0.10
        },
        {
          category: 'Insurance',
          amount: totalExpenses * 0.08,
          percentage: 8,
          trend: 'STABLE',
          previousMonth: totalExpenses * 0.08
        },
        {
          category: 'Other',
          amount: totalExpenses * 0.10,
          percentage: 10,
          trend: 'DOWN',
          previousMonth: totalExpenses * 0.10
        }
      ]

      // Find best and worst days
      const bestDay = dailyData.reduce((best, day) => day.profit > best.profit ? day : best, dailyData[0])
      const worstDay = dailyData.reduce((worst, day) => day.profit < worst.profit ? day : worst, dailyData[0])

      // Mock previous month data
      const previousMonthProfit = totalProfit * (0.9 + Math.random() * 0.2)
      const profitGrowth = ((totalProfit - previousMonthProfit) / previousMonthProfit) * 100

      const report: MonthlyProfitReport = {
        month: monthName,
        year: parseInt(selectedYear),
        stationId: selectedStation,
        stationName: station?.name || 'Unknown Station',
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

    } catch (err) {
      setError('Failed to generate profit report')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!profitReport || !selectedStation) {
      alert('Please select a station and generate a report first')
      return
    }
    
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
    
    exportProfitReportPDF(profitReport, stationName, monthStr)
  }

  const exportToExcel = () => {
    // Excel export for profit reports - can be implemented similarly
    alert('Excel export for profit reports - to be implemented')
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'DOWN': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'UP': return 'text-green-600'
      case 'DOWN': return 'text-red-600'
      default: return 'text-gray-600'
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
        <span className="font-mono font-semibold text-green-600">
          Rs. {Math.floor(value as number).toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage' as keyof ProfitBreakdown,
      title: 'Percentage',
      render: (value: unknown) => (
        <span className="font-mono">{value as number}%</span>
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
        <span className="font-mono font-semibold text-red-600">
          Rs. {Math.floor(value as number).toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage' as keyof ProfitBreakdown,
      title: 'Percentage',
      render: (value: unknown) => (
        <span className="font-mono">{value as number}%</span>
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
      <h1 className="text-3xl font-bold text-gray-900">Profit Reports</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Monthly Profit Report">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="station">Station</Label>
            <Select value={selectedStation} onValueChange={setSelectedStation} disabled={loading}>
              <SelectTrigger id="station">
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {station.name} ({station.city})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Button onClick={generateReport} disabled={loading || !selectedStation || !selectedMonth || !selectedYear}>
              {loading ? 'Generating...' : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </FormCard>

      {profitReport && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Profit Report - {profitReport.stationName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {profitReport.month} {profitReport.year}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {profitReport.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  Daily avg: Rs. {Math.floor(profitReport.totalRevenue / profitReport.dailyData.length).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  Rs. {profitReport.totalExpenses.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((profitReport.totalExpenses / profitReport.totalRevenue) * 100).toFixed(1)}% of revenue
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitReport.totalProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  Rs. {profitReport.totalProfit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {profitReport.averageMargin.toFixed(1)}% margin
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${profitReport.profitGrowth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {profitReport.profitGrowth >= 0 ? '+' : ''}{profitReport.profitGrowth.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  vs previous month
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profit Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Profit Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={profitReport.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `Rs. ${value.toLocaleString()}`, 
                        name === 'profit' ? 'Profit' : name === 'revenue' ? 'Revenue' : 'Expenses'
                      ]}
                      labelFormatter={(day) => `Day ${day}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      name="profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Best/Worst Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Best Performing Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{new Date(profitReport.bestDay.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono text-green-600">Rs. {profitReport.bestDay.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-mono text-red-600">Rs. {profitReport.bestDay.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Profit:</span>
                    <span className="font-mono font-bold text-blue-600">Rs. {profitReport.bestDay.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margin:</span>
                    <span className="font-mono">{profitReport.bestDay.margin.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Lowest Performing Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-medium">{new Date(profitReport.worstDay.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-mono text-green-600">Rs. {profitReport.worstDay.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-mono text-red-600">Rs. {profitReport.worstDay.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Profit:</span>
                    <span className="font-mono font-bold text-blue-600">Rs. {profitReport.worstDay.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margin:</span>
                    <span className="font-mono">{profitReport.worstDay.margin.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={profitReport.revenueBreakdown}
                columns={revenueColumns}
                searchPlaceholder="Search revenue sources..."
                pagination={false}
                emptyMessage="No revenue breakdown available."
              />
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={profitReport.expenseBreakdown}
                columns={expenseColumns}
                searchPlaceholder="Search expense categories..."
                pagination={false}
                emptyMessage="No expense breakdown available."
              />
            </CardContent>
          </Card>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={exportToPDF} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
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
