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
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer
} from 'recharts'
import { 
  Building2, 
  User,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

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
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="variance" 
          stroke="#3b82f6" 
          strokeWidth={1}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
)

export default function PumperVariancePage() {
  const [stations, setStations] = useState<Station[]>([])
  const [pumperVariances, setPumperVariances] = useState<PumperVariance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
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
      const station = stations.find(s => s.id === selectedStation)
      
      // Transform API data to match frontend interface
      const pumperVariances: PumperVariance[] = (reportData.pumperVariances || []).map((pumper: any) => {
        // Transform daily variances from API (which uses day of month) to match expected format
        const dailyVariances = (pumper.dailyVariances || []).map((dv: any) => ({
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

    } catch (err) {
      setError('Failed to generate pumper variance report')
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'GOOD': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'NEEDS_IMPROVEMENT': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getPerformanceIcon = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return <CheckCircle className="h-4 w-4" />
      case 'GOOD': return <CheckCircle className="h-4 w-4" />
      case 'NEEDS_IMPROVEMENT': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getVarianceRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600 dark:text-green-400'
    if (rate <= 15) return 'text-blue-600 dark:text-blue-400'
    if (rate <= 30) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const pumperColumns: Column<PumperVariance>[] = [
    {
      key: 'pumperName' as keyof PumperVariance,
      title: 'Pumper',
      render: (value: unknown, row: PumperVariance) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground">
              {row.nozzleAssignments.join(', ')}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'totalShifts' as keyof PumperVariance,
      title: 'Total Shifts',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as number}</span>
      )
    },
    {
      key: 'varianceCount' as keyof PumperVariance,
      title: 'Variance Count',
      render: (value: unknown, row: PumperVariance) => (
        <div className="text-center">
          <div className="font-mono font-semibold text-red-600 dark:text-red-400">
            {value as number}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.shiftsWithVariance} shifts affected
          </div>
        </div>
      )
    },
    {
      key: 'totalVarianceAmount' as keyof PumperVariance,
      title: 'Total Variance',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'totalDueAmount' as keyof PumperVariance,
      title: 'Amount Due',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'maxSingleVariance' as keyof PumperVariance,
      title: 'Max Shortage',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-700">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'varianceRate' as keyof PumperVariance,
      title: 'Variance Rate',
      render: (value: unknown) => (
        <div className="text-center">
          <div className={`font-mono font-semibold ${getVarianceRateColor(value as number)}`}>
            {(value as number)?.toFixed(1) || 0}%
          </div>
        </div>
      )
    },
    {
      key: 'dailyVariances' as keyof PumperVariance,
      title: 'Trend (30 days)',
      render: (value: unknown) => (
        <div className="flex justify-center">
          <Sparkline data={value as { day: number; variance: number }[]} />
        </div>
      )
    },
    {
      key: 'performanceRating' as keyof PumperVariance,
      title: 'Performance',
      render: (value: unknown) => (
        <Badge className={getPerformanceColor(value as string)}>
          <div className="flex items-center gap-1">
            {getPerformanceIcon(value as string)}
            <span>{(value as string)?.replace('_', ' ') || 'Unknown'}</span>
          </div>
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
      <h1 className="text-3xl font-bold text-foreground">Pumper Variance Report</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Pumper Variance Report">
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Pumpers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{totalPumpers}</div>
                <div className="text-xs text-muted-foreground">Active this month</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Excellent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{excellentPumpers}</div>
                <div className="text-xs text-muted-foreground">≤5% variance rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{criticalPumpers}</div>
                <div className="text-xs text-muted-foreground">≥30% variance rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  Rs. {totalVarianceAmount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">All pumpers combined</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Amount Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {totalDueAmount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">From pumpers</div>
              </CardContent>
            </Card>
          </div>

          {/* Average Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-muted-foreground">Average Variance Rate</div>
                  <div className={`text-3xl font-bold ${getVarianceRateColor(averageVarianceRate)}`}>
                    {averageVarianceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Across all pumpers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-muted-foreground">Performance Distribution</div>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge className="bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300">
                      {excellentPumpers} Excellent
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300">
                      {pumperVariances.filter(p => p.performanceRating === 'GOOD').length} Good
                    </Badge>
                    <Badge className="bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300">
                      {pumperVariances.filter(p => p.performanceRating === 'NEEDS_IMPROVEMENT').length} Needs Improvement
                    </Badge>
                    <Badge className="bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300">
                      {criticalPumpers} Critical
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-muted-foreground">Recovery Rate</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {((totalDueAmount / totalVarianceAmount) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Expected recovery</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pumper Variance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pumper Variance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={pumperVariances}
                columns={pumperColumns}
                searchPlaceholder="Search pumpers..."
                emptyMessage="No pumper variance data available."
              />
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          {criticalPumpers > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Performance Alert</AlertTitle>
              <AlertDescription>
                {criticalPumpers} pumper{criticalPumpers > 1 ? 's have' : ' has'} critical variance rates exceeding 30%. 
                Immediate training and monitoring required to reduce losses.
              </AlertDescription>
            </Alert>
          )}

          {totalDueAmount > 10000 && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>High Recovery Amount</AlertTitle>
              <AlertDescription>
                Total amount due from pumpers is Rs. {totalDueAmount.toLocaleString()}. 
                Consider implementing stricter controls and recovery procedures.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}

