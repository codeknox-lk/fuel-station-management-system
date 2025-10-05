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
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  AlertCircle, 
  Download,
  FileText,
  Fuel,
  Building,
  CreditCard,
  Banknote,
  Calculator,
  ExternalLink
} from 'lucide-react'
import { exportDailyReportPDF, exportDailyReportExcel } from '@/lib/exportUtils'

interface Station {
  id: string
  name: string
  city: string
}

interface DailyReport {
  date: string
  stationId: string
  stationName: string
  
  // Sales breakdown
  petrolSales: number
  dieselSales: number
  totalFuelSales: number
  oilSales: number
  canSales: number
  totalSales: number
  
  // Financial summary
  totalExpenses: number
  totalDeposits: number
  totalLoans: number
  netProfit: number
  
  // Variance and exceptions
  totalVariance: number
  variancePercentage: number
  missingSlips: MissingSlip[]
  
  // Additional metrics
  transactionCount: number
  averageTransaction: number
  cashPercentage: number
  cardPercentage: number
}

interface MissingSlip {
  id: string
  batchId: string
  terminalName: string
  amount: number
  time: string
  lastFourDigits: string
  reportedBy: string
  status: 'PENDING' | 'RESOLVED' | 'WRITTEN_OFF'
}

export default function DailyReportsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

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
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call the API endpoint
      // For now, we'll generate mock daily report data
      
      const station = stations.find(s => s.id === selectedStation)
      
      // Generate mock daily report
      const petrolSales = Math.floor(Math.random() * 150000) + 80000
      const dieselSales = Math.floor(Math.random() * 200000) + 120000
      const oilSales = Math.floor(Math.random() * 15000) + 5000
      const canSales = Math.floor(Math.random() * 8000) + 2000
      const totalFuelSales = petrolSales + dieselSales
      const totalSales = totalFuelSales + oilSales + canSales
      
      const totalExpenses = Math.floor(Math.random() * 25000) + 10000
      const totalDeposits = Math.floor(Math.random() * 80000) + 40000
      const totalLoans = Math.floor(Math.random() * 20000)
      const netProfit = totalSales - totalExpenses - totalDeposits + totalLoans
      
      const totalVariance = Math.floor(Math.random() * 2000 - 1000)
      const variancePercentage = (totalVariance / totalSales) * 100
      
      const transactionCount = Math.floor(Math.random() * 200) + 150
      const averageTransaction = totalSales / transactionCount
      const cashPercentage = Math.floor(Math.random() * 40) + 45
      const cardPercentage = 100 - cashPercentage

      // Mock missing slips
      const missingSlips: MissingSlip[] = [
        {
          id: '1',
          batchId: 'BATCH-001',
          terminalName: 'POS Terminal 1',
          amount: 2500,
          time: '14:30',
          lastFourDigits: '1234',
          reportedBy: 'Manager',
          status: 'PENDING'
        },
        {
          id: '2',
          batchId: 'BATCH-003',
          terminalName: 'POS Terminal 2',
          amount: 1800,
          time: '16:45',
          lastFourDigits: '5678',
          reportedBy: 'Cashier',
          status: 'RESOLVED'
        }
      ]

      const report: DailyReport = {
        date: selectedDate,
        stationId: selectedStation,
        stationName: station?.name || 'Unknown Station',
        petrolSales,
        dieselSales,
        totalFuelSales,
        oilSales,
        canSales,
        totalSales,
        totalExpenses,
        totalDeposits,
        totalLoans,
        netProfit,
        totalVariance,
        variancePercentage,
        missingSlips,
        transactionCount,
        averageTransaction,
        cashPercentage,
        cardPercentage
      }

      setDailyReport(report)

    } catch (err) {
      setError('Failed to generate daily report')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    if (!dailyReport || !selectedStation) {
      alert('Please select a station and generate a report first')
      return
    }
    
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const dateStr = selectedDate.toISOString().split('T')[0]
    
    exportDailyReportPDF(dailyReport, stationName, dateStr)
  }

  const exportToExcel = () => {
    if (!dailyReport || !selectedStation) {
      alert('Please select a station and generate a report first')
      return
    }
    
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const dateStr = selectedDate.toISOString().split('T')[0]
    
    exportDailyReportExcel(dailyReport, stationName, dateStr)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 0.5) return 'text-green-600'
    if (Math.abs(percentage) <= 1.0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'WRITTEN_OFF': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const missingSlipColumns: Column<MissingSlip>[] = [
    {
      key: 'time' as keyof MissingSlip,
      title: 'Time',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as string}</span>
      )
    },
    {
      key: 'terminalName' as keyof MissingSlip,
      title: 'Terminal',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'amount' as keyof MissingSlip,
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-600">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'lastFourDigits' as keyof MissingSlip,
      title: 'Card Digits',
      render: (value: unknown) => (
        <span className="font-mono text-sm">****{value as string}</span>
      )
    },
    {
      key: 'reportedBy' as keyof MissingSlip,
      title: 'Reported By',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof MissingSlip,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Daily Reports</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Daily Report">
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
            <Label htmlFor="date">Date</Label>
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
            <Button onClick={generateReport} disabled={loading || !selectedStation || !selectedDate}>
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

      {dailyReport && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Daily Report - {dailyReport.stationName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(dailyReport.date).toLocaleDateString()}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Sales Split Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Petrol Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  Rs. {dailyReport.petrolSales.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((dailyReport.petrolSales / dailyReport.totalSales) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Diesel Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {dailyReport.dieselSales.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((dailyReport.dieselSales / dailyReport.totalSales) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Oil & Can Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">
                  Rs. {(dailyReport.oilSales + dailyReport.canSales).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {(((dailyReport.oilSales + dailyReport.canSales) / dailyReport.totalSales) * 100).toFixed(1)}% of total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">
                  Rs. {dailyReport.totalSales.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {dailyReport.transactionCount} transactions
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  Rs. {dailyReport.totalExpenses.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((dailyReport.totalExpenses / dailyReport.totalSales) * 100).toFixed(1)}% of sales
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Bank Deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  Rs. {dailyReport.totalDeposits.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((dailyReport.totalDeposits / dailyReport.totalSales) * 100).toFixed(1)}% of sales
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Loans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {dailyReport.totalLoans.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  External & pumper loans
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dailyReport.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Rs. {dailyReport.netProfit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {((dailyReport.netProfit / dailyReport.totalSales) * 100).toFixed(1)}% margin
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Cash Payments</div>
                  <div className="text-2xl font-bold text-green-600">
                    {dailyReport.cashPercentage}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Rs. {((dailyReport.totalSales * dailyReport.cashPercentage) / 100).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Card Payments</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dailyReport.cardPercentage}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Rs. {((dailyReport.totalSales * dailyReport.cardPercentage) / 100).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Average Transaction</div>
                  <div className="text-2xl font-bold text-purple-600">
                    Rs. {dailyReport.averageTransaction.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {dailyReport.transactionCount} total transactions
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Variance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Total Variance</div>
                  <div className={`text-3xl font-bold ${getVarianceColor(dailyReport.variancePercentage)}`}>
                    {dailyReport.totalVariance >= 0 ? '+' : ''}Rs. {dailyReport.totalVariance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    {dailyReport.variancePercentage >= 0 ? '+' : ''}{dailyReport.variancePercentage.toFixed(2)}% of total sales
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Variance Status</div>
                  <div className="text-2xl font-bold">
                    {Math.abs(dailyReport.variancePercentage) <= 0.5 ? (
                      <Badge className="bg-green-100 text-green-800 text-lg py-2 px-4">
                        Within Tolerance
                      </Badge>
                    ) : Math.abs(dailyReport.variancePercentage) <= 1.0 ? (
                      <Badge className="bg-yellow-100 text-yellow-800 text-lg py-2 px-4">
                        Needs Review
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 text-lg py-2 px-4">
                        Requires Action
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Slip Exceptions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Missing Slip Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyReport.missingSlips.length > 0 ? (
                <DataTable
                  data={dailyReport.missingSlips}
                  columns={missingSlipColumns}
                  searchPlaceholder="Search missing slips..."
                  pagination={false}
                  emptyMessage="No missing slips reported."
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No missing slips reported for this date.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={exportToPDF} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Email Report
                </Button>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Alert */}
          {Math.abs(dailyReport.variancePercentage) > 1.0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Variance Detected</AlertTitle>
              <AlertDescription>
                Daily variance of {dailyReport.variancePercentage.toFixed(2)}% exceeds acceptable limits. 
                Please review transactions and investigate discrepancies.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
