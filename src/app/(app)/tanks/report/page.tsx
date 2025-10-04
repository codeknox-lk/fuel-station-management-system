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
  Fuel, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  Building2,
  Droplets,
  Truck,
  TestTube,
  Calculator
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Tank {
  id: string
  stationId: string
  tankNumber: string
  fuelType: string
  capacity: number
}

interface TankReport {
  tankId: string
  tankNumber: string
  fuelType: string
  capacity: number
  openingStock: number
  deliveries: number
  sales: number
  testReturns: number
  closingBookStock: number
  closingDipStock: number
  variance: number
  variancePercentage: number
  toleranceStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
  toleranceLimit: number
}

interface StationReport {
  stationId: string
  stationName: string
  reportDate: string
  tanks: TankReport[]
  totalVariance: number
  totalVariancePercentage: number
  overallStatus: 'NORMAL' | 'WARNING' | 'CRITICAL'
}

export default function TankReportPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [report, setReport] = useState<StationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

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

  // Load tanks when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadTanks = async () => {
        try {
          const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
          const tanksData = await response.json()
          setTanks(tanksData)
        } catch (err) {
          setError('Failed to load tanks')
        }
      }

      loadTanks()
    } else {
      setTanks([])
    }
  }, [selectedStation])

  const generateReport = async () => {
    if (!selectedStation || !selectedDate) {
      setError('Please select both station and date')
      return
    }

    setLoading(true)
    setError('')

    try {
      // In a real app, this would call an API endpoint
      // For now, we'll generate mock data based on the selected parameters
      
      const station = stations.find(s => s.id === selectedStation)
      const stationTanks = tanks.filter(t => t.stationId === selectedStation)

      // Generate mock report data
      const tankReports: TankReport[] = stationTanks.map(tank => {
        // Mock calculations - in real app, these would come from the API
        const openingStock = Math.floor(Math.random() * tank.capacity * 0.8) + tank.capacity * 0.1
        const deliveries = Math.floor(Math.random() * 20000)
        const sales = Math.floor(Math.random() * 15000) + 5000
        const testReturns = Math.floor(Math.random() * 100)
        
        const closingBookStock = openingStock + deliveries - sales + testReturns
        const closingDipStock = closingBookStock + (Math.random() - 0.5) * 500 // Add some variance
        
        const variance = closingDipStock - closingBookStock
        const variancePercentage = closingBookStock > 0 ? (variance / closingBookStock) * 100 : 0
        
        // Tolerance calculation (2% or 200L, whichever is greater)
        const toleranceLimit = Math.max(closingBookStock * 0.02, 200)
        
        let toleranceStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL'
        if (Math.abs(variance) > toleranceLimit) {
          toleranceStatus = Math.abs(variance) > toleranceLimit * 2 ? 'CRITICAL' : 'WARNING'
        }

        return {
          tankId: tank.id,
          tankNumber: tank.tankNumber,
          fuelType: tank.fuelType,
          capacity: tank.capacity,
          openingStock: Math.round(openingStock),
          deliveries: Math.round(deliveries),
          sales: Math.round(sales),
          testReturns: Math.round(testReturns),
          closingBookStock: Math.round(closingBookStock),
          closingDipStock: Math.round(closingDipStock),
          variance: Math.round(variance),
          variancePercentage: parseFloat(variancePercentage.toFixed(2)),
          toleranceStatus,
          toleranceLimit: Math.round(toleranceLimit)
        }
      })

      // Calculate overall station metrics
      const totalVariance = tankReports.reduce((sum, tank) => sum + tank.variance, 0)
      const totalBookStock = tankReports.reduce((sum, tank) => sum + tank.closingBookStock, 0)
      const totalVariancePercentage = totalBookStock > 0 ? (totalVariance / totalBookStock) * 100 : 0

      const criticalTanks = tankReports.filter(t => t.toleranceStatus === 'CRITICAL').length
      const warningTanks = tankReports.filter(t => t.toleranceStatus === 'WARNING').length
      
      let overallStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL'
      if (criticalTanks > 0) {
        overallStatus = 'CRITICAL'
      } else if (warningTanks > 0) {
        overallStatus = 'WARNING'
      }

      const stationReport: StationReport = {
        stationId: selectedStation,
        stationName: station?.name || 'Unknown Station',
        reportDate: selectedDate,
        tanks: tankReports,
        totalVariance: Math.round(totalVariance),
        totalVariancePercentage: parseFloat(totalVariancePercentage.toFixed(2)),
        overallStatus
      }

      setReport(stationReport)

    } catch (err) {
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
    switch (status) {
      case 'NORMAL': return 'text-green-600 bg-green-50 border-green-200'
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const getStatusIcon = (status: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
    switch (status) {
      case 'NORMAL': return <CheckCircle className="h-4 w-4" />
      case 'WARNING': return <AlertCircle className="h-4 w-4" />
      case 'CRITICAL': return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Tank Variance Report</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Report">
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
            <Label htmlFor="date">Report Date</Label>
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

      {report && (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Tank Variance Report - {report.stationName}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Report Date: {new Date(report.reportDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {report.tanks.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Tanks</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${report.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.totalVariance >= 0 ? '+' : ''}{report.totalVariance.toLocaleString()}L
                  </div>
                  <div className="text-sm text-gray-600">Total Variance</div>
                </div>
                <div className="text-center">
                  <Badge className={getStatusColor(report.overallStatus)}>
                    {getStatusIcon(report.overallStatus)}
                    <span className="ml-1">{report.overallStatus}</span>
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">Overall Status</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tank Details */}
          <div className="grid gap-4">
            {report.tanks.map((tank) => (
              <Card key={tank.tankId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-5 w-5" />
                      Tank {tank.tankNumber} - {tank.fuelType}
                    </div>
                    <Badge className={getStatusColor(tank.toleranceStatus)}>
                      {getStatusIcon(tank.toleranceStatus)}
                      <span className="ml-1">{tank.toleranceStatus}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                    {/* Opening Stock */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Opening</span>
                      </div>
                      <div className="font-mono text-lg">{tank.openingStock.toLocaleString()}L</div>
                    </div>

                    {/* Deliveries */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Truck className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Deliveries</span>
                      </div>
                      <div className="font-mono text-lg text-green-600">+{tank.deliveries.toLocaleString()}L</div>
                    </div>

                    {/* Sales */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Sales</span>
                      </div>
                      <div className="font-mono text-lg text-red-600">-{tank.sales.toLocaleString()}L</div>
                    </div>

                    {/* Test Returns */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TestTube className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Test Returns</span>
                      </div>
                      <div className="font-mono text-lg text-purple-600">+{tank.testReturns.toLocaleString()}L</div>
                    </div>

                    {/* Book Stock */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Calculator className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Book Stock</span>
                      </div>
                      <div className="font-mono text-lg">{tank.closingBookStock.toLocaleString()}L</div>
                    </div>

                    {/* Dip Stock */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Dip Stock</span>
                      </div>
                      <div className="font-mono text-lg font-semibold">{tank.closingDipStock.toLocaleString()}L</div>
                    </div>

                    {/* Variance */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        {tank.variance >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Variance</span>
                      </div>
                      <div className={`font-mono text-lg font-bold ${tank.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tank.variance >= 0 ? '+' : ''}{tank.variance.toLocaleString()}L
                      </div>
                      <div className={`text-xs ${Math.abs(tank.variancePercentage) <= 2 ? 'text-gray-500' : 'text-red-500'}`}>
                        ({tank.variancePercentage >= 0 ? '+' : ''}{tank.variancePercentage.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Tolerance Information */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Tolerance Limit: ±{tank.toleranceLimit.toLocaleString()}L
                      </span>
                      <span className={`font-medium ${tank.toleranceStatus === 'NORMAL' ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(tank.variance) <= tank.toleranceLimit ? 'Within Tolerance' : 'Exceeds Tolerance'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Tanks within tolerance</div>
                  <div className="text-2xl font-bold text-green-600">
                    {report.tanks.filter(t => t.toleranceStatus === 'NORMAL').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tanks with warnings</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {report.tanks.filter(t => t.toleranceStatus === 'WARNING').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Critical tanks</div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.tanks.filter(t => t.toleranceStatus === 'CRITICAL').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
