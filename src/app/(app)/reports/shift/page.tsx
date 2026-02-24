'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Clock,
  User,
  Fuel,
  AlertCircle,
  Calculator,
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  FileText,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { exportShiftReportPDF } from '@/lib/exportUtils'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis
} from 'recharts'

interface DeclaredAmounts {
  cash: number
  card: number
  credit: number
  cheque: number
  pumperBreakdown: Array<{
    pumperName: string
    declaredAmount: number
  }>
}

interface Shift {
  id: string
  stationId: string
  stationName: string
  templateName: string
  startTime: string
  endTime: string
  status: 'ACTIVE' | 'CLOSED'
  declaredAmounts?: DeclaredAmounts
}

interface ApiShift {
  id: string
  stationId: string
  station?: { name: string }
  template?: { name: string }
  startTime: string
  endTime?: string
  status: 'ACTIVE' | 'CLOSED'
  declaredAmounts?: DeclaredAmounts
}

interface ApiAssignment {
  id: string
  nozzleId?: string
  nozzleNumber?: string
  pumperName?: string
  sales?: number
  fuelId?: string
  fuel?: { name: string; icon?: React.ReactNode }
  startMeterReading?: number
  endMeterReading?: number
  litersSold?: number
  pricePerLiter?: number
}

interface ShopAssignmentReport {
  id: string
  pumperId: string
  pumperName: string
  status: string
  totalRevenue: number
  items: Array<{
    id: string
    productId: string
    productName: string
    openingStock: number
    addedStock: number
    closingStock: number | null
    soldQuantity: number
    revenue: number
  }>
}

interface ShiftReport {
  shift: Shift
  nozzleReports: NozzleReport[]
  tenderSummary: TenderSummary
  shopAssignment: ShopAssignmentReport | null
  totalVariance: number
  variancePercentage: number
  overallStatus: 'BALANCED' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE'
  efficiencyScore: number
}

interface NozzleReport {
  nozzleId: string
  nozzleName: string
  fuel?: { name: string; icon?: React.ReactNode }
  fuelId?: string
  pumperName: string
  startMeter: number
  endMeter: number
  litersSold: number
  salesAmount: number
  pricePerLiter: number
  variance: number
  variancePercentage: number
  status: 'BALANCED' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE'
}

interface TenderSummary {
  cashTotal: number
  cardTotals: { [bank: string]: number }
  creditTotal: number
  chequeTotal: number
  totalDeclared: number
  totalCalculated: number
  fuelSales: number
  shopSales: number
  variance: number
}

export default function ShiftReportsPage() {
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, isAllStations } = useStation()
  const [selectedShift, setSelectedShift] = useState('')

  // Load shifts from API
  const loadShifts = useCallback(async () => {
    try {
      const response = await fetch(`/api/shifts?stationId=${selectedStation}&status=CLOSED&limit=20`)
      if (!response.ok) {
        throw new Error('Failed to fetch shifts')
      }
      const data = await response.json()
      // API returns { shifts: [], pagination: {}, summary: {} }
      const shiftsArray = Array.isArray(data) ? data : (data.shifts || [])

      // Transform API response to match expected interface
      const transformedShifts: Shift[] = shiftsArray.map((shift: ApiShift) => ({
        id: shift.id,
        stationId: shift.stationId,
        stationName: shift.station?.name || 'Unknown Station',
        templateName: shift.template?.name || 'Unknown Template',
        startTime: shift.startTime,
        endTime: shift.endTime || shift.startTime, // Use startTime as fallback if endTime is null
        status: shift.status,
        declaredAmounts: shift.declaredAmounts
      }))

      setShifts(transformedShifts)
    } catch (err) {
      console.error('Error loading shifts:', err)
      setError('Failed to load shifts')
      setShifts([])
    }
  }, [selectedStation])

  // Load shifts when station changes
  useEffect(() => {
    if (selectedStation) {
      loadShifts()
    } else {
      setShifts([])
      setSelectedShift('')
    }
  }, [selectedStation, loadShifts])

  const generateReport = async () => {
    if (!selectedShift) {
      setError('Please select a shift')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call API endpoint to get real shift report data
      const response = await fetch(`/api/shifts/${selectedShift}/report`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch shift report: ${response.status}`)
      }

      const apiData = await response.json()
      const reportData = apiData.data || apiData

      // Transform API data to match frontend interface
      const shift = shifts.find(s => s.id === selectedShift)
      if (!shift) {
        throw new Error('Shift not found in local data')
      }

      // Transform assignments to nozzle reports
      const nozzleReports: NozzleReport[] = (reportData.assignments || []).map((assignment: ApiAssignment): NozzleReport => {
        const declared = shift.declaredAmounts?.pumperBreakdown || []
        const pumperBreakdown = declared.find((b) => b.pumperName === assignment.pumperName)
        const calculatedSales = assignment.sales || 0
        const declaredAmount = pumperBreakdown?.declaredAmount || 0
        const variance = declaredAmount - calculatedSales
        const variancePercentage = calculatedSales > 0 ? (variance / calculatedSales) * 100 : 0

        let status: 'BALANCED' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' = 'BALANCED'
        if (Math.abs(variancePercentage) > 1.0) {
          status = 'MAJOR_VARIANCE'
        } else if (Math.abs(variancePercentage) > 0.3) {
          status = 'MINOR_VARIANCE'
        }

        return {
          nozzleId: assignment.nozzleId || assignment.id,
          nozzleName: `Nozzle ${assignment.nozzleNumber || assignment.nozzleId || 'Unknown'}`,
          fuelId: assignment.fuelId || '',
          fuel: assignment.fuel,
          pumperName: assignment.pumperName || 'Unknown',
          startMeter: assignment.startMeterReading || 0,
          endMeter: assignment.endMeterReading || 0,
          litersSold: assignment.litersSold || 0,
          salesAmount: calculatedSales,
          pricePerLiter: assignment.pricePerLiter || 0,
          variance: variance,
          variancePercentage: variancePercentage,
          status: status
        }
      })

      // Get tender summary from shift declared amounts
      const declaredAmounts = shift.declaredAmounts || {
        cash: 0,
        card: 0,
        credit: 0,
        cheque: 0,
        pumperBreakdown: []
      }
      const cashTotal = declaredAmounts.cash || 0
      const cardTotal = declaredAmounts.card || 0
      const creditTotal = declaredAmounts.credit || 0
      const chequeTotal = declaredAmounts.cheque || 0

      // Get POS batches for card breakdown
      const posBatchesResponse = await fetch(`/api/pos/batches?shiftId=${selectedShift}`).catch(() => null)
      const cardTotals: Record<string, number> = {}
      if (posBatchesResponse && posBatchesResponse.ok) {
        const batches = await posBatchesResponse.json()
        for (const batch of batches) {
          if (batch.terminalEntries) {
            for (const entry of batch.terminalEntries) {
              const bankName = entry.terminal?.bank?.name || 'Unknown Bank'
              const amount = (entry.visaAmount || 0) + (entry.masterAmount || 0) + (entry.amexAmount || 0) + (entry.qrAmount || 0) + (entry.dialogTouchAmount || 0)
              cardTotals[bankName] = (cardTotals[bankName] || 0) + amount
            }
          }
        }
      }

      const totalDeclared = cashTotal + cardTotal + creditTotal + chequeTotal
      const totalCalculated = reportData.summary?.totalSales || nozzleReports.reduce((sum, r) => sum + r.salesAmount, 0)
      const tenderVariance = totalDeclared - totalCalculated

      const tenderSummary: TenderSummary = {
        cashTotal,
        cardTotals,
        creditTotal,
        chequeTotal,
        totalDeclared,
        totalCalculated: reportData.summary?.totalSales || 0,
        fuelSales: reportData.summary?.fuelSales || 0,
        shopSales: reportData.summary?.shopSales || 0,
        variance: tenderVariance
      }

      const totalVariance = nozzleReports.reduce((sum, report) => sum + report.variance, 0) + tenderSummary.variance
      const totalSales = totalCalculated
      const variancePercentage = totalSales > 0 ? (totalVariance / totalSales) * 100 : 0

      let overallStatus: 'BALANCED' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE' = 'BALANCED'
      if (Math.abs(variancePercentage) > 1.0) {
        overallStatus = 'MAJOR_VARIANCE'
      } else if (Math.abs(variancePercentage) > 0.3) {
        overallStatus = 'MINOR_VARIANCE'
      }

      // Calculate efficiency score (100 - weighted variance impact)
      // 0.1% variance is acceptable (100 score). >1% variance starts dropping score fast.
      const varianceImpact = Math.min(100, Math.abs(variancePercentage) * 50)
      const efficiencyScore = Math.max(0, Math.round(100 - varianceImpact))

      const report: ShiftReport = {
        shift,
        nozzleReports,
        tenderSummary,
        shopAssignment: reportData.shopAssignment,
        totalVariance,
        variancePercentage,
        overallStatus,
        efficiencyScore
      }

      setShiftReport(report)

    } catch {
      setError('Failed to generate shift report')
    } finally {
      setLoading(false)
    }
  }

  const printShiftPDF = () => {
    if (!shiftReport || !selectedShift) {
      alert('Please select a shift and generate a report first')
      return
    }

    const stationName = shiftReport.shift.stationName || 'Station'

    const exportData = {
      nozzlePerformance: shiftReport.nozzleReports.map(nr => ({
        nozzleName: nr.nozzleName,
        pumperName: nr.pumperName,
        litresSold: nr.litersSold,
        amount: nr.salesAmount,
        variancePercentage: nr.variancePercentage
      })),
      totalSales: shiftReport.tenderSummary.fuelSales,
      shopSales: shiftReport.tenderSummary.shopSales,
      shopPerformance: shiftReport.shopAssignment?.items.map(item => ({
        productName: item.productName,
        soldQuantity: item.soldQuantity,
        revenue: item.revenue
      })),
      totalDeclared: shiftReport.tenderSummary.totalDeclared,
      variance: shiftReport.totalVariance,
      overallStatus: shiftReport.overallStatus
    }

    exportShiftReportPDF(exportData, stationName, selectedShift)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 0.3) return 'text-green-600 dark:text-green-400'
    if (Math.abs(percentage) <= 1.0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BALANCED': return 'bg-green-500/10 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
      case 'MINOR_VARIANCE': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800'
      case 'MAJOR_VARIANCE': return 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
      default: return 'bg-muted text-foreground'
    }
  }

  const nozzleColumns: Column<NozzleReport>[] = [
    {
      key: 'nozzleName' as keyof NozzleReport,
      title: 'Nozzle',
      render: (value: unknown, row: NozzleReport) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <Fuel className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground">{row.fuel?.name || 'Unknown'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'pumperName' as keyof NozzleReport,
      title: 'Pumper',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'startMeter' as keyof NozzleReport,
      title: 'Start',
      render: (value: unknown) => <span className="text-xs text-muted-foreground">{(value as number).toFixed(1)}</span>
    },
    {
      key: 'endMeter' as keyof NozzleReport,
      title: 'End',
      render: (value: unknown) => <span className="text-xs text-muted-foreground">{(value as number).toFixed(1)}</span>
    },
    {
      key: 'litersSold' as keyof NozzleReport,
      title: 'Volume',
      render: (value: unknown) => (
        <span className="font-medium">
          {(value as number).toFixed(1)} <span className="text-xs text-muted-foreground">L</span>
        </span>
      )
    },
    {
      key: 'salesAmount' as keyof NozzleReport,
      title: 'Revenue',
      render: (value: unknown) => (
        <span className="font-semibold tabular-nums">
          Rs. {(value as number).toLocaleString()}
        </span>
      )
    },
    {
      key: 'variance' as keyof NozzleReport,
      title: 'Variance',
      render: (value: unknown, row: NozzleReport) => {
        const numValue = typeof value === 'number' ? value : 0
        const isClean = Math.abs(row.variancePercentage) <= 0.1

        return (
          <div className="text-right">
            {isClean ? (
              <div className="flex items-center justify-end gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span className="text-xs font-medium">Balanced</span>
              </div>
            ) : (
              <>
                <div className={`font-semibold text-sm tabular-nums ${getVarianceColor(row.variancePercentage)}`}>
                  {numValue > 0 ? '+' : ''}{numValue.toLocaleString()}
                </div>
                <div className={`text-[10px] ${getVarianceColor(row.variancePercentage)}`}>
                  {row.variancePercentage > 0 ? '+' : ''}{row.variancePercentage.toFixed(2)}%
                </div>
              </>
            )}
          </div>
        )
      }
    }
  ]

  // Data for the radial chart
  const getEfficiencyColor = (score: number) => {
    if (score >= 95) return '#22c55e' // green-500
    if (score >= 80) return '#eab308' // yellow-500
    return '#ef4444' // red-500
  }

  const radialData = shiftReport ? [
    {
      name: 'Efficiency',
      uv: shiftReport.efficiencyScore,
      fill: getEfficiencyColor(shiftReport.efficiencyScore)
    }
  ] : []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Shift Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Detailed analysis of shift performance and reconciliation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadShifts} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!shiftReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={printShiftPDF} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4 text-red-600" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Selection & Key Metrics */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-none shadow-md bg-muted/40">
            <CardHeader>
              <CardTitle className="text-lg">Select Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {isAllStations && (
                  <div className="flex items-center p-3 text-amber-800 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-sm">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="font-medium">Select a specific station first.</span>
                  </div>
                )}
                <Label>Shift to Analyze</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift} disabled={loading || !selectedStation}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Latest Closed Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        <span className="font-medium">{new Date(shift.startTime).toLocaleDateString()}</span>
                        <span className="text-muted-foreground mx-2">-</span>
                        <span>{shift.templateName}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generateReport} className="w-full" disabled={loading || !selectedShift}>
                {loading ? 'Analyzing...' : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {shiftReport && (
            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground text-center">Efficiency Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-6 bg-background relative">
                <div className="h-48 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={15}
                      data={radialData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar
                        background
                        dataKey="uv"
                        cornerRadius={30} // rounded-full
                        label={false}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-bold">{shiftReport.efficiencyScore}</span>
                    <span className="text-xs text-muted-foreground uppercase">Score</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <Badge variant="outline" className={`${getStatusColor(shiftReport.overallStatus)}`}>
                    {shiftReport.overallStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Detailed Report */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!shiftReport && !loading && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
              <CheckCircle2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a shift to view detailed analysis</p>
              <p className="text-sm">Only closed shifts are available for reporting</p>
            </div>
          )}

          {shiftReport && (
            <>
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-32 w-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-100 flex items-center justify-between">
                      Total Declared Revenue
                      <Banknote className="h-4 w-4 text-indigo-200" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Rs. {shiftReport.tenderSummary.totalDeclared.toLocaleString()}</div>
                    <div className="text-xs text-indigo-100/80 mt-1">Cash + Card + Credit</div>
                  </CardContent>
                </Card>

                <Card className="border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Fuel Volume
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {shiftReport.nozzleReports.reduce((sum, r) => sum + r.litersSold, 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      <span className="text-sm font-normal text-muted-foreground ml-1">L</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Across {shiftReport.nozzleReports.filter(n => n.litersSold > 0).length} active nozzles
                    </div>
                  </CardContent>
                </Card>

                <Card className="border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Net Variance
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getVarianceColor(shiftReport.variancePercentage)}`}>
                      {shiftReport.totalVariance > 0 ? '+' : ''}Rs. {shiftReport.totalVariance.toLocaleString()}
                    </div>
                    <div className={`text-xs mt-1 ${getVarianceColor(shiftReport.variancePercentage)}`}>
                      {Math.abs(shiftReport.variancePercentage).toFixed(3)}% of revenue
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tender Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-green-600" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>Breakdown of collected payments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600">
                          <Banknote className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Cash</span>
                      </div>
                      <span className="font-bold">Rs. {shiftReport.tenderSummary.cashTotal.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Card</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">Rs. {Object.values(shiftReport.tenderSummary.cardTotals).reduce((a, b) => a + b, 0).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{Object.keys(shiftReport.tenderSummary.cardTotals).length} Terminals</div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2 border-t text-sm text-muted-foreground">
                      <span>Credit Sales</span>
                      <span>Rs. {shiftReport.tenderSummary.creditTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Cheques/Returns</span>
                      <span>Rs. {shiftReport.tenderSummary.chequeTotal.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-orange-600" />
                      Shop Performance
                    </CardTitle>
                    <CardDescription>
                      {shiftReport.shopAssignment ? `Managed by ${shiftReport.shopAssignment.pumperName}` : 'No shop data'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shiftReport.shopAssignment ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total Revenue</span>
                          <span className="text-xl font-bold font-mono">Rs. {shiftReport.shopAssignment.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="h-[1px] bg-border w-full my-2"></div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                          {shiftReport.shopAssignment.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.productName} <span className="text-xs text-muted-foreground">x{item.soldQuantity}</span></span>
                              <span className="font-medium">Rs. {item.revenue.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
                        <p>No shop assignment active</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Nozzle Table */}
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Fuel Sales Breakdown</CardTitle>
                    <CardDescription>Per-nozzle performance & variance analysis</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={shiftReport.nozzleReports}
                    columns={nozzleColumns}
                    searchPlaceholder="Filter by pumper or nozzle..."
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
