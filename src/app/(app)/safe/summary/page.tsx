'use client'

import { useState } from 'react'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  const [safeSummary, setSafeSummary] = useState<SafeSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const { selectedStation, stations } = useStation()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Expander state
  const [inflowsExpanded, setInflowsExpanded] = useState(false)
  const [outflowsExpanded, setOutflowsExpanded] = useState(false)


  const generateSummary = async () => {
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call the API endpoint to get real safe summary data
      const response = await fetch(`/api/safe/summary?stationId=${selectedStation}&date=${selectedDate}`)

      if (!response.ok) {
        throw new Error('Failed to fetch safe summary')
      }

      const apiData = await response.json()

      // Transform API response to match frontend interface
      const summary: SafeSummary = {
        stationId: apiData.stationId || selectedStation,
        stationName: apiData.stationName || stations.find(s => s.id === selectedStation)?.name || 'Unknown Station',
        date: apiData.date || selectedDate,
        openingBalance: apiData.openingBalance || 0,
        cashSales: apiData.cashSales || 0,
        creditPayments: apiData.creditPayments || 0,
        loanReceipts: apiData.loanReceipts || 0,
        otherInflows: apiData.otherInflows || 0,
        totalInflows: apiData.totalInflows || 0,
        expenses: apiData.expenses || 0,
        loanPayments: apiData.loanPayments || 0,
        deposits: apiData.deposits || 0,
        otherOutflows: apiData.otherOutflows || 0,
        totalOutflows: apiData.totalOutflows || 0,
        expectedBalance: apiData.expectedBalance || 0,
        actualBalance: apiData.actualBalance || 0,
        variance: apiData.variance || 0,
        isBalanced: apiData.isBalanced || false,
        inflowDetails: apiData.inflowDetails || [],
        outflowDetails: apiData.outflowDetails || []
      }

      setSafeSummary(summary)

    } catch (err) {
      console.error('Error fetching safe summary:', err)
      setError('Failed to generate safe summary: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 500) return 'text-green-600 dark:text-green-400'
    if (Math.abs(variance) <= 1000) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CASH_SALES':
      case 'CREDIT_PAYMENT':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'EXPENSE':
      case 'LOAN_PAYMENT':
      case 'DEPOSIT':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Safe Summary</h1>

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
            <Label>Selected Station</Label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{stations.find(s => s.id === selectedStation)?.name || 'All Stations'}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              aria-label="Filter by date"
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
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    Rs. {(safeSummary.actualBalance || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Actual Balance</div>
                </div>
                <div className="text-center">
                  <Badge
                    className={`text-lg py-2 px-4 ${safeSummary.isBalanced
                      ? 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
                      : 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Opening Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  Rs. {(safeSummary.openingBalance || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Total Inflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  + Rs. {(safeSummary.totalInflows || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Outflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  - Rs. {(safeSummary.totalOutflows || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Expected Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {(safeSummary.expectedBalance || 0).toLocaleString()}
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
                  <div className="text-lg font-semibold text-muted-foreground">Expected</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    Rs. {(safeSummary.expectedBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-muted-foreground">Actual</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    Rs. {(safeSummary.actualBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-muted-foreground">Variance</div>
                  <div className={`text-2xl font-bold ${getVarianceColor(safeSummary.variance)}`}>
                    {safeSummary.variance >= 0 ? '+' : ''}Rs. {(safeSummary.variance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inflows Expander */}
          <Card>
            <Collapsible open={inflowsExpanded} onOpenChange={setInflowsExpanded}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Inflows - Rs. {(safeSummary.totalInflows || 0).toLocaleString()}
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
                      <div key={inflow.id} className="flex items-center justify-between p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(inflow.type)}
                          <div>
                            <div className="font-medium">{inflow.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {inflow.time} {inflow.reference && `• ${inflow.reference}`}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-green-700">
                          Rs. {(inflow.amount || 0).toLocaleString()}
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
                <CardHeader className="cursor-pointer hover:bg-muted">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Minus className="h-5 w-5 text-red-600 dark:text-red-400" />
                      Outflows - Rs. {(safeSummary.totalOutflows || 0).toLocaleString()}
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
                      <div key={outflow.id} className="flex items-center justify-between p-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(outflow.type)}
                          <div>
                            <div className="font-medium">{outflow.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {outflow.time} {outflow.reference && `• ${outflow.reference}`}
                              {outflow.approvedBy && ` • Approved by ${outflow.approvedBy}`}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-red-700">
                          Rs. {(outflow.amount || 0).toLocaleString()}
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
                The safe is not balanced. Variance of Rs. {(Math.abs(safeSummary.variance) || 0).toLocaleString()}
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
