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
  Calendar, 
  Fuel,
  TrendingUp,
  TrendingDown,
  AlertCircle, 
  Printer,
  FileText,
  Calculator,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { exportTankReportPDF } from '@/lib/exportUtils'

interface Station {
  id: string
  name: string
  city: string
}

interface TankMovement {
  id: string
  tankId: string
  tankName: string
  fuelType: string
  capacity: number
  date: string
  
  // Opening
  openingDip: number
  openingBook: number
  
  // Movements
  deliveries: number
  sales: number
  testReturns: number
  
  // Closing
  closingBook: number
  closingDip: number
  
  // Variance
  variance: number
  variancePercentage: number
  varianceStatus: 'WITHIN_TOLERANCE' | 'NEEDS_REVIEW' | 'CRITICAL'
  
  // Additional info
  deliveryCount: number
  lastDeliveryDate?: string
  fillPercentage: number
}

export default function TanksReportsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [tankMovements, setTankMovements] = useState<TankMovement[]>([])
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
      // For now, we'll generate mock tank movement data
      
      const station = stations.find(s => s.id === selectedStation)
      
      // Generate mock tank movements
      const tankMovements: TankMovement[] = [
        {
          id: '1',
          tankId: 'tank-1',
          tankName: 'Tank 1',
          fuelType: 'Petrol 95',
          capacity: 10000,
          date: selectedDate,
          openingDip: 7500,
          openingBook: 7520,
          deliveries: 8000,
          sales: 6750,
          testReturns: 25,
          closingBook: 8795,
          closingDip: 8780,
          variance: -15,
          variancePercentage: -0.17,
          varianceStatus: 'WITHIN_TOLERANCE',
          deliveryCount: 1,
          lastDeliveryDate: selectedDate,
          fillPercentage: 87.8
        },
        {
          id: '2',
          tankId: 'tank-2',
          tankName: 'Tank 2',
          fuelType: 'Petrol 95',
          capacity: 10000,
          date: selectedDate,
          openingDip: 4200,
          openingBook: 4180,
          deliveries: 0,
          sales: 1850,
          testReturns: 10,
          closingBook: 2340,
          closingDip: 2380,
          variance: 40,
          variancePercentage: 1.71,
          varianceStatus: 'NEEDS_REVIEW',
          deliveryCount: 0,
          fillPercentage: 23.8
        },
        {
          id: '3',
          tankId: 'tank-3',
          tankName: 'Tank 3',
          fuelType: 'Diesel',
          capacity: 15000,
          date: selectedDate,
          openingDip: 12500,
          openingBook: 12480,
          deliveries: 0,
          sales: 3200,
          testReturns: 15,
          closingBook: 9295,
          closingDip: 9250,
          variance: -45,
          variancePercentage: -0.48,
          varianceStatus: 'WITHIN_TOLERANCE',
          deliveryCount: 0,
          fillPercentage: 61.7
        },
        {
          id: '4',
          tankId: 'tank-4',
          tankName: 'Tank 4',
          fuelType: 'Diesel',
          capacity: 15000,
          date: selectedDate,
          openingDip: 2800,
          openingBook: 2750,
          deliveries: 12000,
          sales: 4500,
          testReturns: 20,
          closingBook: 10270,
          closingDip: 10150,
          variance: -120,
          variancePercentage: -1.17,
          varianceStatus: 'NEEDS_REVIEW',
          deliveryCount: 1,
          lastDeliveryDate: selectedDate,
          fillPercentage: 67.7
        },
        {
          id: '5',
          tankId: 'tank-5',
          tankName: 'Tank 5',
          fuelType: 'Kerosene',
          capacity: 5000,
          date: selectedDate,
          openingDip: 1200,
          openingBook: 1180,
          deliveries: 0,
          sales: 150,
          testReturns: 5,
          closingBook: 1035,
          closingDip: 980,
          variance: -55,
          variancePercentage: -5.31,
          varianceStatus: 'CRITICAL',
          deliveryCount: 0,
          fillPercentage: 19.6
        }
      ]

      setTankMovements(tankMovements)

    } catch (err) {
      setError('Failed to generate tank movement report')
    } finally {
      setLoading(false)
    }
  }

  const printReport = () => {
    // Stub for printing
    window.print()
  }

  const exportToPDF = () => {
    if (!selectedStation || tankMovements.length === 0) {
      alert('Please select a station and generate a report first')
      return
    }
    
    const station = stations.find(s => s.id === selectedStation)
    const stationName = station?.name || 'Unknown Station'
    const dateStr = selectedDate.toISOString().split('T')[0]
    
    exportTankReportPDF(tankMovements, stationName, dateStr)
  }

  const getVarianceColor = (percentage: number) => {
    if (Math.abs(percentage) <= 1.0) return 'text-green-600'
    if (Math.abs(percentage) <= 3.0) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WITHIN_TOLERANCE': return 'bg-green-100 text-green-800'
      case 'NEEDS_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WITHIN_TOLERANCE': return <CheckCircle className="h-4 w-4" />
      case 'NEEDS_REVIEW': return <AlertTriangle className="h-4 w-4" />
      case 'CRITICAL': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const getFillColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const tankColumns: Column<TankMovement>[] = [
    {
      key: 'tankName' as keyof TankMovement,
      title: 'Tank',
      render: (value: unknown, row: TankMovement) => (
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
      key: 'capacity' as keyof TankMovement,
      title: 'Capacity',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{(value as number)?.toLocaleString() || 0}L</span>
      )
    },
    {
      key: 'openingDip' as keyof TankMovement,
      title: 'Opening',
      render: (value: unknown, row: TankMovement) => (
        <div className="text-center">
          <div className="font-mono text-sm">Dip: {(value as number)?.toLocaleString() || 0}L</div>
          <div className="font-mono text-xs text-gray-500">Book: {row.openingBook?.toLocaleString() || 0}L</div>
        </div>
      )
    },
    {
      key: 'deliveries' as keyof TankMovement,
      title: 'Deliveries',
      render: (value: unknown, row: TankMovement) => (
        <div className="text-center">
          <div className="font-mono font-semibold text-green-600">
            +{(value as number)?.toLocaleString() || 0}L
          </div>
          {row.deliveryCount > 0 && (
            <div className="text-xs text-gray-500">{row.deliveryCount} delivery</div>
          )}
        </div>
      )
    },
    {
      key: 'sales' as keyof TankMovement,
      title: 'Sales',
      render: (value: unknown) => (
        <div className="font-mono font-semibold text-red-600">
          -{(value as number)?.toLocaleString() || 0}L
        </div>
      )
    },
    {
      key: 'testReturns' as keyof TankMovement,
      title: 'Test Returns',
      render: (value: unknown) => (
        <div className="font-mono font-semibold text-blue-600">
          +{(value as number)?.toLocaleString() || 0}L
        </div>
      )
    },
    {
      key: 'closingDip' as keyof TankMovement,
      title: 'Closing',
      render: (value: unknown, row: TankMovement) => (
        <div className="text-center">
          <div className="font-mono text-sm">Dip: {(value as number)?.toLocaleString() || 0}L</div>
          <div className="font-mono text-xs text-gray-500">Book: {row.closingBook?.toLocaleString() || 0}L</div>
        </div>
      )
    },
    {
      key: 'variance' as keyof TankMovement,
      title: 'Variance',
      render: (value: unknown, row: TankMovement) => (
        <div className="text-center">
          <div className={`font-mono font-semibold ${getVarianceColor(row.variancePercentage)}`}>
            {(value as number) >= 0 ? '+' : ''}{(value as number)?.toLocaleString() || 0}L
          </div>
          <div className={`text-xs ${getVarianceColor(row.variancePercentage)}`}>
            {row.variancePercentage >= 0 ? '+' : ''}{row.variancePercentage.toFixed(2)}%
          </div>
        </div>
      )
    },
    {
      key: 'fillPercentage' as keyof TankMovement,
      title: 'Fill Level',
      render: (value: unknown) => (
        <div className="text-center">
          <div className={`font-semibold ${getFillColor(value as number)}`}>
            {(value as number)?.toFixed(1) || 0}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${
                (value as number) >= 80 ? 'bg-green-500' :
                (value as number) >= 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, value as number))}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      key: 'varianceStatus' as keyof TankMovement,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          <div className="flex items-center gap-1">
            {getStatusIcon(value as string)}
            <span>{(value as string)?.replace('_', ' ') || 'Unknown'}</span>
          </div>
        </Badge>
      )
    }
  ]

  // Calculate summary statistics
  const totalTanks = tankMovements.length
  const tanksWithinTolerance = tankMovements.filter(t => t.varianceStatus === 'WITHIN_TOLERANCE').length
  const tanksNeedingReview = tankMovements.filter(t => t.varianceStatus === 'NEEDS_REVIEW').length
  const criticalTanks = tankMovements.filter(t => t.varianceStatus === 'CRITICAL').length
  const totalVariance = tankMovements.reduce((sum, t) => sum + Math.abs(t.variance), 0)
  const lowFillTanks = tankMovements.filter(t => t.fillPercentage < 30).length

  return (
    <div className="space-y-6 p-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">Tank Movement Report</h1>
        <div className="flex gap-2">
          <Button onClick={printReport} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="print:hidden">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Generate Tank Movement Report" className="print:hidden">
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

      {tankMovements.length > 0 && (
        <div className="space-y-6">
          {/* Print Header */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">Tank Movement & Variance Report</h1>
            <p className="text-gray-600">
              {stations.find(s => s.id === selectedStation)?.name} - {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">Total Tanks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{totalTanks}</div>
                <div className="text-xs text-gray-500">Active tanks monitored</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Within Tolerance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{tanksWithinTolerance}</div>
                <div className="text-xs text-gray-500">{totalTanks > 0 ? ((tanksWithinTolerance / totalTanks) * 100).toFixed(0) : 0}% of tanks</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Need Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{tanksNeedingReview}</div>
                <div className="text-xs text-gray-500">Variance exceeds 1%</div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{criticalTanks}</div>
                <div className="text-xs text-gray-500">Immediate attention required</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Summary */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Total Variance</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {totalVariance.toLocaleString()}L
                  </div>
                  <div className="text-sm text-gray-500">Absolute variance sum</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Low Fill Tanks</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {lowFillTanks}
                  </div>
                  <div className="text-sm text-gray-500">Below 30% capacity</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">Deliveries Today</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {tankMovements.filter(t => t.deliveryCount > 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Tanks received fuel</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tank Movement Table */}
          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Tank Movement & Variance List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={tankMovements}
                columns={tankColumns}
                searchPlaceholder="Search tanks..."
                pagination={false}
                emptyMessage="No tank movement data available."
              />
            </CardContent>
          </Card>

          {/* Alerts for Critical Issues */}
          {criticalTanks > 0 && (
            <Alert className="print:shadow-none print:border">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Variance Alert</AlertTitle>
              <AlertDescription>
                {criticalTanks} tank{criticalTanks > 1 ? 's have' : ' has'} critical variance levels exceeding 3%. 
                Immediate investigation and corrective action required.
              </AlertDescription>
            </Alert>
          )}

          {lowFillTanks > 0 && (
            <Alert className="print:shadow-none print:border">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Fill Level Warning</AlertTitle>
              <AlertDescription>
                {lowFillTanks} tank{lowFillTanks > 1 ? 's are' : ' is'} below 30% capacity. 
                Consider scheduling fuel deliveries to prevent stock-outs.
              </AlertDescription>
            </Alert>
          )}

          {/* Print Footer */}
          <div className="hidden print:block text-center text-sm text-gray-500 mt-8 pt-4 border-t">
            <p>Generated on {new Date().toLocaleString()}</p>
            <p>Tank Movement & Variance Report - Confidential</p>
          </div>
        </div>
      )}
    </div>
  )
}
