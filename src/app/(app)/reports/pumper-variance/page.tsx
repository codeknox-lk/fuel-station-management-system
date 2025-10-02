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
      // For now, we'll generate mock pumper variance data
      
      const station = stations.find(s => s.id === selectedStation)
      
      // Generate mock pumper variance data
      const pumperNames = [
        'John Silva', 'Mary Fernando', 'David Perera', 'Sarah Jayawardena',
        'Michael De Silva', 'Priya Wickramasinghe', 'Ravi Gunasekara', 'Nimal Rajapaksa'
      ]

      const pumperVariances: PumperVariance[] = pumperNames.map((name, index) => {
        const totalShifts = 25 + Math.floor(Math.random() * 10)
        const varianceCount = Math.floor(Math.random() * 8) + 1
        const shiftsWithVariance = Math.min(varianceCount, totalShifts)
        const totalVarianceAmount = Math.floor(Math.random() * 5000) + 500
        const maxSingleVariance = Math.floor(Math.random() * 1500) + 200
        const varianceRate = (shiftsWithVariance / totalShifts) * 100
        
        // Generate sparkline data (last 30 days)
        const dailyVariances = Array.from({ length: 30 }, (_, day) => ({
          day: day + 1,
          variance: Math.floor(Math.random() * 300) - 150 // -150 to +150
        }))

        // Determine performance rating
        let performanceRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'
        if (varianceRate <= 5) performanceRating = 'EXCELLENT'
        else if (varianceRate <= 15) performanceRating = 'GOOD'
        else if (varianceRate <= 30) performanceRating = 'NEEDS_IMPROVEMENT'
        else performanceRating = 'CRITICAL'

        return {
          pumperId: `pumper-${index + 1}`,
          pumperName: name,
          nozzleAssignments: [`Nozzle ${index + 1}`, `Nozzle ${index + 5}`],
          totalShifts,
          shiftsWithVariance,
          varianceCount,
          totalVarianceAmount,
          averageVariancePerShift: totalVarianceAmount / totalShifts,
          maxSingleVariance,
          varianceRate,
          performanceRating,
          dailyVariances,
          lastVarianceDate: varianceCount > 0 ? `${selectedYear}-${selectedMonth}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}` : undefined,
          consecutiveDaysWithoutVariance: Math.floor(Math.random() * 15),
          totalDueAmount: Math.floor(totalVarianceAmount * 0.7) // Assume 70% is due from pumper
        }
      })

      // Sort by variance rate (worst first)
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
      case 'EXCELLENT': return 'bg-green-100 text-green-800'
      case 'GOOD': return 'bg-blue-100 text-blue-800'
      case 'NEEDS_IMPROVEMENT': return 'bg-yellow-100 text-yellow-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
    if (rate <= 5) return 'text-green-600'
    if (rate <= 15) return 'text-blue-600'
    if (rate <= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const pumperColumns: Column<PumperVariance>[] = [
    {
      key: 'pumperName' as keyof PumperVariance,
      title: 'Pumper',
      render: (value: unknown, row: PumperVariance) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-gray-500">
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
          <div className="font-mono font-semibold text-red-600">
            {value as number}
          </div>
          <div className="text-xs text-gray-500">
            {row.shiftsWithVariance} shifts affected
          </div>
        </div>
      )
    },
    {
      key: 'totalVarianceAmount' as keyof PumperVariance,
      title: 'Total Variance',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-600">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'totalDueAmount' as keyof PumperVariance,
      title: 'Amount Due',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-orange-600">
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
      <h1 className="text-3xl font-bold text-gray-900">Pumper Variance Report</h1>

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
                <CardTitle className="text-sm font-medium text-blue-600">Total Pumpers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{totalPumpers}</div>
                <div className="text-xs text-gray-500">Active this month</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Excellent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{excellentPumpers}</div>
                <div className="text-xs text-gray-500">≤5% variance rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{criticalPumpers}</div>
                <div className="text-xs text-gray-500">≥30% variance rate</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">Total Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  Rs. {totalVarianceAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">All pumpers combined</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">Amount Due</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {totalDueAmount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">From pumpers</div>
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
                  <div className="text-lg font-semibold text-gray-600">Average Variance Rate</div>
                  <div className={`text-3xl font-bold ${getVarianceRateColor(averageVarianceRate)}`}>
                    {averageVarianceRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Across all pumpers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Performance Distribution</div>
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-800">
                      {excellentPumpers} Excellent
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {pumperVariances.filter(p => p.performanceRating === 'GOOD').length} Good
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {pumperVariances.filter(p => p.performanceRating === 'NEEDS_IMPROVEMENT').length} Needs Improvement
                    </Badge>
                    <Badge className="bg-red-100 text-red-800">
                      {criticalPumpers} Critical
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Recovery Rate</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {((totalDueAmount / totalVarianceAmount) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">Expected recovery</div>
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
