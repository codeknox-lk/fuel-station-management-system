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
  BarChart,
  Bar
} from 'recharts'
import {
  TrendingUp,
  Fuel,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react'
import { exportDailySalesReportPDF, exportDailySalesReportExcel } from '@/lib/exportUtils'
import { cn } from '@/lib/utils'

interface DailySalesData {
  date: string
  day: number
  sales: Record<string, number> // fuelType -> amount
  totalSales: number
}

interface DailySalesResponse {
  month: string
  startDate: string
  endDate: string
  dailySales: DailySalesData[]
  totalsByFuelType: Record<string, number>
  fuelTypes: string[]
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

const fuelColors: Record<string, string> = {
  'Petrol 92': '#3b82f6',
  'Petrol 95': '#8b5cf6',
  'Diesel': '#10b981',
  'Super Diesel': '#f59e0b',
  'Extra Mile': '#ec4899',
  'Oil': '#ef4444'
}

const getFuelColor = (fuelName: string): string => {
  return fuelColors[fuelName] || '#666'
}

const getFuelBgClass = (fuelName: string): string => {
  const classes: Record<string, string> = {
    'Petrol 92': 'bg-blue-500',
    'Petrol 95': 'bg-violet-500',
    'Diesel': 'bg-emerald-500',
    'Super Diesel': 'bg-amber-500',
    'Extra Mile': 'bg-pink-500',
    'Oil': 'bg-red-500'
  }
  return classes[fuelName] || 'bg-gray-500'
}

const getFuelTextClass = (fuelName: string): string => {
  const classes: Record<string, string> = {
    'Petrol 92': 'text-blue-500',
    'Petrol 95': 'text-violet-500',
    'Diesel': 'text-emerald-500',
    'Super Diesel': 'text-amber-500',
    'Extra Mile': 'text-pink-500',
    'Oil': 'text-red-500'
  }
  return classes[fuelName] || 'text-gray-500'
}

export default function DailySalesReportPage() {
  const router = useRouter()
  const { selectedStation, stations, isAllStations } = useStation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [salesData, setSalesData] = useState<DailySalesResponse | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar')

  const station = stations.find(s => s.id === selectedStation)
  const monthStartDay = station?.monthStartDate || 1

  // Month selection - using business month
  const currentBusinessMonth = getCurrentBusinessMonth(monthStartDay)
  const [selectedYear, setSelectedYear] = useState(currentBusinessMonth.year.toString())
  const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))

  // Generate years (current year and previous 2 years)
  const years = Array.from({ length: 3 }, (_, i) => {
    const year = currentBusinessMonth.year - i
    return { value: year.toString(), label: year.toString() }
  })

  const fetchSalesData = useCallback(async () => {
    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Get business month date range (7th to 6th)
      const month = `${selectedYear}-${selectedMonth}`
      const res = await fetch(`/api/reports/daily-sales?stationId=${selectedStation}&month=${month}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch daily sales data')
      }

      const data = await res.json()
      setSalesData(data)
    } catch (err) {
      console.error('Error fetching daily sales data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load daily sales data')
    } finally {
      setLoading(false)
    }
  }, [selectedStation, selectedMonth, selectedYear])

  useEffect(() => {
    if (selectedStation) {
      fetchSalesData()
    }
  }, [selectedStation, selectedYear, selectedMonth, fetchSalesData])

  // Prepare chart data
  interface ChartDataPoint {
    day: number
    date: string
    total?: number
    [key: string]: string | number | undefined
  }

  const chartData = salesData?.dailySales.map(day => {
    const dataPoint: ChartDataPoint = {
      day: day.day,
      date: day.date
    }

    // Add sales for each fuel type
    salesData.fuelTypes.forEach(fuelName => {
      dataPoint[fuelName] = day.sales?.[fuelName] || 0
    })

    dataPoint.total = day.totalSales

    return dataPoint
  }) || []

  // Calculate Day-over-Day growth for the table
  const getGrowthIndicator = (current: number, previous: number) => {
    if (!previous) return null;
    const growth = ((current - previous) / previous) * 100;
    const isPositive = growth > 0;

    return (
      <div className={cn(
        "flex items-center text-[10px] font-medium ml-1",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(growth).toFixed(0)}%
      </div>
    )
  }

  const exportToPDF = () => {
    if (!salesData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const reportData = {
      dailySales: salesData.dailySales,
      fuelTypes: salesData.fuelTypes,
      grandTotal: salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0)
    }

    exportDailySalesReportPDF(reportData, stationName, monthLabel)
  }

  const exportToExcel = () => {
    if (!salesData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    const reportData = {
      dailySales: salesData.dailySales,
      fuelTypes: salesData.fuelTypes,
      grandTotal: salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0)
    }

    exportDailySalesReportExcel(reportData, stationName, monthLabel)
  }

  if (loading && !salesData) {
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
          <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Daily Sales Report (Rs)
            </h1>
            <p className="text-muted-foreground mt-1">
              Revenue analysis with daily breakdown by fuel type
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/reports/daily-sales-liters')}>
            View Liters Report
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={fetchSalesData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!salesData}>
                <Download className="h-4 w-4 mr-2" />
                Export
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
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-32">
              <Label htmlFor="year" className="text-xs mb-1 block text-muted-foreground">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year" className="bg-background">
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
            <div className="w-40">
              <Label htmlFor="month" className="text-xs mb-1 block text-muted-foreground">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month" className="bg-background">
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

            <div className="ml-auto flex items-center bg-background rounded-lg border p-1">
              <Button
                variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="h-8 px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Bar Chart
              </Button>
              <Button
                variant={chartType === 'line' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="h-8 px-3"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Line Chart
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards with Glassmorphic feel */}
      {salesData && salesData.totalsByFuelType && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-500 to-orange-600 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                <span>Total Revenue</span>
                <TrendingUp className="h-4 w-4 text-white/80" />
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold">
                Rs. {salesData.dailySales.reduce((sum, day) => sum + day.totalSales, (0) || 0).toLocaleString()}
              </div>
              <div className="text-xs text-white/70 mt-1">
                Total sales for {months.find(m => m.value === selectedMonth)?.label}
              </div>
            </CardContent>
          </Card>

          {salesData.fuelTypes.slice(0, 3).map(fuelName => (
            <Card key={fuelName} className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getFuelBgClass(fuelName)}`}></div>
                    {fuelName}
                  </span>
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {(salesData.totalsByFuelType?.[fuelName] || (0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((salesData.totalsByFuelType?.[fuelName] || 0) / salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {salesData && salesData.dailySales.length > 0 ? (
        <FormCard
          title="Daily Revenue Trend by Fuel Type"
          description={`Business Month: ${formatBusinessMonthRange(getBusinessMonth(parseInt(selectedMonth), parseInt(selectedYear), monthStartDay))}`}
        >
          <div id="daily-sales-chart" className="w-full h-96 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const d = new Date(value)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                    labelFormatter={(date) => {
                      const d = new Date(date)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {salesData.fuelTypes.map(fuelName => (
                    <Line
                      key={fuelName}
                      type="monotone"
                      dataKey={fuelName}
                      stroke={getFuelColor(fuelName)}
                      strokeWidth={2}
                      dot={{ r: 0 }}
                      activeDot={{ r: 6 }}
                      name={fuelName}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const d = new Date(value)
                      return `${d.getDate()}`
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                    labelFormatter={(date) => {
                      const d = new Date(date)
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {salesData.fuelTypes.map(fuelName => (
                    <Bar
                      key={fuelName}
                      dataKey={fuelName}
                      stackId="a"
                      fill={getFuelColor(fuelName)}
                      name={fuelName}
                      radius={[0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </FormCard>
      ) : salesData && salesData.dailySales.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
              <p className="text-sm max-w-sm mx-auto">
                There are no closed shifts for the selected period. Shifts must be closed to appear in the daily sales report.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Data Table */}
      {salesData && salesData.dailySales.length > 0 && (
        <FormCard
          title="Daily Sales Breakdown"
          description="Detailed daily revenue by fuel type"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Day</th>
                  {salesData.fuelTypes.map(fuelName => (
                    <th key={fuelName} className={`text-right p-3 font-semibold ${getFuelTextClass(fuelName)}`}>
                      {fuelName}
                    </th>
                  ))}
                  <th className="text-right p-3 font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesData.dailySales.map((day, index) => {
                  const previousDay = index > 0 ? salesData.dailySales[index - 1] : null;

                  return (
                    <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">
                        <div className="flex flex-col">
                          <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>
                      {salesData.fuelTypes.map(fuelName => (
                        <td key={fuelName} className="text-right p-3">
                          Rs. {(day.sales?.[fuelName] || (0) || 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="text-right p-3 font-semibold flex flex-col items-end">
                        <span>Rs. {(day.totalSales || 0).toLocaleString()}</span>
                        {previousDay && getGrowthIndicator(day.totalSales, previousDay.totalSales)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-muted/50 font-bold border-t-2 border-primary/20">
                  <td className="p-4">TOTAL</td>
                  {salesData.fuelTypes.map(fuelName => (
                    <td key={fuelName} className={`text-right p-4 ${getFuelTextClass(fuelName)}`}>
                      Rs. {(salesData.totalsByFuelType?.[fuelName] || (0) || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="text-right p-4 text-orange-600 text-lg">
                    Rs. {salesData.dailySales.reduce((sum, day) => sum + day.totalSales, (0) || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FormCard>
      )}
    </div>
  )
}

