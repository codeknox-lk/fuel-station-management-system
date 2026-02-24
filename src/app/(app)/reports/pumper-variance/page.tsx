'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
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
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowLeft,
  TrendingDown,
  Activity,
  RefreshCw,
  User,
  DollarSign,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportPumperVariancePDF, exportPumperVarianceExcel } from '@/lib/exportUtils'


interface PumperVariance {
  pumperId: string
  pumperName: string
  nozzleAssignments: string[]

  // Monthly statistics
  totalShifts: number
  shiftsWithVariance: number
  varianceCount: number

  // Financial impact
  totalVarianceAmount: number
  averageVariancePerShift: number
  maxSingleVariance: number

  // Performance metrics
  varianceRate: number // percentage of shifts with variance
  performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'

  // Trend data for sparkline (last 30 days)
  dailyVariances: { day: number; variance: number }[]

  // Additional details
  lastVarianceDate?: string
  consecutiveDaysWithoutVariance: number
  totalDueAmount: number
}

interface StationDailyVariance {
  day: number
  variance: number
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
const years = Array.from({ length: 3 }, (_, i) => currentYear - i)

// Simple sparkline component
const Sparkline = ({ data }: { data: { day: number; variance: number }[] }) => (
  <div className="w-24 h-8">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area
          type="monotone"
          dataKey="variance"
          stroke="#ef4444"
          fill="#fee2e2"
          strokeWidth={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

export default function PumperVariancePage() {
  const router = useRouter()
  const [pumperVariances, setPumperVariances] = useState<PumperVariance[]>([])
  const [stationDailyVariances, setStationDailyVariances] = useState<StationDailyVariance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, stations, isAllStations } = useStation()

  const station = stations.find(s => s.id === selectedStation)
  const monthStartDay = station?.monthStartDate || 1

  const currentBusinessMonth = getCurrentBusinessMonth(monthStartDay)
  const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(String(currentBusinessMonth.year))


  const handleExportPDF = () => {
    if (!pumperVariances.length) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`
    exportPumperVariancePDF(pumperVariances, stationName, monthLabel)
  }

  const handleExportExcel = () => {
    if (!pumperVariances.length) return
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'All Stations'
    const monthLabel = `${selectedYear}-${selectedMonth}`
    exportPumperVarianceExcel(pumperVariances, stationName, monthLabel)
  }

  const generateReport = useCallback(async () => {
    if (!selectedStation || !selectedMonth || !selectedYear) {
      setError('Please select station, month, and year')
      return
    }

    setLoading(true)
    setError('')
    setPumperVariances([])
    setStationDailyVariances([])

    try {
      // Call API endpoint to get real pumper variance data
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      const url = `/api/reports/pumper-variance?stationId=${selectedStation}&month=${monthStr}`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch pumper variance report: ${response.status}`)
      }

      const reportData = await response.json()

      // Transform API data to match frontend interface
      interface ApiDailyVariance {
        day?: number
        variance?: number
      }

      interface ApiPumperVariance {
        pumperId: string
        pumperName: string
        dailyVariances?: ApiDailyVariance[]
        totalShifts: number
        shiftsWithVariance: number
        varianceCount: number
        totalVarianceAmount: number
        maxSingleVariance?: number
        varianceRate: number
        performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'
      }

      const pumperVariances: PumperVariance[] = (reportData.pumperVariances || []).map((pumper: ApiPumperVariance) => {
        // Transform daily variances from API (which uses day of month) to match expected format
        const dailyVariances = (pumper.dailyVariances || []).map((dv) => ({
          day: dv.day || 1,
          variance: dv.variance || 0
        }))

        // Calculate additional fields
        const averageVariancePerShift = pumper.varianceCount > 0
          ? pumper.totalVarianceAmount / pumper.varianceCount
          : 0

        // Estimate total due amount (70% of total variance - this would need to be calculated from actual advance/loan records)
        const totalDueAmount = Math.floor(pumper.totalVarianceAmount * 0.7)

        // Get nozzle assignments - would need to fetch from assignments, using placeholder for now
        const nozzleAssignments: string[] = [] // Would need to fetch from shift assignments

        return {
          pumperId: pumper.pumperId,
          pumperName: pumper.pumperName,
          nozzleAssignments,
          totalShifts: pumper.totalShifts,
          shiftsWithVariance: pumper.shiftsWithVariance,
          varianceCount: pumper.varianceCount,
          totalVarianceAmount: pumper.totalVarianceAmount,
          averageVariancePerShift,
          maxSingleVariance: pumper.maxSingleVariance || 0,
          varianceRate: pumper.varianceRate,
          performanceRating: pumper.performanceRating,
          dailyVariances,
          lastVarianceDate: undefined, // Would need to calculate from shift data
          consecutiveDaysWithoutVariance: 0, // Would need to calculate from shift data
          totalDueAmount
        }
      })

      // API already sorts by variance rate, but ensure it's sorted
      pumperVariances.sort((a, b) => b.varianceRate - a.varianceRate)

      setPumperVariances(pumperVariances)
      setStationDailyVariances(reportData.stationDailyVariances || [])

    } catch {
      setError('Failed to generate pumper variance report')
    } finally {
      setLoading(false)
    }
  }, [selectedStation, selectedMonth, selectedYear])

  // Effect to auto-generate report on load or filter change
  useEffect(() => {
    if (selectedStation) {
      generateReport()
    }
  }, [selectedStation, selectedMonth, selectedYear, generateReport])

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800'
      case 'GOOD': return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800'
      case 'NEEDS_IMPROVEMENT': return 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800'
      case 'CRITICAL': return 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPerformanceIcon = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return <CheckCircle className="h-3 w-3" />
      case 'GOOD': return <Activity className="h-3 w-3" />
      case 'NEEDS_IMPROVEMENT': return <AlertTriangle className="h-3 w-3" />
      case 'CRITICAL': return <XCircle className="h-3 w-3" />
      default: return <AlertCircle className="h-3 w-3" />
    }
  }

  const getVarianceRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600 dark:text-green-400'
    if (rate <= 15) return 'text-blue-600 dark:text-blue-400'
    if (rate <= 30) return 'text-orange-600 dark:text-orange-400'
    return 'text-red-600 dark:text-red-400'
  }

  const pumperColumns: Column<PumperVariance>[] = [
    {
      key: 'pumperName' as keyof PumperVariance,
      title: 'Pumper',
      render: (value: unknown, row: PumperVariance) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
            {(value as string).charAt(0)}
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground hidden md:block">
              {row.nozzleAssignments.length > 0 ? row.nozzleAssignments.join(', ') : 'No assignments'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'totalShifts' as keyof PumperVariance,
      title: 'Shifts',
      className: 'text-right',
      render: (value: unknown) => (
        <span className="text-sm font-medium">{value as number}</span>
      )
    },
    {
      key: 'totalVarianceAmount' as keyof PumperVariance,
      title: 'Total Variance',
      className: 'text-right',
      render: (value: unknown) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          Rs. {((value as number) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'averageVariancePerShift' as keyof PumperVariance,
      title: 'Avg / Shift',
      className: 'text-right hidden md:table-cell',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          Rs. {(value as number)?.toFixed(0)}
        </span>
      )
    },
    {
      key: 'varianceRate' as keyof PumperVariance,
      title: 'Variance Rate',
      className: 'text-center',
      render: (value: unknown) => (
        <div className="flex flex-col items-center">
          <div className={`font-bold ${getVarianceRateColor(value as number)}`}>
            {(value as number)?.toFixed(1)}%
          </div>
          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${(value as number) > 30 ? 'bg-red-500' :
                (value as number) > 15 ? 'bg-orange-500' :
                  (value as number) > 5 ? 'bg-blue-500' : 'bg-green-500'
                }`}
              style={{ width: `${Math.min((value as number) * 2, 100)}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      key: 'dailyVariances' as keyof PumperVariance,
      title: '30 Day Trend',
      className: 'hidden md:table-cell',
      render: (value: unknown) => (
        <div className="flex justify-center">
          <Sparkline data={value as { day: number; variance: number }[]} />
        </div>
      )
    },
    {
      key: 'performanceRating' as keyof PumperVariance,
      title: 'Status',
      className: 'text-center',
      render: (value: unknown) => (
        <Badge variant="outline" className={`gap-1 pr-3 pl-2 py-1 ${getPerformanceColor(value as string)}`}>
          {getPerformanceIcon(value as string)}
          <span className="text-[10px] font-semibold">{(value as string)?.replace('_', ' ') || 'Unknown'}</span>
        </Badge>
      )
    }
  ]

  // Calculate summary statistics
  const totalPumpers = pumperVariances.length
  const excellentPumpers = pumperVariances.filter(p => p.performanceRating === 'EXCELLENT').length
  const criticalPumpers = pumperVariances.filter(p => p.performanceRating === 'CRITICAL').length
  const totalVarianceAmount = pumperVariances.reduce((sum, p) => sum + p.totalVarianceAmount, 0)
  const totalDueAmount = pumperVariances.reduce((sum, p) => sum + p.totalDueAmount, 0)
  const averageVarianceRate = totalPumpers > 0 ? pumperVariances.reduce((sum, p) => sum + p.varianceRate, 0) / totalPumpers : 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-8 w-8 text-red-600 dark:text-red-400" />
              Pumper Variance Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed breakdown of pump attendant variances and performance
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateReport} size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!pumperVariances.length}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-red-600" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>
        </CardContent>
      </Card>

      {pumperVariances.length > 0 && (
        <div className="space-y-6">

          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Pumper Variance Report - {stations.find(s => s.id === selectedStation)?.name}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Summary Cards with Premium Styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-gradient-to-br from-red-500 to-red-600 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <CardHeader className="pb-2 relative z-10">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                  <span>Total Variance</span>
                  <TrendingDown className="h-4 w-4 text-white/80" />
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold">
                  Rs. {(totalVarianceAmount || 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Cumulative loss for selected period
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg. Variance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {averageVarianceRate.toFixed(1)}%
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-orange-500" style={{ width: `${Math.min(averageVarianceRate * 2, 100)}%` }}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Critical Pumpers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {criticalPumpers} <span className="text-sm font-normal text-muted-foreground">/ {totalPumpers}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Staff requiring immediate attention
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Excellent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {excellentPumpers} <span className="text-sm font-normal text-muted-foreground">/ {totalPumpers}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Staff with minimal variance
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Trend Chart */}
          {stationDailyVariances.length > 0 && (
            <FormCard
              title="Station Daily Variance Trend"
              description="Total variance accumulated by all pumpers per day"
            >
              <div className="w-full h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stationDailyVariances} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVariance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `Day ${value}`}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      tickFormatter={(value) => `Rs.${value / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Total Variance']}
                      labelFormatter={(label) => `Day ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="variance"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVariance)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </FormCard>
          )}

          {/* Critical Alerts */}
          {criticalPumpers > 0 && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Performance Alert</AlertTitle>
              <AlertDescription>
                {criticalPumpers} pumper{criticalPumpers > 1 ? 's have' : ' has'} critical variance rates exceeding 30%.
                Immediate training or disciplinary action may be required.
              </AlertDescription>
            </Alert>
          )}

          {totalDueAmount > 10000 && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>High Recovery Amount</AlertTitle>
              <AlertDescription>
                Total amount due from pumpers is Rs. {(totalDueAmount || 0).toLocaleString()}.
                Consider implementing stricter controls and recovery procedures.
              </AlertDescription>
            </Alert>
          )}

          {/* Pumper Variance Table */}
          <FormCard
            title="Individual Performance"
            description="Detailed variance metrics for each pumper"
          >
            <DataTable
              data={pumperVariances}
              columns={pumperColumns}
              searchPlaceholder="Search pumpers..."
              emptyMessage="No pumper variance data available."
            />
          </FormCard>

        </div>
      )}
    </div>
  )
}

