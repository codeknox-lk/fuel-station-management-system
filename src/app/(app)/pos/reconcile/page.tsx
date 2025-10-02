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
  CreditCard, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  DollarSign,
  Calculator,
  AlertTriangle
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Bank {
  id: string
  name: string
  code: string
}

interface ReconciliationData {
  stationId: string
  stationName: string
  reconciliationDate: string
  banks: BankReconciliation[]
  totalCardTenders: number
  totalBatchAmount: number
  totalVariance: number
  overallStatus: 'MATCHED' | 'VARIANCE' | 'CRITICAL'
}

interface BankReconciliation {
  bankId: string
  bankName: string
  terminals: TerminalReconciliation[]
  bankCardTenders: number
  bankBatchTotal: number
  bankVariance: number
  status: 'MATCHED' | 'VARIANCE' | 'CRITICAL'
}

interface TerminalReconciliation {
  terminalId: string
  cardTenders: number
  batchTotal: number
  variance: number
  batchCount: number
  status: 'MATCHED' | 'VARIANCE' | 'CRITICAL'
}

export default function POSReconcilePage() {
  const [stations, setStations] = useState<Station[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, banksRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/banks?active=true')
        ])

        const stationsData = await stationsRes.json()
        const banksData = await banksRes.json()

        setStations(stationsData)
        setBanks(banksData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const generateReconciliation = async () => {
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call an API endpoint
      // For now, we'll generate mock reconciliation data
      
      const station = stations.find(s => s.id === selectedStation)
      
      // Generate mock reconciliation data
      const bankReconciliations: BankReconciliation[] = banks.slice(0, 3).map(bank => {
        // Mock terminal data for each bank
        const terminals: TerminalReconciliation[] = [
          {
            terminalId: `T${bank.code}01`,
            cardTenders: Math.floor(Math.random() * 50000) + 20000,
            batchTotal: 0, // Will be calculated
            variance: 0, // Will be calculated
            batchCount: Math.floor(Math.random() * 5) + 1,
            status: 'MATCHED'
          },
          {
            terminalId: `T${bank.code}02`,
            cardTenders: Math.floor(Math.random() * 30000) + 10000,
            batchTotal: 0, // Will be calculated
            variance: 0, // Will be calculated
            batchCount: Math.floor(Math.random() * 3) + 1,
            status: 'MATCHED'
          }
        ]

        // Add some variance to make it realistic
        terminals.forEach(terminal => {
          const variancePercent = (Math.random() - 0.5) * 0.1 // ±5% variance
          terminal.batchTotal = Math.round(terminal.cardTenders * (1 + variancePercent))
          terminal.variance = terminal.batchTotal - terminal.cardTenders
          
          // Determine status based on variance
          const varianceAmount = Math.abs(terminal.variance)
          if (varianceAmount <= 100) {
            terminal.status = 'MATCHED'
          } else if (varianceAmount <= 1000) {
            terminal.status = 'VARIANCE'
          } else {
            terminal.status = 'CRITICAL'
          }
        })

        const bankCardTenders = terminals.reduce((sum, t) => sum + t.cardTenders, 0)
        const bankBatchTotal = terminals.reduce((sum, t) => sum + t.batchTotal, 0)
        const bankVariance = bankBatchTotal - bankCardTenders

        // Determine bank status
        let bankStatus: 'MATCHED' | 'VARIANCE' | 'CRITICAL' = 'MATCHED'
        const criticalTerminals = terminals.filter(t => t.status === 'CRITICAL').length
        const varianceTerminals = terminals.filter(t => t.status === 'VARIANCE').length
        
        if (criticalTerminals > 0) {
          bankStatus = 'CRITICAL'
        } else if (varianceTerminals > 0) {
          bankStatus = 'VARIANCE'
        }

        return {
          bankId: bank.id,
          bankName: bank.name,
          terminals,
          bankCardTenders,
          bankBatchTotal,
          bankVariance,
          status: bankStatus
        }
      })

      // Calculate overall totals
      const totalCardTenders = bankReconciliations.reduce((sum, bank) => sum + bank.bankCardTenders, 0)
      const totalBatchAmount = bankReconciliations.reduce((sum, bank) => sum + bank.bankBatchTotal, 0)
      const totalVariance = totalBatchAmount - totalCardTenders

      // Determine overall status
      const criticalBanks = bankReconciliations.filter(b => b.status === 'CRITICAL').length
      const varianceBanks = bankReconciliations.filter(b => b.status === 'VARIANCE').length
      
      let overallStatus: 'MATCHED' | 'VARIANCE' | 'CRITICAL' = 'MATCHED'
      if (criticalBanks > 0) {
        overallStatus = 'CRITICAL'
      } else if (varianceBanks > 0) {
        overallStatus = 'VARIANCE'
      }

      const reconciliationData: ReconciliationData = {
        stationId: selectedStation,
        stationName: station?.name || 'Unknown Station',
        reconciliationDate: selectedDate,
        banks: bankReconciliations,
        totalCardTenders,
        totalBatchAmount,
        totalVariance,
        overallStatus
      }

      setReconciliation(reconciliationData)

    } catch (err) {
      setError('Failed to generate reconciliation')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: 'MATCHED' | 'VARIANCE' | 'CRITICAL') => {
    switch (status) {
      case 'MATCHED': return 'text-green-600 bg-green-50 border-green-200'
      case 'VARIANCE': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusIcon = (status: 'MATCHED' | 'VARIANCE' | 'CRITICAL') => {
    switch (status) {
      case 'MATCHED': return <CheckCircle className="h-4 w-4" />
      case 'VARIANCE': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <AlertCircle className="h-4 w-4" />
    }
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">POS Reconciliation</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Reconciliation Report">
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
            <Label htmlFor="date">Reconciliation Date</Label>
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
            <Button onClick={generateReconciliation} disabled={loading || !selectedStation || !selectedDate}>
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

      {reconciliation && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                POS Reconciliation - {reconciliation.stationName}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Date: {new Date(reconciliation.reconciliationDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    Rs. {reconciliation.totalCardTenders.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Card Tenders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    Rs. {reconciliation.totalBatchAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Batch Totals</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${reconciliation.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {reconciliation.totalVariance >= 0 ? '+' : ''}Rs. {reconciliation.totalVariance.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Variance</div>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(reconciliation.overallStatus)}>
                    {getStatusIcon(reconciliation.overallStatus)}
                    <span className="ml-1">{reconciliation.overallStatus}</span>
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">Overall Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <div className="grid gap-4">
            {reconciliation.banks.map((bank) => (
              <Card key={bank.bankId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {bank.bankName}
                    </div>
                    <Badge className={getStatusColor(bank.status)}>
                      {getStatusIcon(bank.status)}
                      <span className="ml-1">{bank.status}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Bank Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        Rs. {bank.bankCardTenders.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Card Tenders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        Rs. {bank.bankBatchTotal.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Batch Total</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold flex items-center justify-center gap-1 ${bank.bankVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {getVarianceIcon(bank.bankVariance)}
                        {bank.bankVariance >= 0 ? '+' : ''}Rs. {bank.bankVariance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Variance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-600">
                        {bank.terminals.length}
                      </div>
                      <div className="text-xs text-gray-600">Terminals</div>
                    </div>
                  </div>

                  {/* Terminal Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">Terminal Breakdown</h4>
                    {bank.terminals.map((terminal) => (
                      <div key={terminal.terminalId} className="grid grid-cols-2 md:grid-cols-6 gap-4 p-3 border rounded-lg">
                        <div>
                          <div className="text-sm font-medium">{terminal.terminalId}</div>
                          <div className="text-xs text-gray-500">{terminal.batchCount} batches</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-blue-600">
                            Rs. {terminal.cardTenders.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Card Tenders</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-green-600">
                            Rs. {terminal.batchTotal.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Batch Total</div>
                        </div>
                        <div>
                          <div className={`text-sm font-semibold flex items-center gap-1 ${terminal.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {getVarianceIcon(terminal.variance)}
                            {terminal.variance >= 0 ? '+' : ''}Rs. {terminal.variance.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Variance</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {terminal.variance !== 0 ? (
                              ((terminal.variance / terminal.cardTenders) * 100).toFixed(2) + '%'
                            ) : '0%'}
                          </div>
                          <div className="text-xs text-gray-500">Variance %</div>
                        </div>
                        <div>
                          <Badge className={getStatusColor(terminal.status)} size="sm">
                            {terminal.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Banks matched</div>
                  <div className="text-2xl font-bold text-green-600">
                    {reconciliation.banks.filter(b => b.status === 'MATCHED').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Banks with variance</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {reconciliation.banks.filter(b => b.status === 'VARIANCE').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Critical variances</div>
                  <div className="text-2xl font-bold text-red-600">
                    {reconciliation.banks.filter(b => b.status === 'CRITICAL').length}
                  </div>
                </div>
              </div>
              
              {reconciliation.overallStatus !== 'MATCHED' && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    There are variances that need investigation. Please review the terminal details above 
                    and check for missing slips, duplicate entries, or processing errors.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
