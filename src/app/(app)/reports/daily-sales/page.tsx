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
  TrendingUp,
  Fuel,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { exportDailySalesReportPDF, exportDailySalesReportExcel, captureChartAsImage } from '@/lib/exportUtils'

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

export default function DailySalesReportPage() {
  const router = useRouter()
  const { selectedStation, stations, setSelectedStation } = useStation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [salesData, setSalesData] = useState<DailySalesResponse | null>(null)

  // Month selection - using business month (7th to 6th)
  const currentBusinessMonth = getCurrentBusinessMonth()
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
      // const dateRange = getBusinessMonthDateRange(parseInt(selectedMonth), parseInt(selectedYear))
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

  const exportToPDF = async () => {
    if (!salesData) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`

    // Capture chart as image
    const chartImage = await captureChartAsImage('daily-sales-chart')

    const reportData = {
      dailySales: salesData.dailySales,
      fuelTypes: salesData.fuelTypes,
      grandTotal: salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0)
    }

    await exportDailySalesReportPDF(reportData, stationName, monthLabel, chartImage || undefined)
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
          <Button variant="outline" onClick={() => router.push('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Daily Sales Report by Fuel Type (Rs)
            </h1>
            <p className="text-muted-foreground mt-1">
              Monthly sales revenue analysis with daily breakdown by fuel type
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
          <CardDescription>Select station, year, and month to view sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="station">Station</Label>
              <Select
                value={selectedStation || 'all'}
                onValueChange={(value) => setSelectedStation(value)}
              >
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {salesData && salesData.totalsByFuelType && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesData.fuelTypes.map(fuelName => (
            <Card key={fuelName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Fuel className="h-4 w-4" style={{ color: getFuelColor(fuelName) }} />
                  {fuelName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {(salesData.totalsByFuelType?.[fuelName] || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                Rs. {salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                All fuel types combined
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {salesData && salesData.dailySales.length > 0 ? (
        <FormCard
          title="Daily Sales Trend"
          description={`Business Month: ${formatBusinessMonthRange(getBusinessMonth(parseInt(selectedMonth), parseInt(selectedYear)))}`}
        >
          <div id="daily-sales-chart" className="w-full h-96 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    const d = new Date(value)
                    return `${d.getDate()}/${d.getMonth() + 1}`
                  }}
                />
                <YAxis
                  label={{ value: 'Sales (Rs.)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                  labelFormatter={(date) => {
                    const d = new Date(date)
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  }}
                />
                <Legend
                  formatter={(value) => value}
                />
                {salesData.fuelTypes.map(fuelName => (
                  <Line
                    key={fuelName}
                    type="monotone"
                    dataKey={fuelName}
                    stroke={getFuelColor(fuelName)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={fuelName}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </FormCard>
      ) : salesData && salesData.dailySales.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No sales data found for this month</p>
              <p className="text-sm">No shifts were closed during this period</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Data Table */}
      {salesData && salesData.dailySales.length > 0 && (
        <FormCard
          title="Daily Sales Breakdown"
          description="Detailed daily sales by fuel type with totals"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 bg-muted/30">
                  <th className="text-left p-3 font-semibold">Day</th>
                  {salesData.fuelTypes.map(fuelName => (
                    <th key={fuelName} className="text-right p-3 font-semibold" style={{ color: getFuelColor(fuelName) }}>
                      {fuelName}
                    </th>
                  ))}
                  <th className="text-right p-3 font-semibold text-orange-600 dark:text-orange-400">Daily Total</th>
                </tr>
              </thead>
              <tbody>
                {salesData.dailySales.map((day, index) => (
                  <tr key={day.date} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                    <td className="p-3 font-medium">Day {day.day}</td>
                    {salesData.fuelTypes.map(fuelName => (
                      <td key={fuelName} className="text-right p-3 text-sm">
                        Rs. {(day.sales?.[fuelName] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="text-right p-3 font-semibold text-orange-600 dark:text-orange-400">
                      Rs. {day.totalSales.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-4 font-bold bg-orange-50 dark:bg-orange-950/20">
                  <td className="p-3 text-lg">TOTAL</td>
                  {salesData.fuelTypes.map(fuelName => (
                    <td key={fuelName} className="text-right p-3 text-base" style={{ color: getFuelColor(fuelName) }}>
                      Rs. {(salesData.totalsByFuelType?.[fuelName] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="text-right p-3 text-lg text-orange-600 dark:text-orange-400">
                    Rs. {salesData.dailySales.reduce((sum, day) => sum + day.totalSales, 0).toLocaleString()}
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

