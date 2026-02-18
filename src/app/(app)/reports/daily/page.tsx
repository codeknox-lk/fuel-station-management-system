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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Download,
  FileText,
  Fuel,
  CreditCard,
  Banknote,
  Calculator,
  Users,
  Receipt,
  Clock,
  BarChart3,
  PieChart,
  Wallet,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  ShoppingBag
} from 'lucide-react'
import { exportDailyReportPDF, exportDailyReportExcel, DailyReportData } from '@/lib/exportUtils'
import { PrintHeader } from '@/components/PrintHeader'

interface Station {
  id: string
  name: string
  city: string
}

interface POSTerminalBreakdown {
  terminalId: string
  terminalName: string
  terminalNumber: string
  bankName?: string
  totalAmount: number
  transactionCount: number
  visaAmount: number
  mastercardAmount: number
  amexAmount: number
  qrAmount: number
  dialogTouchAmount: number
  missingSlips: number
  missingSlipAmount: number
}

interface CreditCustomerBreakdown {
  customerId: string
  customerName: string
  totalSales: number
  transactionCount: number
  averageTransaction: number
  creditLimit: number
  currentBalance: number
  paymentReceived: number
}

interface ChequeBreakdown {
  chequeId: string
  chequeNumber: string
  amount: number
  receivedFrom: string
  bankName: string
  bankBranch?: string
  receivedDate: string
  status: 'PENDING' | 'CLEARED' | 'BOUNCED'
}

interface DailyReport {
  date: string
  stationId: string
  stationName: string

  // Sales breakdown by fuel type
  petrolSales: number
  dieselSales: number
  superDieselSales: number
  oilSales: number
  shopSales: number
  totalFuelSales: number
  totalSales: number
  shopSalesBreakdown?: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
  }>

  // Tender breakdown
  cashAmount: number
  cardAmount: number
  creditAmount: number
  chequeAmount: number

  // POS Terminal breakdown
  posTerminals: POSTerminalBreakdown[]
  totalPOSAmount: number

  // Credit customer breakdown
  creditCustomers: CreditCustomerBreakdown[]
  totalCreditSales: number

  // Cheque breakdown
  cheques: ChequeBreakdown[]
  totalChequeAmount: number

  // Financial summary
  totalExpenses: number
  totalDeposits: number
  totalLoans: number
  netProfit: number

  // Variance and exceptions
  totalVariance: number
  variancePercentage: number
  missingSlips: Array<{
    id: string
    terminalName: string
    amount: number
    time: string
    lastFourDigits: string
    reportedBy: string
    status: 'PENDING' | 'RESOLVED' | 'WRITTEN_OFF'
  }>

  // Additional metrics
  shiftCount: number
  transactionCount: number
  averageTransaction: number
  cashPercentage: number
  cardPercentage: number
  creditPercentage: number
  chequePercentage: number
}

export default function DailyReportsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
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
      } catch {
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
      // Call the API to get real daily report data
      const url = `/api/reports/daily-comprehensive?stationId=${selectedStation}&date=${selectedDate}`
      console.log('[Frontend] Fetching daily report from:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      console.log('[Frontend] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData: Record<string, unknown> = {}
        try {
          const text = await response.text()
          if (text) {
            try {
              errorData = JSON.parse(text)
            } catch {
              errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: text }
            }
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: 'Empty response body' }
          }
        } catch (jsonError) {
          console.error('[Frontend] Error parsing error response:', jsonError)
          errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: 'Failed to parse error response' }
        }
        console.error('[Frontend] API error response:', errorData)
        interface ErrorResponse {
          message?: string
          error?: string
          details?: string | Record<string, unknown>
        }
        const errorMessage = (errorData as ErrorResponse).message || (errorData as ErrorResponse).error || (typeof (errorData as ErrorResponse).details === 'string' ? (errorData as ErrorResponse).details : JSON.stringify((errorData as ErrorResponse).details)) || 'Unknown error'
        throw new Error(`Failed to fetch daily report: ${response.status} ${response.statusText}. ${errorMessage}`)
      }

      const reportData = await response.json()
      console.log('[Frontend] Daily report data received, fields:', Object.keys(reportData))
      console.log('[Frontend] Daily report summary:', {
        stationName: reportData.stationName,
        date: reportData.date,
        totalSales: reportData.totalSales,
        shiftCount: reportData.shiftCount,
        transactionCount: reportData.transactionCount,
        petrolSales: reportData.petrolSales,
        dieselSales: reportData.dieselSales,
        cashAmount: reportData.cashAmount,
        cardAmount: reportData.cardAmount,
        totalExpenses: reportData.totalExpenses
      })
      console.log('[Frontend] Full report data:', reportData)

      // Validate required fields and transform if needed
      if (!reportData || typeof reportData !== 'object') {
        throw new Error('Invalid response format from API')
      }

      // Use API response directly (it matches the interface)
      setDailyReport(reportData as DailyReport)

    } catch (err) {
      console.error('Error fetching daily report:', err)
      setError('Failed to generate daily report: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
    const dateStr = selectedDate

    const exportData: DailyReportData = {
      salesBreakdown: {
        petrol92: { litres: 0, amount: dailyReport.petrolSales },
        petrol95: { litres: 0, amount: 0 },
        diesel: { litres: 0, amount: dailyReport.dieselSales },
        superDiesel: { litres: 0, amount: dailyReport.superDieselSales },
      },
      totalSales: dailyReport.totalSales,
      totalExpenses: dailyReport.totalExpenses,
      netProfit: dailyReport.netProfit,
      variancePercentage: dailyReport.variancePercentage,
      shopSales: dailyReport.shopSales
    }

    exportDailyReportPDF(exportData, stationName, dateStr)
  }

  const exportToExcel = () => {
    if (!dailyReport || !selectedStation) {
      alert('Please select a station and generate a report first')
      return
    }

    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const dateStr = selectedDate

    const exportData: DailyReportData = {
      salesBreakdown: {
        petrol92: { litres: 0, amount: dailyReport.petrolSales },
        petrol95: { litres: 0, amount: 0 },
        diesel: { litres: 0, amount: dailyReport.dieselSales },
        superDiesel: { litres: 0, amount: dailyReport.superDieselSales },
      },
      totalSales: dailyReport.totalSales,
      totalExpenses: dailyReport.totalExpenses,
      netProfit: dailyReport.netProfit,
      variancePercentage: dailyReport.variancePercentage
    }

    exportDailyReportExcel(exportData, stationName, dateStr)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 0.5) return 'text-green-600 dark:text-green-400'
    if (Math.abs(percentage) <= 1.0) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'WRITTEN_OFF': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      case 'CLEARED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'BOUNCED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  // POS Terminal columns
  const posTerminalColumns: Column<POSTerminalBreakdown>[] = [
    {
      key: 'terminalName' as keyof POSTerminalBreakdown,
      title: 'Terminal',
      render: (value: unknown, row: POSTerminalBreakdown) => (
        <div>
          <div className="font-medium">{value as string}</div>
          <div className="text-xs text-muted-foreground">
            {row.terminalNumber} {row.bankName && `• ${row.bankName}`}
          </div>
        </div>
      )
    },
    {
      key: 'transactionCount' as keyof POSTerminalBreakdown,
      title: 'Transactions',
      render: (value: unknown) => (
        <Badge variant="outline">{value as number}</Badge>
      )
    },
    {
      key: 'visaAmount' as keyof POSTerminalBreakdown,
      title: 'Visa',
      render: (value: unknown) => (
        <span className="text-sm text-orange-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'mastercardAmount' as keyof POSTerminalBreakdown,
      title: 'Mastercard',
      render: (value: unknown) => (
        <span className="text-sm text-red-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'amexAmount' as keyof POSTerminalBreakdown,
      title: 'Amex',
      render: (value: unknown) => (
        <span className="text-sm text-green-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'qrAmount' as keyof POSTerminalBreakdown,
      title: 'QR',
      render: (value: unknown) => (
        <span className="text-sm text-orange-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'dialogTouchAmount' as keyof POSTerminalBreakdown,
      title: 'Dialog Touch',
      render: (value: unknown) => (
        <span className="text-sm text-orange-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'totalAmount' as keyof POSTerminalBreakdown,
      title: 'Total',
      render: (value: unknown) => (
        <span className="font-bold">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'missingSlips' as keyof POSTerminalBreakdown,
      title: 'Missing Slips',
      render: (value: unknown, row: POSTerminalBreakdown) => (
        <div>
          {row.missingSlips > 0 ? (
            <Badge variant="destructive">
              {row.missingSlips} slip{row.missingSlips > 1 ? 's' : ''}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">None</Badge>
          )}
        </div>
      )
    }
  ]

  // Credit Customer columns
  const creditCustomerColumns: Column<CreditCustomerBreakdown>[] = [
    {
      key: 'customerName' as keyof CreditCustomerBreakdown,
      title: 'Customer',
      render: (value: unknown) => (
        <div className="font-medium">{value as string}</div>
      )
    },
    {
      key: 'transactionCount' as keyof CreditCustomerBreakdown,
      title: 'Transactions',
      render: (value: unknown) => (
        <Badge variant="outline">{value as number}</Badge>
      )
    },
    {
      key: 'totalSales' as keyof CreditCustomerBreakdown,
      title: 'Total Sales',
      render: (value: unknown) => (
        <span className="font-semibold text-green-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'averageTransaction' as keyof CreditCustomerBreakdown,
      title: 'Avg Transaction',
      render: (value: unknown) => (
        <span className="text-sm">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'creditLimit' as keyof CreditCustomerBreakdown,
      title: 'Credit Limit',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'currentBalance' as keyof CreditCustomerBreakdown,
      title: 'Current Balance',
      render: (value: unknown, row: CreditCustomerBreakdown) => {
        const usagePercent = (row.currentBalance / row.creditLimit) * 100
        return (
          <div>
            <span className="font-semibold">
              Rs. {(value as number || (0) || 0).toLocaleString()}
            </span>
            <div className="text-xs text-muted-foreground">
              {usagePercent.toFixed(1)}% used
            </div>
          </div>
        )
      }
    },
    {
      key: 'paymentReceived' as keyof CreditCustomerBreakdown,
      title: 'Payment Received',
      render: (value: unknown) => (
        <span className="font-semibold text-orange-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    }
  ]

  // Cheque columns
  const chequeColumns: Column<ChequeBreakdown>[] = [
    {
      key: 'chequeNumber' as keyof ChequeBreakdown,
      title: 'Cheque Number',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'receivedFrom' as keyof ChequeBreakdown,
      title: 'Received From',
      render: (value: unknown) => (
        <div className="font-medium">{value as string}</div>
      )
    },
    {
      key: 'amount' as keyof ChequeBreakdown,
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-semibold text-green-600">
          Rs. {(value as number || (0) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'bankName' as keyof ChequeBreakdown,
      title: 'Bank',
      render: (value: unknown, row: ChequeBreakdown) => (
        <div>
          <div className="text-sm">{value as string}</div>
          {row.bankBranch && (
            <div className="text-xs text-muted-foreground">{row.bankBranch}</div>
          )}
        </div>
      )
    },
    {
      key: 'receivedDate' as keyof ChequeBreakdown,
      title: 'Date',
      render: (value: unknown) => (
        <span className="text-sm">
          {new Date(value as string).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'status' as keyof ChequeBreakdown,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    }
  ]

  // Missing slip columns
  const missingSlipColumns: Column<DailyReport['missingSlips'][0]>[] = [
    {
      key: 'time' as keyof DailyReport['missingSlips'][0],
      title: 'Time',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'terminalName' as keyof DailyReport['missingSlips'][0],
      title: 'Terminal',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'amount' as keyof DailyReport['missingSlips'][0],
      title: 'Amount',
      render: (value: unknown) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          Rs. {(value as number || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'lastFourDigits' as keyof DailyReport['missingSlips'][0],
      title: 'Card Digits',
      render: (value: unknown) => (
        <span className="text-sm">****{value as string}</span>
      )
    },
    {
      key: 'reportedBy' as keyof DailyReport['missingSlips'][0],
      title: 'Reported By',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof DailyReport['missingSlips'][0],
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
      <PrintHeader
        title={dailyReport?.stationName}
        subtitle={`Daily Report - ${new Date(selectedDate).toLocaleDateString()}`}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            Daily Sales Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive daily sales analysis with detailed breakdowns
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
      <FormCard title="Generate Daily Report" description="Select station and date to generate comprehensive daily report">
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
              title="Select Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={generateReport} disabled={loading || !selectedStation || !selectedDate} className="w-full">
              {loading ? (
                'Generating...'
              ) : (
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
          {/* Report Header */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Daily Sales Report
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    {dailyReport.stationName} • {new Date(dailyReport.date).toLocaleDateString('en-US', {
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
                  <Button variant="outline" onClick={exportToExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  Rs. {(dailyReport.totalSales || (0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {dailyReport.transactionCount} transactions
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Shifts Closed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {dailyReport.shiftCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Active shifts
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  Avg Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  Rs. {Math.round(dailyReport.averageTransaction || (0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Per transaction
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-orange-600" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${(dailyReport.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {(dailyReport.netProfit || (0) || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  After expenses
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fuel Sales Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Fuel Sales Breakdown
              </CardTitle>
              <CardDescription>Sales by fuel type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Petrol 92</div>
                  <div className="text-xl font-bold text-orange-600">
                    Rs. {(dailyReport.petrolSales || (0) || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.petrolSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Diesel</div>
                  <div className="text-xl font-bold text-green-600">
                    Rs. {(dailyReport.dieselSales || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.dieselSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Super Diesel</div>
                  <div className="text-xl font-bold text-emerald-600">
                    Rs. {(dailyReport.superDieselSales || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.superDieselSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
                {/* Oil Sales - Hidden for now, to be implemented later 
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Oil Sales</div>
                  <div className="text-xl font-bold text-orange-600">
                    Rs. {(dailyReport.oilSales || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.oilSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
                */}
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <div className="text-sm text-muted-foreground">Shop Sales</div>
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    Rs. {(dailyReport.shopSales || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.shopSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Fuel</div>
                  <div className="text-xl font-bold text-primary">
                    Rs. {(dailyReport.totalFuelSales || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((dailyReport.totalFuelSales / dailyReport.totalSales) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop Sales Breakdown */}
          {dailyReport.shopSalesBreakdown && dailyReport.shopSalesBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Shop Sales Breakdown
                </CardTitle>
                <CardDescription>Itemized shop sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm select-auto">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Product</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Quantity Sold</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {dailyReport.shopSalesBreakdown.map((item) => (
                        <tr key={item.productId} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle font-medium">{item.productName}</td>
                          <td className="p-4 align-middle text-right text-orange-600">{item.quantity.toLocaleString()}</td>
                          <td className="p-4 align-middle text-right font-bold">Rs. {item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tender Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Tender Breakdown
              </CardTitle>
              <CardDescription>Payment methods and amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Cash</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {(dailyReport.cashAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dailyReport.cashPercentage.toFixed(1)}% of total
                  </div>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Card (POS)</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    Rs. {(dailyReport.cardAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dailyReport.cardPercentage.toFixed(1)}% of total
                  </div>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Credit</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    Rs. {(dailyReport.creditAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dailyReport.creditPercentage.toFixed(1)}% of total
                  </div>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Cheque</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    Rs. {(dailyReport.chequeAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {dailyReport.chequePercentage.toFixed(1)}% of total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* POS Terminal Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                POS Terminal Breakdown
              </CardTitle>
              <CardDescription>Detailed card payment breakdown by terminal and card type</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={dailyReport.posTerminals}
                columns={posTerminalColumns}
                searchable={true}
                searchPlaceholder="Search terminals..."
                pagination={false}
                enableExport={true}
                exportFileName="daily-report-pos-terminals"
              />

              {/* POS Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Visa</div>
                    <div className="font-bold text-orange-600">
                      Rs. {dailyReport.posTerminals.reduce((sum, t) => sum + t.visaAmount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Mastercard</div>
                    <div className="font-bold text-red-600">
                      Rs. {dailyReport.posTerminals.reduce((sum, t) => sum + t.mastercardAmount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Amex</div>
                    <div className="font-bold text-green-600">
                      Rs. {dailyReport.posTerminals.reduce((sum, t) => sum + t.amexAmount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total QR</div>
                    <div className="font-bold text-orange-600">
                      Rs. {dailyReport.posTerminals.reduce((sum, t) => sum + t.qrAmount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Dialog Touch</div>
                    <div className="font-bold text-orange-600">
                      Rs. {dailyReport.posTerminals.reduce((sum, t) => sum + t.dialogTouchAmount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
                    <div className="text-xs text-muted-foreground mb-1">Total POS</div>
                    <div className="font-bold text-primary text-lg">
                      Rs. {(dailyReport.totalPOSAmount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Customer Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Credit Customer Breakdown
              </CardTitle>
              <CardDescription>Sales and payment details for credit customers</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={dailyReport.creditCustomers}
                columns={creditCustomerColumns}
                searchable={true}
                searchPlaceholder="Search customers..."
                pagination={false}
                enableExport={true}
                exportFileName="daily-report-credit-customers"
              />

              {/* Credit Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Credit Sales</div>
                    <div className="font-bold text-orange-600 text-lg">
                      Rs. {(dailyReport.totalCreditSales || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Payments Received</div>
                    <div className="font-bold text-orange-600 text-lg">
                      Rs. {dailyReport.creditCustomers.reduce((sum, c) => sum + c.paymentReceived, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Active Customers</div>
                    <div className="font-bold text-orange-600 text-lg">
                      {dailyReport.creditCustomers.length}
                    </div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Outstanding</div>
                    <div className="font-bold text-red-600 text-lg">
                      Rs. {dailyReport.creditCustomers.reduce((sum, c) => sum + c.currentBalance, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cheque Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Cheque Breakdown
              </CardTitle>
              <CardDescription>All cheques received during the day</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={dailyReport.cheques}
                columns={chequeColumns}
                searchable={true}
                searchPlaceholder="Search cheques..."
                pagination={false}
                enableExport={true}
                exportFileName="daily-report-cheques"
              />

              {/* Cheque Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Cheques</div>
                    <div className="font-bold text-orange-600 text-lg">
                      Rs. {(dailyReport.totalChequeAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Cleared</div>
                    <div className="font-bold text-green-600 text-lg">
                      Rs. {dailyReport.cheques.filter(c => c.status === 'CLEARED').reduce((sum, c) => sum + c.amount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Pending</div>
                    <div className="font-bold text-yellow-600 text-lg">
                      Rs. {dailyReport.cheques.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Bounced</div>
                    <div className="font-bold text-red-600 text-lg">
                      Rs. {dailyReport.cheques.filter(c => c.status === 'BOUNCED').reduce((sum, c) => sum + c.amount, (0) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  Rs. {(dailyReport.totalExpenses || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((dailyReport.totalExpenses / dailyReport.totalSales) * 100).toFixed(1)}% of sales
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  Bank Deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  Rs. {(dailyReport.totalDeposits || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {((dailyReport.totalDeposits / dailyReport.totalSales) * 100).toFixed(1)}% of sales
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-orange-600" />
                  Loans Given
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  Rs. {(dailyReport.totalLoans || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  External & pumper loans
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Variance Analysis
              </CardTitle>
              <CardDescription>Difference between calculated and declared amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Total Variance</div>
                  <div className={`text-3xl font-bold ${getVarianceColor(dailyReport.variancePercentage)}`}>
                    {dailyReport.totalVariance >= 0 ? '+' : ''}Rs. {(dailyReport.totalVariance || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {dailyReport.variancePercentage >= 0 ? '+' : ''}{dailyReport.variancePercentage.toFixed(2)}% of total sales
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Variance Status</div>
                  <div className="mt-2">
                    {Math.abs(dailyReport.variancePercentage) <= 0.5 ? (
                      <Badge className="bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300 text-base py-2 px-4">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Within Tolerance
                      </Badge>
                    ) : Math.abs(dailyReport.variancePercentage) <= 1.0 ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300 text-base py-2 px-4">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Needs Review
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300 text-base py-2 px-4">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Requires Action
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Impact</div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {dailyReport.totalVariance >= 0 ? (
                      <>
                        <ArrowUp className="h-5 w-5 text-green-600" />
                        <span className="text-green-600 font-semibold">Surplus</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-5 w-5 text-red-600" />
                        <span className="text-red-600 font-semibold">Shortage</span>
                      </>
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
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                Missing Slip Exceptions
              </CardTitle>
              <CardDescription>POS slips reported as missing</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyReport.missingSlips.length > 0 ? (
                <>
                  <DataTable
                    data={dailyReport.missingSlips}
                    columns={missingSlipColumns}
                    searchPlaceholder="Search missing slips..."
                    pagination={false}
                    emptyMessage="No missing slips reported."
                    enableExport={true}
                    exportFileName="daily-report-missing-slips"
                  />
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <span className="font-medium">Total Missing Slip Amount:</span>
                      <span className="font-bold text-yellow-600 text-lg">
                        Rs. {(dailyReport.missingSlips.reduce((sum, s) => sum + (s.amount || 0), 0) || (0) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p>No missing slips reported for this date.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* High Variance Alert */}
          {Math.abs(dailyReport.variancePercentage) > 1.0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Variance Detected</AlertTitle>
              <AlertDescription>
                Daily variance of {dailyReport.variancePercentage.toFixed(2)}% exceeds acceptable limits (±1.0%).
                Please review transactions and investigate discrepancies immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
