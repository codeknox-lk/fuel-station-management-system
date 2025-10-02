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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Shield, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  DollarSign,
  Calculator,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  AlertTriangle
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface SafeSummary {
  stationId: string
  stationName: string
  date: string
  openingBalance: number
  
  // Inflows
  cashSales: number
  creditPayments: number
  loanReceipts: number
  otherInflows: number
  totalInflows: number
  
  // Outflows
  expenses: number
  loanPayments: number
  deposits: number
  otherOutflows: number
  totalOutflows: number
  
  // Calculated
  expectedBalance: number
  actualBalance: number
  variance: number
  isBalanced: boolean
  
  // Details for expanders
  inflowDetails: InflowDetail[]
  outflowDetails: OutflowDetail[]
}

interface InflowDetail {
  id: string
  type: 'CASH_SALES' | 'CREDIT_PAYMENT' | 'LOAN_RECEIPT' | 'OTHER'
  description: string
  amount: number
  time: string
  reference?: string
}

interface OutflowDetail {
  id: string
  type: 'EXPENSE' | 'LOAN_PAYMENT' | 'DEPOSIT' | 'OTHER'
  description: string
  amount: number
  time: string
  reference?: string
  approvedBy?: string
}

export default function SafeSummaryPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [safeSummary, setSafeSummary] = useState<SafeSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Expander state
  const [inflowsExpanded, setInflowsExpanded] = useState(false)
  const [outflowsExpanded, setOutflowsExpanded] = useState(false)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/stations?active=true')
        const stationsData = await response.json()
        setStations(stationsData)
      } catch (err) {
        setError('Failed to load stations')
      }
    }

    loadData()
  }, [])

  const generateSummary = async () => {
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call the API endpoint
      // For now, we'll generate mock safe summary data
      
      const station = stations.find(s => s.id === selectedStation)
      
      // Generate mock safe summary
      const openingBalance = Math.floor(Math.random() * 50000) + 20000
      
      // Mock inflows
      const cashSales = Math.floor(Math.random() * 100000) + 50000
      const creditPayments = Math.floor(Math.random() * 30000) + 10000
      const loanReceipts = Math.floor(Math.random() * 20000)
      const otherInflows = Math.floor(Math.random() * 10000)
      const totalInflows = cashSales + creditPayments + loanReceipts + otherInflows
      
      // Mock outflows
      const expenses = Math.floor(Math.random() * 25000) + 10000
      const loanPayments = Math.floor(Math.random() * 15000) + 5000
      const deposits = Math.floor(Math.random() * 80000) + 40000
      const otherOutflows = Math.floor(Math.random() * 5000)
      const totalOutflows = expenses + loanPayments + deposits + otherOutflows
      
      const expectedBalance = openingBalance + totalInflows - totalOutflows
      const actualBalance = expectedBalance + (Math.random() * 2000 - 1000) // Add some variance
      const variance = actualBalance - expectedBalance
      const isBalanced = Math.abs(variance) <= 500 // Tolerance of Rs. 500

      // Mock inflow details
      const inflowDetails: InflowDetail[] = [
        {
          id: '1',
          type: 'CASH_SALES',
          description: 'Cash sales from all pumps',
          amount: cashSales,
          time: '18:00',
          reference: 'SHIFT-001'
        },
        {
          id: '2',
          type: 'CREDIT_PAYMENT',
          description: 'Credit customer payments',
          amount: creditPayments,
          time: '16:30',
          reference: 'CREDIT-PAY-001'
        }
      ]

      if (loanReceipts > 0) {
        inflowDetails.push({
          id: '3',
          type: 'LOAN_RECEIPT',
          description: 'Loan receipt from external source',
          amount: loanReceipts,
          time: '14:00',
          reference: 'LOAN-REC-001'
        })
      }

      if (otherInflows > 0) {
        inflowDetails.push({
          id: '4',
          type: 'OTHER',
          description: 'Miscellaneous receipts',
          amount: otherInflows,
          time: '12:00'
        })
      }

      // Mock outflow details
      const outflowDetails: OutflowDetail[] = [
        {
          id: '1',
          type: 'EXPENSE',
          description: 'Daily operational expenses',
          amount: expenses,
          time: '15:00',
          reference: 'EXP-001',
          approvedBy: 'Manager'
        },
        {
          id: '2',
          type: 'DEPOSIT',
          description: 'Bank deposit - BOC Main Branch',
          amount: deposits,
          time: '11:00',
          reference: 'DEP-001',
          approvedBy: 'Owner'
        },
        {
          id: '3',
          type: 'LOAN_PAYMENT',
          description: 'External loan payment',
          amount: loanPayments,
          time: '10:00',
          reference: 'LOAN-PAY-001',
          approvedBy: 'Owner'
        }
      ]

      if (otherOutflows > 0) {
        outflowDetails.push({
          id: '4',
          type: 'OTHER',
          description: 'Miscellaneous payments',
          amount: otherOutflows,
          time: '13:30',
          approvedBy: 'Manager'
        })
      }

      const summary: SafeSummary = {
        stationId: selectedStation,
        stationName: station?.name || 'Unknown Station',
        date: selectedDate,
        openingBalance,
        cashSales,
        creditPayments,
        loanReceipts,
        otherInflows,
        totalInflows,
        expenses,
        loanPayments,
        deposits,
        otherOutflows,
        totalOutflows,
        expectedBalance,
        actualBalance,
        variance,
        isBalanced,
        inflowDetails,
        outflowDetails
      }

      setSafeSummary(summary)

    } catch (err) {
      setError('Failed to generate safe summary')
    } finally {
      setLoading(false)
    }
  }

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 500) return 'text-green-600'
    if (Math.abs(variance) <= 1000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CASH_SALES':
      case 'CREDIT_PAYMENT':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'EXPENSE':
      case 'LOAN_PAYMENT':
      case 'DEPOSIT':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Safe Summary</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Safe Summary">
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
            <Button onClick={generateSummary} disabled={loading || !selectedStation || !selectedDate}>
              {loading ? 'Generating...' : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </FormCard>

      {safeSummary && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safe Summary - {safeSummary.stationName}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(safeSummary.date).toLocaleDateString()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    Rs. {safeSummary.actualBalance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Actual Balance</div>
                </div>
                <div className="text-center">
                  <Badge 
                    className={`text-lg py-2 px-4 ${
                      safeSummary.isBalanced 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {safeSummary.isBalanced ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Balanced
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Not Balanced
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formula Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Opening Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-700">
                  Rs. {safeSummary.openingBalance.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Total Inflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  + Rs. {safeSummary.totalInflows.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Total Outflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  - Rs. {safeSummary.totalOutflows.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Expected Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  Rs. {safeSummary.expectedBalance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variance */}
          <Card>
            <CardHeader>
              <CardTitle>Variance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Expected</div>
                  <div className="text-2xl font-bold text-blue-600">
                    Rs. {safeSummary.expectedBalance.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Actual</div>
                  <div className="text-2xl font-bold text-purple-600">
                    Rs. {safeSummary.actualBalance.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Variance</div>
                  <div className={`text-2xl font-bold ${getVarianceColor(safeSummary.variance)}`}>
                    {safeSummary.variance >= 0 ? '+' : ''}Rs. {safeSummary.variance.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inflows Expander */}
          <Card>
            <Collapsible open={inflowsExpanded} onOpenChange={setInflowsExpanded}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-500" />
                      Inflows - Rs. {safeSummary.totalInflows.toLocaleString()}
                    </div>
                    {inflowsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {safeSummary.inflowDetails.map((inflow) => (
                      <div key={inflow.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(inflow.type)}
                          <div>
                            <div className="font-medium">{inflow.description}</div>
                            <div className="text-xs text-gray-500">
                              {inflow.time} {inflow.reference && `• ${inflow.reference}`}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-green-700">
                          Rs. {inflow.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Outflows Expander */}
          <Card>
            <Collapsible open={outflowsExpanded} onOpenChange={setOutflowsExpanded}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Minus className="h-5 w-5 text-red-500" />
                      Outflows - Rs. {safeSummary.totalOutflows.toLocaleString()}
                    </div>
                    {outflowsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {safeSummary.outflowDetails.map((outflow) => (
                      <div key={outflow.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(outflow.type)}
                          <div>
                            <div className="font-medium">{outflow.description}</div>
                            <div className="text-xs text-gray-500">
                              {outflow.time} {outflow.reference && `• ${outflow.reference}`}
                              {outflow.approvedBy && ` • Approved by ${outflow.approvedBy}`}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-red-700">
                          Rs. {outflow.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Recommendations */}
          {!safeSummary.isBalanced && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                The safe is not balanced. Variance of Rs. {Math.abs(safeSummary.variance).toLocaleString()} 
                {safeSummary.variance > 0 ? ' excess' : ' shortage'} detected. 
                Please verify all transactions and investigate the discrepancy.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
