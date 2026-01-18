'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
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
  BarChart3
} from 'lucide-react'

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

const fuelTypeColors: Record<string, string> = {
  'PETROL_92': '#3b82f6', // Blue
  'PETROL_95': '#8b5cf6', // Purple
  'DIESEL': '#10b981', // Green
  'SUPER_DIESEL': '#f59e0b', // Amber
  'OIL': '#ef4444' // Red
}

const formatFuelType = (fuelType: string): string => {
  return fuelType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function DailySalesReportPage() {
  const { selectedStation, stations, setSelectedStation } = useStation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [salesData, setSalesData] = useState<DailySalesResponse | null>(null)
  
  // Month selection
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'))

  // Generate years (current year and previous 2 years)
  const years = Array.from({ length: 3 }, (_, i) => {
    const year = currentDate.getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  useEffect(() => {
    if (selectedStation && selectedStation !== 'all') {
      fetchSalesData()
    }
  }, [selectedStation, selectedYear, selectedMonth])

  const fetchSalesData = async () => {
    if (!selectedStation || selectedStation === 'all') {
      setError('Please select a station')
      return
    }

    try {
      setLoading(true)
      setError('')
      
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
  }

  // Prepare chart data
  const chartData = salesData?.dailySales.map(day => {
    const dataPoint: any = {
      day: day.day,
      date: day.date
    }
    
    // Add sales for each fuel type
    salesData.fuelTypes.forEach(fuelType => {
      dataPoint[fuelType] = day.sales[fuelType] || 0
    })
    
    dataPoint.total = day.totalSales
    
    return dataPoint
  }) || []

  if (loading && !salesData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Daily Sales Report by Fuel Type
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly sales trend analysis with daily breakdown by fuel type
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSalesData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
          {salesData.fuelTypes.map(fuelType => (
            <Card key={fuelType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Fuel className="h-4 w-4" style={{ color: fuelTypeColors[fuelType] || '#666' }} />
                  {formatFuelType(fuelType)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {(salesData.totalsByFuelType[fuelType] || 0).toLocaleString()}
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
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
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
          description={`Sales breakdown by fuel type for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
        >
          <div className="w-full h-96 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  label={{ value: 'Day of Month', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Sales (Rs.)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `Rs. ${value.toLocaleString()}`}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend 
                  formatter={(value) => formatFuelType(value)}
                />
                {salesData.fuelTypes.map(fuelType => (
                  <Line
                    key={fuelType}
                    type="monotone"
                    dataKey={fuelType}
                    stroke={fuelTypeColors[fuelType] || '#666'}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={fuelType}
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
          description="Detailed daily sales by fuel type"
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Day</th>
                  {salesData.fuelTypes.map(fuelType => (
                    <th key={fuelType} className="text-right p-2 font-semibold">
                      {formatFuelType(fuelType)}
                    </th>
                  ))}
                  <th className="text-right p-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesData.dailySales.map((day, index) => (
                  <tr key={day.date} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                    <td className="p-2 font-medium">Day {day.day}</td>
                    {salesData.fuelTypes.map(fuelType => (
                      <td key={fuelType} className="text-right p-2 font-mono text-sm">
                        Rs. {(day.sales[fuelType] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="text-right p-2 font-mono font-semibold">
                      Rs. {day.totalSales.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="p-2">Total</td>
                  {salesData.fuelTypes.map(fuelType => (
                    <td key={fuelType} className="text-right p-2 font-mono">
                      Rs. {(salesData.totalsByFuelType[fuelType] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="text-right p-2 font-mono">
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

