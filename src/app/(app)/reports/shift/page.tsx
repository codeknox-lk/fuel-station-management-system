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
  Building2, 
  DollarSign, 
  Clock, 
  User,
  Fuel,
  AlertCircle, 
  FileText,
  Printer,
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react'
import { exportShiftReportPDF } from '@/lib/exportUtils'

interface Station {
  id: string
  name: string
  city: string
}

interface Shift {
  id: string
  stationId: string
  stationName: string
  templateName: string
  startTime: string
  endTime: string
  status: 'ACTIVE' | 'CLOSED'
}

interface ShiftReport {
  shift: Shift
  nozzleReports: NozzleReport[]
  tenderSummary: TenderSummary
  totalVariance: number
  variancePercentage: number
  overallStatus: 'BALANCED' | 'MINOR_VARIANCE' | 'MAJOR_VARIANCE'
}

interface NozzleReport {
  nozzleId: string
  nozzleName: string
  fuelType: string
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
  variance: number
}

export default function ShiftReportsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [selectedShift, setSelectedShift] = useState('')

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

  // Load shifts when station changes
  useEffect(() => {
    if (selectedStation) {
      loadShifts()
    } else {
      setShifts([])
      setSelectedShift('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation])

  const loadShifts = async () => {
    try {
      const response = await fetch(`/api/shifts?stationId=${selectedStation}&status=CLOSED&limit=10`)
      if (!response.ok) {
        throw new Error('Failed to fetch shifts')
      }
      const data = await response.json()
      // API returns { shifts: [], pagination: {}, summary: {} }
      const shiftsArray = Array.isArray(data) ? data : (data.shifts || [])
      
      // Transform API response to match expected interface
      const transformedShifts: Shift[] = shiftsArray.map((shift: any) => ({
        id: shift.id,
        stationId: shift.stationId,
        stationName: shift.station?.name || 'Unknown Station',
        templateName: shift.template?.name || 'Unknown Template',
        startTime: shift.startTime,
        endTime: shift.endTime || shift.startTime, // Use startTime as fallback if endTime is null
        status: shift.status
      }))
      
      setShifts(transformedShifts)
    } catch (err) {
      console.error('Error loading shifts:', err)
      setError('Failed to load shifts')
      setShifts([])
    }
  }

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
      const nozzleReports: NozzleReport[] = (reportData.assignments || []).map((assignment: any): NozzleReport => {
        const declared = (shift.declaredAmounts as any)?.pumperBreakdown || []
        const pumperBreakdown = declared.find((b: any) => b.pumperName === assignment.pumperName)
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
          fuelType: assignment.fuelType || 'UNKNOWN',
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
      const declaredAmounts = shift.declaredAmounts as any || {}
      const cashTotal = declaredAmounts.cash || 0
      const cardTotal = declaredAmounts.card || 0
      const creditTotal = declaredAmounts.credit || 0
      const chequeTotal = declaredAmounts.cheque || 0
      
      // Get POS batches for card breakdown
      const posBatchesResponse = await fetch(`/api/pos/batches?shiftId=${selectedShift}`).catch(() => null)
      let cardTotals: Record<string, number> = {}
      if (posBatchesResponse && posBatchesResponse.ok) {
        const batches = await posBatchesResponse.json()
        for (const batch of batches) {
          if (batch.terminalEntries) {
            for (const entry of batch.terminalEntries) {
              const bankName = entry.terminal?.bank?.name || 'Unknown Bank'
              const amount = (entry.visaAmount || 0) + (entry.masterAmount || 0) + (entry.amexAmount || 0) + (entry.qrAmount || 0)
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
        totalCalculated,
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

      const report: ShiftReport = {
        shift,
        nozzleReports,
        tenderSummary,
        totalVariance,
        variancePercentage,
        overallStatus
      }

      setShiftReport(report)

    } catch (err) {
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
    
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    
    exportShiftReportPDF(shiftReport, stationName, selectedShift)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 0.3) return 'text-green-600 dark:text-green-400'
    if (Math.abs(percentage) <= 1.0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BALANCED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'MINOR_VARIANCE': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'MAJOR_VARIANCE': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const nozzleColumns: Column<NozzleReport>[] = [
    {
      key: 'nozzleName' as keyof NozzleReport,
      title: 'Nozzle',
      render: (value: unknown, row: NozzleReport) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-muted-foreground">{row.fuelType}</div>
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
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'startMeter' as keyof NozzleReport,
      title: 'Start Meter',
      render: (value: unknown) => {
        const numValue = typeof value === 'number' ? value : 0
        return <span className="font-mono text-sm">{numValue.toFixed(1)}</span>
      }
    },
    {
      key: 'endMeter' as keyof NozzleReport,
      title: 'End Meter',
      render: (value: unknown) => {
        const numValue = typeof value === 'number' ? value : 0
        return <span className="font-mono text-sm">{numValue.toFixed(1)}</span>
      }
    },
    {
      key: 'litersSold' as keyof NozzleReport,
      title: 'Litres Sold',
      render: (value: unknown) => {
        const numValue = typeof value === 'number' ? value : 0
        return (
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {numValue.toFixed(1)}L
          </span>
        )
      }
    },
    {
      key: 'salesAmount' as keyof NozzleReport,
      title: 'Sales Amount',
      render: (value: unknown) => {
        const numValue = typeof value === 'number' ? value : 0
        return (
          <span className="font-mono font-semibold text-green-600 dark:text-green-400">
            Rs. {numValue.toLocaleString()}
          </span>
        )
      }
    },
    {
      key: 'variance' as keyof NozzleReport,
      title: 'Variance',
      render: (value: unknown, row: NozzleReport) => {
        const numValue = typeof value === 'number' ? value : 0
        return (
          <div className="text-center">
            <div className={`font-mono font-semibold ${getVarianceColor(row.variancePercentage)}`}>
              {numValue >= 0 ? '+' : ''}Rs. {numValue.toLocaleString()}
            </div>
            <div className={`text-xs ${getVarianceColor(row.variancePercentage)}`}>
              {row.variancePercentage >= 0 ? '+' : ''}{row.variancePercentage.toFixed(3)}%
            </div>
          </div>
        )
      }
    },
    {
      key: 'status' as keyof NozzleReport,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {(value as string)?.replace('_', ' ') || 'Unknown'}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Shift Reports</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Shift Report">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label htmlFor="shift">Shift</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift} disabled={loading || !selectedStation}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <div>{shift.templateName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(shift.startTime).toLocaleDateString()} - {new Date(shift.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={generateReport} disabled={loading || !selectedShift}>
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

      {shiftReport && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Shift Report - {shiftReport.shift.stationName}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {shiftReport.shift.templateName}
                  </div>
                  <Badge className={getStatusColor(shiftReport.overallStatus)}>
                    {shiftReport.overallStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Start Time</div>
                  <div className="font-medium">
                    {new Date(shiftReport.shift.startTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">End Time</div>
                  <div className="font-medium">
                    {new Date(shiftReport.shift.endTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-medium">
                    {Math.round((new Date(shiftReport.shift.endTime).getTime() - new Date(shiftReport.shift.startTime).getTime()) / (1000 * 60 * 60))} hours
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  Rs. {shiftReport.nozzleReports.reduce((sum, report) => sum + report.salesAmount, 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {shiftReport.nozzleReports.reduce((sum, report) => sum + report.litersSold, 0).toFixed(1)}L total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Declared Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {shiftReport.tenderSummary.totalDeclared.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  All payment methods
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getVarianceColor(shiftReport.variancePercentage)}`}>
                  {shiftReport.totalVariance >= 0 ? '+' : ''}Rs. {shiftReport.totalVariance.toLocaleString()}
                </div>
                <div className={`text-xs ${getVarianceColor(shiftReport.variancePercentage)}`}>
                  {shiftReport.variancePercentage >= 0 ? '+' : ''}{shiftReport.variancePercentage.toFixed(3)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Nozzles Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {shiftReport.nozzleReports.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {shiftReport.nozzleReports.filter(r => r.status === 'BALANCED').length} balanced
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Nozzle/Pumper Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Per-Nozzle/Pumper Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={shiftReport.nozzleReports}
                columns={nozzleColumns}
                searchPlaceholder="Search nozzles..."
                pagination={false}
                emptyMessage="No nozzle data available."
              />
            </CardContent>
          </Card>

          {/* Tender Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tender Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="font-semibold text-foreground">Cash Payments</div>
                  <div className="flex justify-between">
                    <span>Cash Total:</span>
                    <span className="font-mono font-semibold">Rs. {shiftReport.tenderSummary.cashTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-semibold text-foreground">Card Payments</div>
                  {Object.entries(shiftReport.tenderSummary.cardTotals).map(([bank, amount]) => (
                    <div key={bank} className="flex justify-between">
                      <span>{bank}:</span>
                      <span className="font-mono font-semibold">Rs. {amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Card Total:</span>
                    <span className="font-mono font-semibold">
                      Rs. {Object.values(shiftReport.tenderSummary.cardTotals).reduce((sum, amount) => sum + amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-semibold text-foreground">Other Payments</div>
                  <div className="flex justify-between">
                    <span>Credit:</span>
                    <span className="font-mono font-semibold">Rs. {shiftReport.tenderSummary.creditTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cheques:</span>
                    <span className="font-mono font-semibold">Rs. {shiftReport.tenderSummary.chequeTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Declared</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      Rs. {shiftReport.tenderSummary.totalDeclared.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total Calculated</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      Rs. {shiftReport.tenderSummary.totalCalculated.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Tender Variance</div>
                    <div className={`text-xl font-bold ${getVarianceColor((shiftReport.tenderSummary.variance / shiftReport.tenderSummary.totalDeclared) * 100)}`}>
                      {shiftReport.tenderSummary.variance >= 0 ? '+' : ''}Rs. {shiftReport.tenderSummary.variance.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Print Action */}
          <Card>
            <CardHeader>
              <CardTitle>Export & Print</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={printShiftPDF}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Shift PDF
                </Button>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variance Alert */}
          {shiftReport.overallStatus === 'MAJOR_VARIANCE' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Major Variance Detected</AlertTitle>
              <AlertDescription>
                This shift has a variance of {shiftReport.variancePercentage.toFixed(3)}% which exceeds acceptable limits. 
                Please review all transactions and investigate discrepancies before finalizing.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
