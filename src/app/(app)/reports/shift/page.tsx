'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
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
  const { selectedStation: contextSelectedStation, isAllStations, getSelectedStation } = useStation()
  const [stations, setStations] = useState<Station[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
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
    if (!isAllStations && contextSelectedStation) {
      loadShifts()
    } else {
      setShifts([])
      setSelectedShift('')
    }
  }, [contextSelectedStation, isAllStations])

  const loadShifts = async () => {
    try {
      const response = await fetch(`/api/shifts?stationId=${contextSelectedStation}&status=CLOSED&limit=10`)
      const shiftsData = await response.json()
      setShifts(shiftsData)
    } catch (err) {
      setError('Failed to load shifts')
    }
  }

  const generateReport = async () => {
    if (isAllStations) {
      setError('Please select a specific station to generate shift report')
      return
    }
    
    if (!selectedShift) {
      setError('Please select a shift')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call the API endpoint
      // For now, we'll generate mock shift report data
      
      const shift = shifts.find(s => s.id === selectedShift)
      if (!shift) {
        throw new Error('Shift not found')
      }

      // Generate mock nozzle reports
      const nozzleReports: NozzleReport[] = [
        {
          nozzleId: '1',
          nozzleName: 'Nozzle 1',
          fuelType: 'Petrol 95',
          pumperName: 'John Silva',
          startMeter: 12450.5,
          endMeter: 13125.8,
          litersSold: 675.3,
          salesAmount: 202590,
          pricePerLiter: 300,
          variance: -150,
          variancePercentage: -0.074,
          status: 'BALANCED'
        },
        {
          nozzleId: '2',
          nozzleName: 'Nozzle 2',
          fuelType: 'Petrol 95',
          pumperName: 'Mary Fernando',
          startMeter: 8920.2,
          endMeter: 9580.7,
          litersSold: 660.5,
          salesAmount: 198150,
          pricePerLiter: 300,
          variance: 300,
          variancePercentage: 0.151,
          status: 'BALANCED'
        },
        {
          nozzleId: '3',
          nozzleName: 'Nozzle 3',
          fuelType: 'Diesel',
          pumperName: 'David Perera',
          startMeter: 15680.0,
          endMeter: 16890.5,
          litersSold: 1210.5,
          salesAmount: 327135,
          pricePerLiter: 270,
          variance: -850,
          variancePercentage: -0.260,
          status: 'BALANCED'
        },
        {
          nozzleId: '4',
          nozzleName: 'Nozzle 4',
          fuelType: 'Diesel',
          pumperName: 'Sarah Jayawardena',
          startMeter: 11250.8,
          endMeter: 12180.3,
          litersSold: 929.5,
          salesAmount: 250965,
          pricePerLiter: 270,
          variance: 1200,
          variancePercentage: 0.478,
          status: 'MINOR_VARIANCE'
        }
      ]

      // Generate mock tender summary
      const tenderSummary: TenderSummary = {
        cashTotal: 450000,
        cardTotals: {
          'Bank of Ceylon': 125000,
          'Commercial Bank': 98000,
          'Sampath Bank': 67000,
          'Peoples Bank': 45000
        },
        creditTotal: 85000,
        chequeTotal: 25000,
        totalDeclared: 895000,
        totalCalculated: 894500,
        variance: 500
      }

      const totalVariance = nozzleReports.reduce((sum, report) => sum + report.variance, 0) + tenderSummary.variance
      const totalSales = nozzleReports.reduce((sum, report) => sum + report.salesAmount, 0)
      const variancePercentage = (totalVariance / totalSales) * 100

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
    
    const station = getSelectedStation()
    const stationName = station?.name || 'Unknown Station'
    
    exportShiftReportPDF(shiftReport, stationName, selectedShift)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 0.3) return 'text-green-600'
    if (Math.abs(percentage) <= 1.0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BALANCED': return 'bg-green-100 text-green-800'
      case 'MINOR_VARIANCE': return 'bg-yellow-100 text-yellow-800'
      case 'MAJOR_VARIANCE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const nozzleColumns: Column<NozzleReport>[] = [
    {
      key: 'nozzleName' as keyof NozzleReport,
      title: 'Nozzle',
      render: (value: unknown, row: NozzleReport) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-xs text-gray-500">{row.fuelType}</div>
          </div>
        </div>
      )
    },
    {
      key: 'pumperName' as keyof NozzleReport,
      title: 'Pumper',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'startMeter' as keyof NozzleReport,
      title: 'Start Meter',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{(value as number)?.toFixed(1) || 0}</span>
      )
    },
    {
      key: 'endMeter' as keyof NozzleReport,
      title: 'End Meter',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{(value as number)?.toFixed(1) || 0}</span>
      )
    },
    {
      key: 'litersSold' as keyof NozzleReport,
      title: 'Litres Sold',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-blue-600">
          {(value as number)?.toFixed(1) || 0}L
        </span>
      )
    },
    {
      key: 'salesAmount' as keyof NozzleReport,
      title: 'Sales Amount',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-green-600">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'variance' as keyof NozzleReport,
      title: 'Variance',
      render: (value: unknown, row: NozzleReport) => (
        <div className="text-center">
          <div className={`font-mono font-semibold ${getVarianceColor(row.variancePercentage)}`}>
            {(value as number) >= 0 ? '+' : ''}Rs. {(value as number)?.toLocaleString() || 0}
          </div>
          <div className={`text-xs ${getVarianceColor(row.variancePercentage)}`}>
            {row.variancePercentage >= 0 ? '+' : ''}{row.variancePercentage.toFixed(3)}%
          </div>
        </div>
      )
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
      <h1 className="text-3xl font-bold text-gray-900">Shift Reports</h1>

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
            <Label>Current Station</Label>
            <div className="px-3 py-2 border rounded-md bg-gray-50 text-sm">
              {isAllStations ? 'All Stations (Select specific station)' : (getSelectedStation()?.name || 'No station selected')}
            </div>
          </div>

          <div>
            <Label htmlFor="shift">Shift</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift} disabled={loading || isAllStations}>
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
                        <div className="text-xs text-gray-500">
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
            <Button onClick={generateReport} disabled={loading || isAllStations || !selectedShift}>
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
                  <div className="text-sm text-gray-600">
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
                  <div className="text-sm text-gray-600">Start Time</div>
                  <div className="font-medium">
                    {new Date(shiftReport.shift.startTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">End Time</div>
                  <div className="font-medium">
                    {new Date(shiftReport.shift.endTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Duration</div>
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
                <CardTitle className="text-sm font-medium text-blue-600">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  Rs. {shiftReport.nozzleReports.reduce((sum, report) => sum + report.salesAmount, 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {shiftReport.nozzleReports.reduce((sum, report) => sum + report.litersSold, 0).toFixed(1)}L total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Declared Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {shiftReport.tenderSummary.totalDeclared.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  All payment methods
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600">Total Variance</CardTitle>
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
                <CardTitle className="text-sm font-medium text-gray-600">Nozzles Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">
                  {shiftReport.nozzleReports.length}
                </div>
                <div className="text-xs text-gray-500">
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
                  <div className="font-semibold text-gray-700">Cash Payments</div>
                  <div className="flex justify-between">
                    <span>Cash Total:</span>
                    <span className="font-mono font-semibold">Rs. {shiftReport.tenderSummary.cashTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-semibold text-gray-700">Card Payments</div>
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
                  <div className="font-semibold text-gray-700">Other Payments</div>
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
                    <div className="text-sm text-gray-600">Total Declared</div>
                    <div className="text-xl font-bold text-blue-600">
                      Rs. {shiftReport.tenderSummary.totalDeclared.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Calculated</div>
                    <div className="text-xl font-bold text-green-600">
                      Rs. {shiftReport.tenderSummary.totalCalculated.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Tender Variance</div>
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
