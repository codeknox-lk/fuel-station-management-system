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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Calendar,
  Fuel,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Download,
  FileText,
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Droplets,
  Package,
  ShoppingCart,
  BarChart3,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  Truck
} from 'lucide-react'
import { exportTankReportPDF } from '@/lib/exportUtils'

interface Station {
  id: string
  name: string
  city: string
}

interface DeliveryDetail {
  id: string
  deliveryNumber: string
  supplier: string
  quantity: number
  deliveryTime: string
  invoiceNumber?: string
  driverName?: string
}

interface TestPourDetail {
  id: string
  nozzleNumber: string
  pumpNumber: string
  amount: number
  returned: boolean
  time: string
  performedBy: string
}

interface TankMovement {
  id: string
  tankId: string
  tankNumber: string
  tankName: string
  fuelName: string
  capacity: number
  date: string

  // Opening balances
  openingDip: number
  openingBook: number
  openingPercentage: number

  // Movements
  deliveries: number
  deliveryCount: number
  deliveryDetails: DeliveryDetail[]
  sales: number
  salesTransactionCount: number
  testReturns: number
  testPourDetails: TestPourDetail[]
  adjustments: number

  // Closing balances
  closingBook: number
  closingDip: number
  closingPercentage: number

  // Variance analysis
  variance: number
  variancePercentage: number
  varianceStatus: 'WITHIN_TOLERANCE' | 'NEEDS_REVIEW' | 'CRITICAL'

  // Additional metrics
  averageDailySales: number
  daysUntilEmpty: number
  lastDeliveryDate?: string
  lastDeliveryQuantity?: number
  recommendedDeliveryDate?: string
}

interface TankReportSummary {
  totalTanks: number
  totalCapacity: number
  totalOpeningStock: number
  totalDeliveries: number
  totalSales: number
  totalTestReturns: number
  totalClosingStock: number
  totalVariance: number
  averageVariancePercentage: number
  tanksWithinTolerance: number
  tanksNeedingReview: number
  criticalTanks: number
  lowFillTanks: number
  tanksNeedingDelivery: number
}

interface TankApiResponse {
  tankId: string
  tankNumber: string
  fuel?: { name: string }
  capacity: number
  openingStock: number
  closingBookStock: number
  closingDipStock: number
  deliveries: number
  sales: number
  testReturns: number
  variance: number
  variancePercentage: number
  toleranceStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
}

export default function TanksReportsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [tankMovements, setTankMovements] = useState<TankMovement[]>([])
  const [summary, setSummary] = useState<TankReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Load initial data
  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await fetch('/api/stations?active=true')
        const stationsData = await response.json()
        setStations(stationsData)
      } catch (_err) {
        setError('Failed to load stations')
      }
    }

    loadStations()
  }, [])

  const generateReport = async () => {
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call API endpoint to get real tank report data
      const url = `/api/tanks/report?stationId=${selectedStation}&date=${selectedDate}`

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error || `Failed to fetch tank report: ${response.status}`)
      }

      const reportData = await response.json()

      const station = stations.find(s => s.id === selectedStation)

      // Transform API data to match frontend interface
      const tankMovements: TankMovement[] = (reportData.tanks || []).map((tank: TankApiResponse, idx: number) => {
        const openingStock = tank.openingStock || 0
        const closingBookStock = tank.closingBookStock || 0
        const closingDipStock = tank.closingDipStock || 0
        const capacity = tank.capacity || 10000

        return {
          id: tank.tankId || `tank-${idx}`,
          tankId: tank.tankId,
          tankNumber: tank.tankNumber || `T-${String(idx + 1).padStart(3, '0')}`,
          tankName: `Tank ${tank.tankNumber || idx + 1}`,
          fuelName: tank.fuel?.name || 'UNKNOWN',
          capacity,
          date: selectedDate,
          openingDip: closingDipStock, // Use closing dip as approximation for opening (API limitation)
          openingBook: openingStock,
          openingPercentage: capacity > 0 ? (openingStock / capacity) * 100 : 0,
          deliveries: tank.deliveries || 0,
          deliveryCount: 0, // Would need to fetch deliveries separately
          deliveryDetails: [],
          sales: tank.sales || 0,
          salesTransactionCount: 0,
          testReturns: tank.testReturns || 0,
          testPourDetails: [],
          adjustments: 0,
          closingBook: closingBookStock,
          closingDip: closingDipStock,
          closingPercentage: capacity > 0 ? (closingBookStock / capacity) * 100 : 0,
          variance: tank.variance || 0,
          variancePercentage: tank.variancePercentage || 0,
          varianceStatus: (tank.toleranceStatus === 'NORMAL' ? 'WITHIN_TOLERANCE' :
            tank.toleranceStatus === 'WARNING' ? 'NEEDS_REVIEW' :
              tank.toleranceStatus === 'CRITICAL' ? 'CRITICAL' : 'NORMAL') as TankMovement['varianceStatus'],
          averageDailySales: tank.sales || 0,
          daysUntilEmpty: (tank.sales || 0) > 0 ? (closingBookStock / tank.sales) : 0,
          lastDeliveryDate: selectedDate,
          lastDeliveryQuantity: tank.deliveries || 0,
          recommendedDeliveryDate: new Date(new Date(selectedDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      })

      // Calculate summary statistics from real data
      const totalTanks = tankMovements.length
      const totalCapacity = tankMovements.reduce((sum, t) => sum + t.capacity, 0)
      const totalOpeningStock = tankMovements.reduce((sum, t) => sum + t.openingDip, 0)
      const totalDeliveries = tankMovements.reduce((sum, t) => sum + t.deliveries, 0)
      const totalSales = tankMovements.reduce((sum, t) => sum + t.sales, 0)
      const totalTestReturns = tankMovements.reduce((sum, t) => sum + t.testReturns, 0)
      const totalClosingStock = tankMovements.reduce((sum, t) => sum + t.closingDip, 0)
      const totalVariance = tankMovements.reduce((sum, t) => sum + Math.abs(t.variance), 0)
      const averageVariancePercentage = tankMovements.length > 0
        ? tankMovements.reduce((sum, t) => sum + Math.abs(t.variancePercentage), 0) / tankMovements.length
        : 0
      const tanksWithinTolerance = tankMovements.filter(t => t.varianceStatus === 'WITHIN_TOLERANCE').length
      const tanksNeedingReview = tankMovements.filter(t => t.varianceStatus === 'NEEDS_REVIEW').length
      const criticalTanks = tankMovements.filter(t => t.varianceStatus === 'CRITICAL').length
      const lowFillTanks = tankMovements.filter(t => t.closingPercentage < 30).length
      const tanksNeedingDelivery = tankMovements.filter(t => t.closingPercentage < 20 || t.daysUntilEmpty < 2).length

      const reportSummary: TankReportSummary = {
        totalTanks,
        totalCapacity,
        totalOpeningStock,
        totalDeliveries,
        totalSales,
        totalTestReturns,
        totalClosingStock,
        totalVariance,
        averageVariancePercentage,
        tanksWithinTolerance,
        tanksNeedingReview,
        criticalTanks,
        lowFillTanks,
        tanksNeedingDelivery
      }

      setTankMovements(tankMovements)
      setSummary(reportSummary)

    } catch (_err) {
      setError('Failed to generate tank movement report')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!selectedStation || tankMovements.length === 0) {
      alert('Please select a station and generate a report first')
      return
    }

    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const dateStr = selectedDate

    const exportData = tankMovements.map(tm => ({
      ...tm,
      openingStock: tm.openingBook, // Using book stock as primary opening stock
      status: tm.varianceStatus
    }))

    exportTankReportPDF(exportData, stationName, dateStr)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 1.0) return 'text-green-600 dark:text-green-400'
    if (Math.abs(percentage) <= 3.0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WITHIN_TOLERANCE': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'NEEDS_REVIEW': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WITHIN_TOLERANCE': return <CheckCircle className="h-4 w-4" />
      case 'NEEDS_REVIEW': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getFillColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 30) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getFillBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Main tank columns
  const tankColumns: Column<TankMovement>[] = [
    {
      key: 'tankName' as keyof TankMovement,
      title: 'Tank',
      render: (value: unknown, row: TankMovement) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground">{row.tankNumber} • {row.fuelName}</div>
          </div>
        </div>
      )
    },
    {
      key: 'capacity' as keyof TankMovement,
      title: 'Capacity',
      render: (value: unknown) => (
        <span className="text-sm">{(value as number)?.toLocaleString() || 0}L</span>
      )
    },
    {
      key: 'openingDip' as keyof TankMovement,
      title: 'Opening Stock',
      render: (value: unknown, row: TankMovement) => (
        <div>
          <div className="text-sm font-semibold">{(value as number)?.toLocaleString() || 0}L</div>
          <div className="text-xs text-muted-foreground">
            Book: {row.openingBook?.toLocaleString() || 0}L
          </div>
          <div className="text-xs text-muted-foreground">
            {row.openingPercentage?.toFixed(1) || 0}%
          </div>
        </div>
      )
    },
    {
      key: 'deliveries' as keyof TankMovement,
      title: 'Deliveries',
      render: (value: unknown, row: TankMovement) => (
        <div>
          <div className="font-semibold text-green-600 dark:text-green-400">
            +{(value as number)?.toLocaleString() || 0}L
          </div>
          {row.deliveryCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {row.deliveryCount} delivery{row.deliveryCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'sales' as keyof TankMovement,
      title: 'Sales',
      render: (value: unknown, row: TankMovement) => (
        <div>
          <div className="font-semibold text-red-600 dark:text-red-400">
            -{(value as number)?.toLocaleString() || 0}L
          </div>
          <div className="text-xs text-muted-foreground">
            {row.salesTransactionCount} transactions
          </div>
        </div>
      )
    },
    {
      key: 'testReturns' as keyof TankMovement,
      title: 'Test Returns',
      render: (value: unknown) => (
        <div className="font-semibold text-blue-600 dark:text-blue-400">
          +{(value as number)?.toLocaleString() || 0}L
        </div>
      )
    },
    {
      key: 'closingDip' as keyof TankMovement,
      title: 'Closing Stock',
      render: (value: unknown, row: TankMovement) => (
        <div>
          <div className="text-sm font-semibold">{(value as number)?.toLocaleString() || 0}L</div>
          <div className="text-xs text-muted-foreground">
            Book: {row.closingBook?.toLocaleString() || 0}L
          </div>
          <div className="text-xs text-muted-foreground">
            {row.closingPercentage?.toFixed(1) || 0}%
          </div>
        </div>
      )
    },
    {
      key: 'variance' as keyof TankMovement,
      title: 'Variance',
      render: (value: unknown, row: TankMovement) => (
        <div>
          <div className={`font-semibold ${getVarianceColor(row.variancePercentage)}`}>
            {(value as number) >= 0 ? '+' : ''}{(value as number)?.toLocaleString() || 0}L
          </div>
          <div className={`text-xs ${getVarianceColor(row.variancePercentage)}`}>
            {row.variancePercentage >= 0 ? '+' : ''}{row.variancePercentage.toFixed(2)}%
          </div>
        </div>
      )
    },
    {
      key: 'closingPercentage' as keyof TankMovement,
      title: 'Fill Level',
      render: (value: unknown, row: TankMovement) => {
        const percentage = value as number
        return (
          <div className="min-w-[100px]">
            <div className={`font-semibold mb-1 ${getFillColor(percentage)}`}>
              {percentage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getFillBarColor(percentage)}`}
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              ></div>
            </div>
            {row.daysUntilEmpty && (
              <div className="text-xs text-muted-foreground mt-1">
                ~{row.daysUntilEmpty.toFixed(1)} days left
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'varianceStatus' as keyof TankMovement,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          <div className="flex items-center gap-1">
            {getStatusIcon(value as string)}
            <span>{(value as string)?.replace('_', ' ') || 'Unknown'}</span>
          </div>
        </Badge>
      )
    }
  ]

  // Delivery detail columns
  const deliveryColumns: Column<DeliveryDetail>[] = [
    {
      key: 'deliveryNumber' as keyof DeliveryDetail,
      title: 'Delivery #',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'supplier' as keyof DeliveryDetail,
      title: 'Supplier',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'quantity' as keyof DeliveryDetail,
      title: 'Quantity',
      render: (value: unknown) => (
        <span className="font-semibold text-green-600">
          +{(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'deliveryTime' as keyof DeliveryDetail,
      title: 'Time',
      render: (value: unknown) => (
        <span className="text-sm">
          {new Date(value as string).toLocaleTimeString()}
        </span>
      )
    },
    {
      key: 'invoiceNumber' as keyof DeliveryDetail,
      title: 'Invoice',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string || 'N/A'}</span>
      )
    },
    {
      key: 'driverName' as keyof DeliveryDetail,
      title: 'Driver',
      render: (value: unknown) => (
        <span className="text-sm">{value as string || 'N/A'}</span>
      )
    }
  ]

  // Test pour detail columns
  const testPourColumns: Column<TestPourDetail>[] = [
    {
      key: 'nozzleNumber' as keyof TestPourDetail,
      title: 'Nozzle',
      render: (value: unknown, row: TestPourDetail) => (
        <div>
          <div className="font-medium">P-{row.pumpNumber} N-{value as string}</div>
        </div>
      )
    },
    {
      key: 'amount' as keyof TestPourDetail,
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-semibold text-blue-600">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'returned' as keyof TestPourDetail,
      title: 'Returned',
      render: (value: unknown) => (
        <Badge variant={value ? "outline" : "destructive"}>
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    },
    {
      key: 'time' as keyof TestPourDetail,
      title: 'Time',
      render: (value: unknown) => (
        <span className="text-sm">
          {new Date(value as string).toLocaleTimeString()}
        </span>
      )
    },
    {
      key: 'performedBy' as keyof TestPourDetail,
      title: 'Performed By',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Droplets className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Tank Movement & Variance Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive daily tank inventory analysis with variance tracking
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Generator */}
      <FormCard title="Generate Tank Report" description="Select station and date to generate comprehensive tank movement report">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="station">Station *</Label>
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
            <Label htmlFor="date">Date *</Label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={generateReport} disabled={loading || !selectedStation || !selectedDate} className="w-full">
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

      {summary && tankMovements.length > 0 && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Tank Movement Report
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {stations.find(s => s.id === selectedStation)?.name} • {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportToPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-600" />
                  Total Tanks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {summary.totalTanks}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.totalCapacity.toLocaleString()}L capacity
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  Total Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {summary.totalDeliveries.toLocaleString()}L
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tankMovements.filter(t => t.deliveryCount > 0).length} tanks
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-red-600" />
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {summary.totalSales.toLocaleString()}L
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {tankMovements.reduce((sum, t) => sum + t.salesTransactionCount, 0)} transactions
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  Total Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {summary.totalVariance.toLocaleString()}L
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Avg: {summary.averageVariancePercentage.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-orange-600" />
                  Closing Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {summary.totalClosingStock.toLocaleString()}L
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((summary.totalClosingStock / summary.totalCapacity) * 100).toFixed(1)}% of capacity
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Within Tolerance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {summary.tanksWithinTolerance}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.totalTanks > 0 ? ((summary.tanksWithinTolerance / summary.totalTanks) * 100).toFixed(0) : 0}% of tanks
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Needs Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.tanksNeedingReview}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Variance 1-3%
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Critical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {summary.criticalTanks}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Variance {'>'}3%
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Low Fill
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {summary.lowFillTanks}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Below 30% capacity
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tank Movement Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Tank Movement & Variance Details
              </CardTitle>
              <CardDescription>Complete daily movement and variance analysis for all tanks</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={tankMovements}
                columns={tankColumns}
                searchable={true}
                searchPlaceholder="Search tanks..."
                pagination={false}
                emptyMessage="No tank movement data available."
              />
            </CardContent>
          </Card>

          {/* Detailed Breakdowns by Tank */}
          {tankMovements.map((tank) => (
            <Card key={tank.id} className="border-l-4" style={{ borderLeftColor: getFillBarColor(tank.closingPercentage) }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Fuel className="h-5 w-5" />
                      {tank.tankName} - {tank.fuelName}
                    </CardTitle>
                    <CardDescription>
                      {tank.tankNumber} • Capacity: {tank.capacity.toLocaleString()}L
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(tank.varianceStatus)}>
                    {getStatusIcon(tank.varianceStatus)}
                    <span className="ml-1">{tank.varianceStatus.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tank Level Visualization */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Opening Stock</div>
                    <div className="text-2xl font-bold">{tank.openingDip.toLocaleString()}L</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tank.openingPercentage.toFixed(1)}% • Book: {tank.openingBook.toLocaleString()}L
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Closing Stock</div>
                    <div className="text-2xl font-bold">{tank.closingDip.toLocaleString()}L</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tank.closingPercentage.toFixed(1)}% • Book: {tank.closingBook.toLocaleString()}L
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Variance</div>
                    <div className={`text-2xl font-bold ${getVarianceColor(tank.variancePercentage)}`}>
                      {tank.variance >= 0 ? '+' : ''}{tank.variance.toLocaleString()}L
                    </div>
                    <div className={`text-xs mt-1 ${getVarianceColor(tank.variancePercentage)}`}>
                      {tank.variancePercentage >= 0 ? '+' : ''}{tank.variancePercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Movements Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Deliveries</span>
                    </div>
                    <div className="text-xl font-bold text-green-600">
                      +{tank.deliveries.toLocaleString()}L
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tank.deliveryCount} delivery{tank.deliveryCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingCart className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Sales</span>
                    </div>
                    <div className="text-xl font-bold text-red-600">
                      -{tank.sales.toLocaleString()}L
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tank.salesTransactionCount} transactions
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Test Returns</span>
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      +{tank.testReturns.toLocaleString()}L
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tank.testPourDetails.length} test{tank.testPourDetails.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Days Left</span>
                    </div>
                    <div className="text-xl font-bold text-purple-600">
                      {tank.daysUntilEmpty.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg sales: {tank.averageDailySales.toLocaleString()}L/day
                    </div>
                  </div>
                </div>

                {/* Delivery Details */}
                {tank.deliveryDetails.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Delivery Details
                    </h4>
                    <DataTable
                      data={tank.deliveryDetails}
                      columns={deliveryColumns}
                      pagination={false}
                      searchable={false}
                    />
                  </div>
                )}

                {/* Test Pour Details */}
                {tank.testPourDetails.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Test Pour Details
                    </h4>
                    <DataTable
                      data={tank.testPourDetails}
                      columns={testPourColumns}
                      pagination={false}
                      searchable={false}
                    />
                  </div>
                )}

                {/* Recommendations */}
                {tank.recommendedDeliveryDate && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Delivery Recommendation</AlertTitle>
                    <AlertDescription>
                      Recommended delivery date: <strong>{new Date(tank.recommendedDeliveryDate).toLocaleDateString()}</strong>
                      {tank.lastDeliveryDate && (
                        <> • Last delivery: {new Date(tank.lastDeliveryDate).toLocaleDateString()} ({tank.lastDeliveryQuantity?.toLocaleString()}L)</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Critical Alerts */}
          {summary.criticalTanks > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Variance Alert</AlertTitle>
              <AlertDescription>
                {summary.criticalTanks} tank{summary.criticalTanks > 1 ? 's have' : ' has'} critical variance levels exceeding 3%.
                Immediate investigation and corrective action required.
              </AlertDescription>
            </Alert>
          )}

          {summary.lowFillTanks > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Low Fill Level Warning</AlertTitle>
              <AlertDescription>
                {summary.lowFillTanks} tank{summary.lowFillTanks > 1 ? 's are' : ' is'} below 30% capacity.
                Consider scheduling fuel deliveries to prevent stock-outs.
              </AlertDescription>
            </Alert>
          )}

          {summary.tanksNeedingDelivery > 0 && (
            <Alert>
              <Truck className="h-4 w-4" />
              <AlertTitle>Delivery Scheduling Required</AlertTitle>
              <AlertDescription>
                {summary.tanksNeedingDelivery} tank{summary.tanksNeedingDelivery > 1 ? 's require' : ' requires'} immediate delivery scheduling
                (below 20% capacity or less than 2 days of stock remaining).
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
