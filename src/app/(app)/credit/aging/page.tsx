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
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  DollarSign,
  Clock,
  Calculator
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface CustomerAging {
  customerId: string
  customerName: string
  nicOrBrn: string
  creditLimit: number
  totalOutstanding: number
  current: number // 0-30 days
  days31to60: number // 31-60 days
  days61to90: number // 61-90 days
  over90Days: number // 90+ days
  oldestInvoiceDate: string
  daysPastDue: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  lastPaymentDate?: string
  lastPaymentAmount?: number
}

interface AgingSummary {
  stationId?: string
  stationName?: string
  reportDate: string
  totalCustomers: number
  totalOutstanding: number
  currentBucket: number // 0-30 days
  bucket31to60: number // 31-60 days
  bucket61to90: number // 61-90 days
  over90Bucket: number // 90+ days
  riskDistribution: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export default function CreditAgingPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [agingData, setAgingData] = useState<CustomerAging[]>([])
  const [summary, setSummary] = useState<AgingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('all')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

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

  const generateReport = async () => {
    setLoading(true)
    setError('')

    try {
      // In a real app, this would call the API endpoint
      // For now, we'll generate mock aging data
      
      const station = selectedStation === 'all' ? null : stations.find(s => s.id === selectedStation)
      
      // Generate mock aging data
      const mockCustomers = [
        'John Silva', 'Kamal Perera', 'Sunil Fernando', 'Ravi Kumar', 'Nimal Bandara',
        'Priya Jayawardena', 'Chaminda Rathnayake', 'Dilshan Mendis', 'Tharaka Wijesinghe', 'Mahesh Gunasekara'
      ]

      const agingCustomers: CustomerAging[] = mockCustomers.map((name, index) => {
        const creditLimit = Math.floor(Math.random() * 100000) + 50000
        const totalOutstanding = Math.floor(Math.random() * creditLimit * 0.8)
        
        // Distribute outstanding across aging buckets
        const current = Math.floor(totalOutstanding * (0.4 + Math.random() * 0.3)) // 40-70%
        const days31to60 = Math.floor((totalOutstanding - current) * (0.3 + Math.random() * 0.3)) // 30-60%
        const days61to90 = Math.floor((totalOutstanding - current - days31to60) * (0.2 + Math.random() * 0.4)) // 20-60%
        const over90Days = totalOutstanding - current - days31to60 - days61to90
        
        const daysPastDue = Math.floor(Math.random() * 120)
        const oldestInvoiceDate = new Date(Date.now() - daysPastDue * 24 * 60 * 60 * 1000).toISOString()
        
        // Determine risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
        const utilizationRate = totalOutstanding / creditLimit
        
        if (over90Days > 0 || daysPastDue > 90) {
          riskLevel = 'CRITICAL'
        } else if (days61to90 > 0 || daysPastDue > 60 || utilizationRate > 0.8) {
          riskLevel = 'HIGH'
        } else if (days31to60 > 0 || daysPastDue > 30 || utilizationRate > 0.6) {
          riskLevel = 'MEDIUM'
        }

        return {
          customerId: `customer-${index + 1}`,
          customerName: name,
          nicOrBrn: `${Math.floor(Math.random() * 900000000) + 100000000}V`,
          creditLimit,
          totalOutstanding,
          current,
          days31to60,
          days61to90,
          over90Days,
          oldestInvoiceDate,
          daysPastDue,
          riskLevel,
          lastPaymentDate: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() : undefined,
          lastPaymentAmount: Math.random() > 0.3 ? Math.floor(Math.random() * 20000) + 5000 : undefined
        }
      })

      setAgingData(agingCustomers)

      // Calculate summary
      const totalOutstanding = agingCustomers.reduce((sum, c) => sum + c.totalOutstanding, 0)
      const currentBucket = agingCustomers.reduce((sum, c) => sum + c.current, 0)
      const bucket31to60 = agingCustomers.reduce((sum, c) => sum + c.days31to60, 0)
      const bucket61to90 = agingCustomers.reduce((sum, c) => sum + c.days61to90, 0)
      const over90Bucket = agingCustomers.reduce((sum, c) => sum + c.over90Days, 0)

      const riskDistribution = {
        low: agingCustomers.filter(c => c.riskLevel === 'LOW').length,
        medium: agingCustomers.filter(c => c.riskLevel === 'MEDIUM').length,
        high: agingCustomers.filter(c => c.riskLevel === 'HIGH').length,
        critical: agingCustomers.filter(c => c.riskLevel === 'CRITICAL').length
      }

      const agingSummary: AgingSummary = {
        stationId: selectedStation === 'all' ? undefined : selectedStation,
        stationName: station?.name || 'All Stations',
        reportDate,
        totalCustomers: agingCustomers.length,
        totalOutstanding,
        currentBucket,
        bucket31to60,
        bucket61to90,
        over90Bucket,
        riskDistribution
      }

      setSummary(agingSummary)

    } catch (err) {
      setError('Failed to generate aging report')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'LOW': return <CheckCircle className="h-4 w-4" />
      case 'MEDIUM': return <Clock className="h-4 w-4" />
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <AlertCircle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const getBucketColor = (amount: number, total: number) => {
    const percentage = total > 0 ? (amount / total) * 100 : 0
    if (percentage >= 50) return 'text-red-600'
    if (percentage >= 25) return 'text-yellow-600'
    return 'text-green-600'
  }

  const agingColumns: Column<CustomerAging>[] = [
    {
      key: 'customerName' as keyof CustomerAging,
      title: 'Customer',
      render: (value: unknown, row: CustomerAging) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-medium">{value as string}</span>
            <span className="text-xs text-gray-500">{row.nicOrBrn}</span>
          </div>
        </div>
      )
    },
    {
      key: 'totalOutstanding' as keyof CustomerAging,
      title: 'Total Outstanding',
      render: (value: unknown, row: CustomerAging) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-red-500" />
            <span className="font-mono font-semibold text-red-700">
              Rs. {(value as number)?.toLocaleString() || 0}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {row.creditLimit > 0 ? Math.round(((value as number) / row.creditLimit) * 100) : 0}% of limit
          </div>
        </div>
      )
    },
    {
      key: 'current' as keyof CustomerAging,
      title: '0-30 Days',
      render: (value: unknown, row: CustomerAging) => (
        <span className={`font-mono ${getBucketColor(value as number, row.totalOutstanding)}`}>
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'days31to60' as keyof CustomerAging,
      title: '31-60 Days',
      render: (value: unknown, row: CustomerAging) => (
        <span className={`font-mono ${getBucketColor(value as number, row.totalOutstanding)}`}>
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'days61to90' as keyof CustomerAging,
      title: '61-90 Days',
      render: (value: unknown, row: CustomerAging) => (
        <span className={`font-mono ${getBucketColor(value as number, row.totalOutstanding)}`}>
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'over90Days' as keyof CustomerAging,
      title: '90+ Days',
      render: (value: unknown, row: CustomerAging) => (
        <span className={`font-mono ${getBucketColor(value as number, row.totalOutstanding)}`}>
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'daysPastDue' as keyof CustomerAging,
      title: 'Days Past Due',
      render: (value: unknown) => {
        const days = value as number
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className={`font-semibold ${
              days > 90 ? 'text-red-600' : 
              days > 60 ? 'text-orange-600' : 
              days > 30 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {days} days
            </span>
          </div>
        )
      }
    },
    {
      key: 'riskLevel' as keyof CustomerAging,
      title: 'Risk Level',
      render: (value: unknown) => (
        <Badge className={getRiskColor(value as string)}>
          <div className="flex items-center gap-1">
            {getRiskIcon(value as string)}
            <span>{value as string}</span>
          </div>
        </Badge>
      )
    },
    {
      key: 'lastPaymentDate' as keyof CustomerAging,
      title: 'Last Payment',
      render: (value: unknown, row: CustomerAging) => (
        value ? (
          <div className="flex flex-col">
            <span className="text-sm">
              {new Date(value as string).toLocaleDateString()}
            </span>
            {row.lastPaymentAmount && (
              <span className="text-xs text-gray-500">
                Rs. {row.lastPaymentAmount.toLocaleString()}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">No payments</span>
        )
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Credit Aging Analysis</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Aging Report">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="station">Station (Optional)</Label>
            <Select value={selectedStation} onValueChange={setSelectedStation} disabled={loading}>
              <SelectTrigger id="station">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
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
            <Label htmlFor="date">Report Date</Label>
            <input
              id="date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={generateReport} disabled={loading || !reportDate}>
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

      {summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  Rs. {summary.totalOutstanding.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalCustomers} customers
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">0-30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  Rs. {summary.currentBucket.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalOutstanding > 0 ? Math.round((summary.currentBucket / summary.totalOutstanding) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">31-60 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  Rs. {summary.bucket31to60.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalOutstanding > 0 ? Math.round((summary.bucket31to60 / summary.totalOutstanding) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">61-90 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">
                  Rs. {summary.bucket61to90.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalOutstanding > 0 ? Math.round((summary.bucket61to90 / summary.totalOutstanding) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">90+ Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  Rs. {summary.over90Bucket.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {summary.totalOutstanding > 0 ? Math.round((summary.over90Bucket / summary.totalOutstanding) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.riskDistribution.low}
                  </div>
                  <div className="text-sm text-gray-600">Low Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {summary.riskDistribution.medium}
                  </div>
                  <div className="text-sm text-gray-600">Medium Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.riskDistribution.high}
                  </div>
                  <div className="text-sm text-gray-600">High Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.riskDistribution.critical}
                  </div>
                  <div className="text-sm text-gray-600">Critical Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Aging Table */}
          <FormCard title="Customer Aging Details" className="p-6">
            <DataTable
              data={agingData}
              columns={agingColumns}
              searchPlaceholder="Search customers..."
              emptyMessage="No aging data available."
            />
          </FormCard>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.riskDistribution.critical > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Critical:</strong> {summary.riskDistribution.critical} customers have overdue amounts over 90 days. 
                      Immediate collection action required.
                    </AlertDescription>
                  </Alert>
                )}
                
                {summary.riskDistribution.high > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>High Risk:</strong> {summary.riskDistribution.high} customers require close monitoring. 
                      Consider payment plans or credit limit reviews.
                    </AlertDescription>
                  </Alert>
                )}

                {summary.over90Bucket > summary.totalOutstanding * 0.1 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Collection Focus:</strong> Over 10% of outstanding debt is 90+ days old. 
                      Review collection procedures and consider debt recovery actions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
