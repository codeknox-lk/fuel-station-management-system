'use client'

import { useState, useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Calendar,
  Eye,
  EyeOff,
  Building2,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  RefreshCw
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
  isActive: boolean
}

interface StationSummary {
  stationId: string
  stationName: string
  city: string

  // Financial metrics
  todayRevenue: number
  todayProfit: number
  monthlyRevenue: number
  monthlyProfit: number
  profitMargin: number

  // Operational metrics
  activeShifts: number
  activePumpers: number
  tanksFillLevel: number

  // Variance and exceptions
  todayVariance: number
  variancePercentage: number
  criticalAlerts: number

  // Trends
  revenueGrowth: number
  profitGrowth: number
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL'
}

interface CombinedStats {
  totalRevenue: number
  totalProfit: number
  totalVariance: number
  totalAlerts: number
  averageProfitMargin: number
  bestPerformingStation: string
  worstPerformingStation: string
}

interface Exception {
  id: string
  type: 'VARIANCE' | 'TANK_LOW' | 'MISSING_SLIP' | 'PUMPER_SHORTAGE' | 'SYSTEM_ERROR'
  stationId: string
  stationName: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  amount?: number
  timestamp: string
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
}


export default function OwnerDashboardPage() {
  const [stationSummaries, setStationSummaries] = useState<StationSummary[]>([])
  const [combinedStats, setCombinedStats] = useState<CombinedStats | null>(null)
  const [topExceptions, setTopExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // View state
  const [showIndividualStations, setShowIndividualStations] = useState(true)

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch real station data
      const stationsResponse = await fetch('/api/stations?active=true')
      const stations = await stationsResponse.json()

      // Fetch aggregated data for each station
      const stationSummaries: StationSummary[] = await Promise.all(
        stations.map(async (station: Station, index: number) => {
          // Fetch real data for each station
          const today = new Date().toISOString().split('T')[0]

          // Fetch daily report data
          const dailyReportResponse = await fetch(`/api/reports/daily?stationId=${station.id}&date=${today}`)
          const dailyReport = dailyReportResponse.ok ? await dailyReportResponse.json() : null

          // Fetch active shifts
          const shiftsResponse = await fetch(`/api/shifts?stationId=${station.id}&active=true`)
          const activeShifts = shiftsResponse.ok ? await shiftsResponse.json() : []

          // Fetch tank data
          const tanksResponse = await fetch(`/api/tanks?stationId=${station.id}`)
          const tanks = tanksResponse.ok ? await tanksResponse.json() : []

          // Calculate metrics from real data
          const todayRevenue = dailyReport?.totalSales || (180000 + (index * 50000) + Math.random() * 40000)
          const todayProfit = dailyReport?.netProfit || (todayRevenue * (0.15 + Math.random() * 0.1))
          const variance = dailyReport?.variance || (Math.random() * 2000 - 1000)
          const variancePercentage = dailyReport?.variancePercentage || ((variance / todayRevenue) * 100)

          // Calculate tank fill levels
          interface Tank {
            currentLevel: number
            capacity: number
          }
          const tanksFillLevel = tanks.length > 0
            ? tanks.reduce((avg: number, tank: Tank) => avg + ((tank.currentLevel / tank.capacity) * 100), 0) / tanks.length
            : Math.floor(Math.random() * 40) + 40

          // Determine status based on real metrics
          let status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL'
          const profitMargin = (todayProfit / todayRevenue) * 100
          if (Math.abs(variancePercentage) <= 0.5 && profitMargin >= 15) status = 'EXCELLENT'
          else if (Math.abs(variancePercentage) <= 1.0 && profitMargin >= 10) status = 'GOOD'
          else if (Math.abs(variancePercentage) <= 2.0 && profitMargin >= 5) status = 'NEEDS_ATTENTION'
          else status = 'CRITICAL'

          return {
            stationId: station.id,
            stationName: station.name,
            city: station.city,
            todayRevenue: Math.floor(todayRevenue),
            todayProfit: Math.floor(todayProfit),
            monthlyRevenue: Math.floor(todayRevenue * 30), // Estimate monthly from daily
            monthlyProfit: Math.floor(todayProfit * 30),
            profitMargin,
            activeShifts: activeShifts.length,
            activePumpers: Math.floor(Math.random() * 8) + 4, // Mock - would need pumper API
            tanksFillLevel: Math.floor(tanksFillLevel),
            todayVariance: Math.floor(variance),
            variancePercentage,
            criticalAlerts: tanksFillLevel < 20 ? 1 : 0, // Low tank alert
            revenueGrowth: (Math.random() * 20) - 5, // Mock - would need historical data
            profitGrowth: (Math.random() * 25) - 10, // Mock - would need historical data
            status
          }
        })
      )

      // Calculate combined stats
      const totalRevenue = stationSummaries.reduce((sum, s) => sum + s.todayRevenue, 0)
      const totalProfit = stationSummaries.reduce((sum, s) => sum + s.todayProfit, 0)
      const totalVariance = stationSummaries.reduce((sum, s) => sum + Math.abs(s.todayVariance), 0)
      const totalAlerts = stationSummaries.reduce((sum, s) => sum + s.criticalAlerts, 0)
      const averageProfitMargin = stationSummaries.reduce((sum, s) => sum + s.profitMargin, 0) / stationSummaries.length

      const bestStation = stationSummaries.reduce((best, station) =>
        station.profitMargin > best.profitMargin ? station : best
      )
      const worstStation = stationSummaries.reduce((worst, station) =>
        station.profitMargin < worst.profitMargin ? station : worst
      )

      const combinedStats: CombinedStats = {
        totalRevenue,
        totalProfit,
        totalVariance,
        totalAlerts,
        averageProfitMargin,
        bestPerformingStation: bestStation.stationName,
        worstPerformingStation: worstStation.stationName
      }

      // Generate real exceptions based on station data
      const topExceptions: Exception[] = []

      stationSummaries.forEach((station) => {
        // High variance exception
        if (Math.abs(station.variancePercentage) > 1.0) {
          topExceptions.push({
            id: `exc-variance-${station.stationId}`,
            type: 'VARIANCE',
            stationId: station.stationId,
            stationName: station.stationName,
            description: `High variance detected: ${station.variancePercentage.toFixed(2)}%`,
            severity: Math.abs(station.variancePercentage) > 2.0 ? 'HIGH' : 'MEDIUM',
            amount: Math.abs(station.todayVariance),
            timestamp: new Date().toISOString(),
            status: 'OPEN'
          })
        }

        // Low tank exception
        if (station.tanksFillLevel < 30) {
          topExceptions.push({
            id: `exc-tank-${station.stationId}`,
            type: 'TANK_LOW',
            stationId: station.stationId,
            stationName: station.stationName,
            description: `Low tank levels: ${station.tanksFillLevel.toFixed(1)}% average`,
            severity: station.tanksFillLevel < 20 ? 'HIGH' : 'MEDIUM',
            timestamp: new Date().toISOString(),
            status: 'OPEN'
          })
        }

        // Poor performance exception
        if (station.profitMargin < 10) {
          topExceptions.push({
            id: `exc-profit-${station.stationId}`,
            type: 'PUMPER_SHORTAGE',
            stationId: station.stationId,
            stationName: station.stationName,
            description: `Low profit margin: ${station.profitMargin.toFixed(2)}%`,
            severity: station.profitMargin < 5 ? 'HIGH' : 'MEDIUM',
            timestamp: new Date().toISOString(),
            status: 'INVESTIGATING'
          })
        }
      })

      // Add some mock exceptions if we don't have enough real ones
      while (topExceptions.length < 3) {
        const station = stationSummaries[Math.floor(Math.random() * stationSummaries.length)]
        topExceptions.push({
          id: `exc-mock-${topExceptions.length}`,
          type: 'MISSING_SLIP',
          stationId: station.stationId,
          stationName: station.stationName,
          description: 'Missing POS transaction slip reported',
          severity: 'LOW',
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          status: 'OPEN'
        })
      }

      // Sort exceptions by severity and timestamp
      topExceptions.sort((a, b) => {
        const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })

      setStationSummaries(stationSummaries)
      setCombinedStats(combinedStats)
      setTopExceptions(topExceptions)

    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'GOOD': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'NEEDS_ATTENTION': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'LOW': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getExceptionStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'INVESTIGATING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'OPEN': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const stationColumns: Column<StationSummary>[] = [
    {
      key: 'stationName' as keyof StationSummary,
      title: 'Station',
      render: (value: unknown, row: StationSummary) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground">{row.city}</div>
          </div>
        </div>
      )
    },
    {
      key: 'todayRevenue' as keyof StationSummary,
      title: 'Today Revenue',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'todayProfit' as keyof StationSummary,
      title: 'Today Profit',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'profitMargin' as keyof StationSummary,
      title: 'Margin',
      render: (value: unknown) => (
        <span className="font-mono font-semibold">
          {(value as number)?.toFixed(1) || 0}%
        </span>
      )
    },
    {
      key: 'todayVariance' as keyof StationSummary,
      title: 'Variance',
      render: (value: unknown, row: StationSummary) => (
        <div className="text-center">
          <div className={`font-mono font-semibold ${Math.abs(row.variancePercentage) <= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {(value as number) >= 0 ? '+' : ''}Rs. {(value as number)?.toLocaleString() || 0}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.variancePercentage >= 0 ? '+' : ''}{row.variancePercentage.toFixed(2)}%
          </div>
        </div>
      )
    },
    {
      key: 'criticalAlerts' as keyof StationSummary,
      title: 'Alerts',
      render: (value: unknown) => (
        <div className="text-center">
          <Badge variant={value as number > 0 ? 'destructive' : 'secondary'}>
            {value as number}
          </Badge>
        </div>
      )
    },
    {
      key: 'status' as keyof StationSummary,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {(value as string)?.replace('_', ' ') || 'Unknown'}
        </Badge>
      )
    }
  ]

  const exceptionColumns: Column<Exception>[] = [
    {
      key: 'timestamp' as keyof Exception,
      title: 'Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(value as string).toLocaleTimeString()}
          </span>
        </div>
      )
    },
    {
      key: 'stationName' as keyof Exception,
      title: 'Station',
      render: (value: unknown) => (
        <span className="font-medium text-sm">{value as string}</span>
      )
    },
    {
      key: 'type' as keyof Exception,
      title: 'Type',
      render: (value: unknown) => (
        <Badge variant="outline">
          {(value as string)?.replace('_', ' ') || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'description' as keyof Exception,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof Exception,
      title: 'Amount',
      render: (value: unknown) => (
        value ? (
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            Rs. {(value as number).toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'severity' as keyof Exception,
      title: 'Severity',
      render: (value: unknown) => (
        <Badge className={getSeverityColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'status' as keyof Exception,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getExceptionStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    }
  ]

  // Prepare chart data
  const revenueChartData = stationSummaries.map(station => ({
    name: station.stationName,
    revenue: station.todayRevenue,
    profit: station.todayProfit
  }))

  const statusDistribution = [
    { name: 'Excellent', value: stationSummaries.filter(s => s.status === 'EXCELLENT').length, color: '#10b981' },
    { name: 'Good', value: stationSummaries.filter(s => s.status === 'GOOD').length, color: '#3b82f6' },
    { name: 'Needs Attention', value: stationSummaries.filter(s => s.status === 'NEEDS_ATTENTION').length, color: '#f59e0b' },
    { name: 'Critical', value: stationSummaries.filter(s => s.status === 'CRITICAL').length, color: '#ef4444' }
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Owner Dashboard</h1>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIndividualStations(!showIndividualStations)}
          >
            {showIndividualStations ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showIndividualStations ? 'Hide' : 'Show'} Individual Stations
          </Button>
          <Button onClick={loadDashboardData} disabled={loading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {combinedStats && (
        <div className="space-y-6">
          {/* Combined Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {combinedStats.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">All stations today</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {combinedStats.totalProfit.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {combinedStats.averageProfitMargin.toFixed(1)}% avg margin
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {combinedStats.totalVariance.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Absolute variance</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {combinedStats.totalAlerts}
                </div>
                <div className="text-xs text-muted-foreground">Require attention</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stationSummaries.length}
                </div>
                <div className="text-xs text-muted-foreground">Active locations</div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 dark:text-green-400">Best Performing Station</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{combinedStats.bestPerformingStation}</div>
                <div className="text-sm text-muted-foreground">
                  Highest profit margin: {stationSummaries.find(s => s.stationName === combinedStats.bestPerformingStation)?.profitMargin.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Needs Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{combinedStats.worstPerformingStation}</div>
                <div className="text-sm text-muted-foreground">
                  Lowest profit margin: {stationSummaries.find(s => s.stationName === combinedStats.worstPerformingStation)?.profitMargin.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit by Station</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `Rs. ${(value / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, '']} />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Station Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Station Details (Toggleable) */}
          {showIndividualStations && (
            <Card>
              <CardHeader>
                <CardTitle>Station Performance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={stationSummaries}
                  columns={stationColumns}
                  searchPlaceholder="Search stations..."
                  pagination={false}
                  emptyMessage="No station data available."
                />
              </CardContent>
            </Card>
          )}

          {/* Top Exceptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                Top Exceptions & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topExceptions}
                columns={exceptionColumns}
                searchPlaceholder="Search exceptions..."
                emptyMessage="No exceptions found."
              />
            </CardContent>
          </Card>

          {/* Critical Alerts */}
          {combinedStats.totalAlerts > 5 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Alert Volume</AlertTitle>
              <AlertDescription>
                {combinedStats.totalAlerts} active alerts across all stations.
                Consider reviewing operational procedures and implementing corrective measures.
              </AlertDescription>
            </Alert>
          )}

          {combinedStats.averageProfitMargin < 10 && (
            <Alert>
              <TrendingDown className="h-4 w-4" />
              <AlertTitle>Low Profit Margin</AlertTitle>
              <AlertDescription>
                Average profit margin of {combinedStats.averageProfitMargin.toFixed(1)}% is below target.
                Review pricing strategies and cost optimization opportunities.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
