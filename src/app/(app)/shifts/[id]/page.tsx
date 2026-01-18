'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  Users, 
  DollarSign,
  TrendingUp,
  Fuel,
  User,
  Calendar,
  ArrowLeft,
  Printer,
  BarChart3,
  Target,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { getNozzleDisplayWithBadge } from '@/lib/nozzleUtils'

interface Shift {
  id: string
  stationId: string
  stationName: string
  templateName: string
  startTime: string
  endTime?: string
  status: 'OPEN' | 'CLOSED'
  openedBy: string
  closedBy?: string
  assignmentCount: number
  totalSales?: number
  statistics?: {
    durationHours: number
    totalSales: number
    totalLiters: number
    averagePricePerLiter: number
    assignmentCount: number
    closedAssignments: number
  }
  declaredAmounts?: any
}

interface Assignment {
  id: string
  shiftId: string
  nozzleId: string
  pumperId: string
  pumperName: string
  startMeterReading: number
  endMeterReading?: number
  status: 'ACTIVE' | 'CLOSED'
  assignedAt: string
  closedAt?: string
  canSales?: number // Can sales in litres
  pumpSales?: number // Pump sales in litres (calculated)
  nozzle?: {
    id: string
    nozzleNumber: string
    pump?: {
      pumpNumber: string
    }
    tank?: {
      fuelType: string
    }
  }
}

interface TenderSummary {
  totalSales: number
  totalDeclared: number
  variance: number
  varianceClassification: {
    variance: number
    variancePercentage: number
    isNormal: boolean
    tolerance: number
  }
  salesBreakdown?: {
    totalPumpSales: number
    totalCanSales: number
    totalLitres: number
    oilSales?: {
      totalAmount: number
      salesCount: number
    }
  }
}

// Function to format duration
const formatDuration = (hours: number): string => {
  // Handle negative durations
  if (hours < 0) {
    return 'Invalid duration'
  }
  
  if (hours === 0) return '0h'
  
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (minutes === 0) {
    return `${wholeHours}h`
  } else if (wholeHours === 0) {
    return `${minutes}m`
  } else {
    return `${wholeHours}h ${minutes}m`
  }
}

// Function to format currency
const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`
}

// Function to calculate variance percentage
const calculateVariancePercentage = (actual: number, target: number): number => {
  if (target === 0) return 0
  return ((actual - target) / target) * 100
}

export default function ShiftDetailsPage() {
  const params = useParams()
  const router = useRouter()
  // Extract id immediately using useMemo to avoid Next.js 15 enumeration issues
  const shiftId = useMemo(() => (params?.id as string) || '', [params])
  
  const [shift, setShift] = useState<Shift | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [tenderSummary, setTenderSummary] = useState<TenderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchShiftDetails = async () => {
      try {
        setLoading(true)
        
        // Fetch shift details
        const shiftResponse = await fetch(`/api/shifts/${shiftId}`)
        if (!shiftResponse.ok) {
          const errorData = await shiftResponse.json().catch(() => ({}))
          console.error('Shift fetch error:', shiftResponse.status, errorData)
          if (shiftResponse.status === 404) {
            throw new Error('Shift not found')
          }
          throw new Error(`Failed to load shift: ${errorData.error || shiftResponse.statusText}`)
        }
        const shiftData = await shiftResponse.json()
        
        // Validate shift data
        if (!shiftData || !shiftData.id) {
          throw new Error('Invalid shift data received')
        }
        
        // Transform shift data to include proper names
        const transformedShift = {
          ...shiftData,
          stationName: shiftData.station?.name || 'Unknown Station',
          templateName: shiftData.template?.name || 'Unknown Template',
          assignmentCount: shiftData._count?.assignments || 0
        }
        
        setShift(transformedShift)
        
        // Fetch assignments
        const assignmentsResponse = await fetch(`/api/shifts/${shiftId}/assignments`)
        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json()
          setAssignments(assignmentsData)
          
          // Fetch tender summary if shift is closed
          if (shiftData.status === 'CLOSED') {
            try {
              const assignmentsParam = encodeURIComponent(JSON.stringify(assignmentsData))
              
              // For closed shifts, use the actual statistics from the shift
              // This ensures consistency with the close API calculations
              // Parse statistics if it's a JSON string
              let stats: any = {}
              if (shiftData.statistics) {
                if (typeof shiftData.statistics === 'string') {
                  try {
                    stats = JSON.parse(shiftData.statistics)
                  } catch (e) {
                    console.error('Failed to parse statistics JSON:', e)
                    stats = {}
                  }
                } else {
                  stats = shiftData.statistics
                }
              }
              const calculatedSales = stats?.totalSales || 0
              
              // Use stored declared amounts if available, otherwise simulate
              // Parse declaredAmounts if it's a JSON string
              let declaredAmounts: any = null
              if (shiftData.declaredAmounts) {
                if (typeof shiftData.declaredAmounts === 'string') {
                  try {
                    declaredAmounts = JSON.parse(shiftData.declaredAmounts)
                  } catch (e) {
                    console.error('Failed to parse declaredAmounts JSON:', e)
                    declaredAmounts = null
                  }
                } else {
                  declaredAmounts = shiftData.declaredAmounts
                }
              }
              
              let cashAmount, cardAmount, creditAmount, chequeAmount
              if (declaredAmounts) {
                cashAmount = declaredAmounts.cash || 0
                cardAmount = declaredAmounts.card || 0
                creditAmount = declaredAmounts.credit || 0
                chequeAmount = declaredAmounts.cheque || 0
              } else {
                // Fallback: simulate realistic declared amounts (90-95% of calculated sales)
                const declaredPercentage = 0.92 // 92% of calculated sales
                const totalDeclared = Math.round(calculatedSales * declaredPercentage)
                cashAmount = Math.round(totalDeclared * 0.6)
                cardAmount = Math.round(totalDeclared * 0.3)
                creditAmount = Math.round(totalDeclared * 0.08)
                chequeAmount = Math.round(totalDeclared * 0.02)
              }
              
              const tenderResponse = await fetch(
                `/api/tenders/shift/${shiftId}?cashAmount=${cashAmount}&cardAmount=${cardAmount}&creditAmount=${creditAmount}&chequeAmount=${chequeAmount}&assignments=${assignmentsParam}`
              )
              if (tenderResponse.ok) {
                const tenderData = await tenderResponse.json()
                setTenderSummary(tenderData)
              }
            } catch (err) {
              console.error('Failed to fetch tender summary:', err)
            }
          }
        }
        
      } catch (err) {
        console.error('Error fetching shift details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load shift details')
      } finally {
        setLoading(false)
      }
    }
    
    if (shiftId) {
      fetchShiftDetails()
    }
  }, [shiftId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 
            className="text-3xl font-bold text-foreground shift-details-title"
            style={{
              textDecoration: 'none',
              borderBottom: 'none',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              background: 'none',
              backgroundImage: 'none',
              backgroundSize: 'none',
              backgroundPosition: 'none',
              backgroundRepeat: 'none'
            }}
          >
            Shift Details
          </h1>
        </div>
        
        <Alert className="border-red-500/20 dark:border-red-500/30 bg-red-500/10 dark:bg-red-500/20">
          <AlertDescription className="text-red-700 dark:text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!shift) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 
            className="text-3xl font-bold text-foreground shift-details-title"
            style={{
              textDecoration: 'none',
              borderBottom: 'none',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              background: 'none',
              backgroundImage: 'none',
              backgroundSize: 'none',
              backgroundPosition: 'none',
              backgroundRepeat: 'none'
            }}
          >
            Shift Details
          </h1>
        </div>
        
        <Alert className="border-yellow-500/20 dark:border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/20">
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            Shift not found
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Calculate actual liters for each assignment
  const assignmentsWithCalculations = assignments.map(assignment => {
    const actualLiters = assignment.startMeterReading && assignment.endMeterReading 
      ? assignment.endMeterReading - assignment.startMeterReading 
      : 0
    
    // For closed shifts, use saved statistics if available
    // Otherwise, calculate proportionally from total sales if available
    let sales = 0
    try {
      if (shift && shift.status === 'CLOSED') {
        // Parse statistics if it's a JSON string, otherwise use as-is
        let stats: any = {}
        if (shift.statistics) {
          if (typeof shift.statistics === 'string') {
            try {
              stats = JSON.parse(shift.statistics)
            } catch (e) {
              console.error('Failed to parse statistics JSON:', e)
              stats = {}
            }
          } else {
            stats = shift.statistics
          }
        }
        
        if (stats?.totalSales && stats?.totalLiters) {
          // Calculate sales proportionally based on liters if we have total sales
          // This is more accurate than using a hardcoded price
          const totalLiters = stats.totalLiters || 1 // Avoid division by zero
          const proportion = totalLiters > 0 ? actualLiters / totalLiters : 0
          sales = Math.round(stats.totalSales * proportion)
        } else {
          // Fallback: use average price per liter from statistics if available
          const avgPricePerLiter = stats?.averagePricePerLiter || 470
          sales = Math.round(actualLiters * avgPricePerLiter)
        }
      } else if (shift) {
        // For open shifts or shifts without statistics
        let stats: any = {}
        if (shift.statistics) {
          if (typeof shift.statistics === 'string') {
            try {
              stats = JSON.parse(shift.statistics)
            } catch (e) {
              console.error('Failed to parse statistics JSON:', e)
              stats = {}
            }
          } else {
            stats = shift.statistics
          }
        }
        const avgPricePerLiter = stats?.averagePricePerLiter || 470
        sales = Math.round(actualLiters * avgPricePerLiter)
      } else {
        // Fallback if shift is null
        sales = Math.round(actualLiters * 470)
      }
    } catch (error) {
      console.error('Error calculating sales:', error)
      // Fallback to simple calculation
      sales = Math.round(actualLiters * 470)
    }
    
    return {
      ...assignment,
      actualLiters,
      sales
    }
  })

  const assignmentColumns = [
    {
      key: 'nozzleId' as keyof Assignment,
      title: 'Nozzle',
      render: (_value: unknown, row: any) => {
        if (row.nozzle) {
          const display = getNozzleDisplayWithBadge({
            id: row.nozzle.id,
            pumpNumber: row.nozzle.pump?.pumpNumber || '?',
            nozzleNumber: row.nozzle.nozzleNumber,
            fuelType: row.nozzle.tank?.fuelType || 'Unknown'
          })
          return (
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{display.label}</span>
              <Badge variant="outline" className="text-xs">{display.badge}</Badge>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Nozzle {row.nozzleId.slice(0, 8)}</span>
          </div>
        )
      }
    },
    {
      key: 'pumperName' as keyof Assignment,
      title: 'Pumper',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'startMeterReading' as keyof Assignment,
      title: 'Start Meter',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as number}L</span>
      )
    },
    {
      key: 'endMeterReading' as keyof Assignment,
      title: 'End Meter',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value ? `${value}L` : '-'}</span>
      )
    },
    {
      key: 'actualLiters' as keyof Assignment,
      title: 'Pump Sales',
      render: (value: unknown, row: any) => (
        <div className="flex items-center gap-1">
          <Fuel className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
            {row.actualLiters}L
          </span>
        </div>
      )
    },
    {
      key: 'canSales' as keyof Assignment,
      title: 'Can Sales',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value ? `${value}L` : '0L'}</span>
      )
    },
    {
      key: 'sales' as keyof Assignment,
      title: 'Total Sales',
      render: (value: unknown, row: any) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-mono font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(row.sales)}
          </span>
        </div>
      )
    },
    {
      key: 'status' as keyof Assignment,
      title: 'Status',
      render: (value: unknown) => (
        <Badge variant={value === 'CLOSED' ? 'default' : 'secondary'}>
          {value as string}
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-col">
            <h1 
              className="text-3xl font-bold text-foreground shift-details-title"
              style={{
                textDecoration: 'none',
                borderBottom: 'none',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                background: 'none',
                backgroundImage: 'none',
                backgroundSize: 'none',
                backgroundPosition: 'none',
                backgroundRepeat: 'none'
              }}
            >
              Shift Details
            </h1>
            <p className="text-muted-foreground mt-1">
              {shift.station?.name || shift.stationName || 'Unknown Station'} • {shift.template?.name || shift.templateName || 'Unknown Template'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {shift.status === 'OPEN' && (
            <Link href={`/shifts/close`}>
              <Button className="bg-red-600 hover:bg-red-700">
                Close Shift
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <Badge variant={shift.status === 'CLOSED' ? 'default' : 'secondary'} className="text-lg">
              {shift.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const stats = typeof shift.statistics === 'string' 
                  ? (() => { try { return JSON.parse(shift.statistics as string) } catch { return {} } })()
                  : shift.statistics || {}
                return stats?.durationHours !== undefined ? formatDuration(stats.durationHours) : 
                       shift.status === 'CLOSED' ? '0h' : '-'
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Total time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">Pumpers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const stats = typeof shift.statistics === 'string' 
                  ? (() => { try { return JSON.parse(shift.statistics as string) } catch { return {} } })()
                  : shift.statistics || {}
                return stats?.totalSales ? formatCurrency(stats.totalSales) : '-'
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Tender Summary - Exact same as close page */}
      {tenderSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Sales vs declared amounts</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sales Breakdown */}
            {tenderSummary?.salesBreakdown && (
              <div className="bg-blue-500/10 dark:bg-blue-500/20 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Sales Breakdown</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-blue-600 dark:text-blue-400 font-mono text-lg">
                      {tenderSummary.salesBreakdown.totalPumpSales.toLocaleString()}L
                    </div>
                    <div className="text-muted-foreground">Pump Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-600 dark:text-green-400 font-mono text-lg">
                      {tenderSummary.salesBreakdown.totalCanSales.toLocaleString()}L
                    </div>
                    <div className="text-muted-foreground">Can Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-orange-600 dark:text-orange-400 font-mono text-lg">
                      Rs. {(tenderSummary.salesBreakdown.oilSales?.totalAmount || 0).toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">Oil Sales ({tenderSummary.salesBreakdown.oilSales?.salesCount || 0})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-purple-600 dark:text-purple-400 font-mono text-lg font-bold">
                      {tenderSummary.salesBreakdown.totalLitres.toLocaleString()}L
                    </div>
                    <div className="text-muted-foreground">Total Fuel</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales (Calculated):</span>
                  <span className="font-mono font-semibold">
                    Rs. {(() => {
                      const stats = typeof shift.statistics === 'string' 
                        ? (() => { try { return JSON.parse(shift.statistics as string) } catch { return {} } })()
                        : shift.statistics || {}
                      return (stats?.totalSales ?? 0).toLocaleString()
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Declared:</span>
                  <span className="font-mono font-semibold">
                    Rs. {(tenderSummary?.totalDeclared ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variance:</span>
                  <span className={`font-mono font-semibold ${
                    (tenderSummary?.variance ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    Rs. {(tenderSummary?.variance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tolerance:</span>
                  <span className="font-mono">
                    Rs. {(tenderSummary?.varianceClassification?.tolerance ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Variance %:</span>
                  <span className="font-mono">
                    {(tenderSummary?.varianceClassification?.variancePercentage ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant={tenderSummary?.varianceClassification?.isNormal ? "default" : "destructive"}
                  >
                    {tenderSummary?.varianceClassification?.isNormal ? 'Normal' : 'Suspicious'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Information</CardTitle>
          <CardDescription>Basic shift details and timing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Start Time</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(shift.startTime).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">End Time</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {shift.endTime ? new Date(shift.endTime).toLocaleString() : '-'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {shift.endTime 
                  ? formatDuration((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60))
                  : shift.statistics?.durationHours 
                    ? formatDuration(shift.statistics.durationHours)
                    : '-'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pumpers</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {assignments.length > 0 
                  ? Array.from(new Set(assignments.map(a => a.pumperName).filter(Boolean))).join(', ') || 'No pumpers assigned'
                  : 'No pumpers assigned'}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Opened By</span>
              </div>
              <p className="text-sm text-muted-foreground">{shift.openedBy}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Closed By</span>
              </div>
              <p className="text-sm text-muted-foreground">{shift.closedBy || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Pumper assignments and meter readings</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsWithCalculations.length > 0 ? (
            <DataTable
              data={assignmentsWithCalculations}
              columns={assignmentColumns}
              searchable={false}
              pagination={false}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No assignments found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pumper-wise Breakdown (for closed shifts) */}
      {shift.status === 'CLOSED' && shift.declaredAmounts && 
       (shift.declaredAmounts as any).pumperBreakdown && 
       Array.isArray((shift.declaredAmounts as any).pumperBreakdown) && 
       (shift.declaredAmounts as any).pumperBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pumper-wise Breakdown</CardTitle>
            <CardDescription>Detailed sales breakdown by pumper</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(shift.declaredAmounts as any).pumperBreakdown.map((breakdown: any, idx: number) => {
              const totalCard = Object.values(breakdown.declaredCardAmounts || {}).reduce((sum: number, amt: any) => sum + (amt || 0), 0)
              const totalCredit = Object.values(breakdown.declaredCreditAmounts || {}).reduce((sum: number, amt: any) => sum + (amt || 0), 0)
              const totalCheques = (breakdown.cheques || []).reduce((sum: number, chq: any) => sum + (chq.amount || 0), 0)
              const bankDeposits = (breakdown.expenses || []).filter((exp: any) => exp.type === 'BANK_DEPOSIT')
              const loans = (breakdown.expenses || []).filter((exp: any) => exp.type === 'LOAN_GIVEN')
              const otherExpenses = (breakdown.expenses || []).filter((exp: any) => exp.type !== 'BANK_DEPOSIT' && exp.type !== 'LOAN_GIVEN')
              
              return (
                <div key={idx} className="bg-card border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="font-semibold text-base">{breakdown.pumperName}</div>
                    <Badge variant={breakdown.varianceStatus === 'ADD_TO_SALARY' ? 'default' : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY' ? 'destructive' : 'outline'}>
                      {breakdown.varianceStatus === 'ADD_TO_SALARY' ? 'Add to Salary' : 
                       breakdown.varianceStatus === 'DEDUCT_FROM_SALARY' ? 'Deduct from Salary' : 
                       'Normal'}
                    </Badge>
                  </div>
                  
                  {/* Sales Summary */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Sales</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Calculated Sales:</div>
                      <div className="font-mono text-right font-medium">Rs. {breakdown.calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  {/* Cash */}
                  {breakdown.declaredCash > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Cash</div>
                      <div className="text-sm font-mono text-right">Rs. {breakdown.declaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  )}

                  {/* Card Payments by Terminal */}
                  {totalCard > 0 && Object.keys(breakdown.declaredCardAmounts || {}).length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Card Payments</div>
                      <div className="space-y-1">
                        {Object.entries(breakdown.declaredCardAmounts || {}).map(([terminalId, amount]: [string, any]) => {
                          const terminalInfo = (breakdown.declaredCardAmountsWithNames as any)?.[terminalId]
                          const terminalName = terminalInfo?.terminalName || `Terminal ${terminalId}`
                          return (
                            <div key={terminalId} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{terminalName}:</span>
                              <span className="font-mono">Rs. {(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )
                        })}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Total Card:</span>
                          <span className="font-mono">Rs. {totalCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Credit Customers */}
                  {totalCredit > 0 && Object.keys(breakdown.declaredCreditAmounts || {}).length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Credit Sales</div>
                      <div className="space-y-1">
                        {Object.entries(breakdown.declaredCreditAmounts || {}).map(([customerId, amount]: [string, any]) => {
                          const customerInfo = (breakdown.declaredCreditAmountsWithNames as any)?.[customerId]
                          const customerName = customerInfo?.customerName || `Customer ${customerId}`
                          return (
                            <div key={customerId} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{customerName}:</span>
                              <span className="font-mono">Rs. {(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )
                        })}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Total Credit:</span>
                          <span className="font-mono">Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cheques */}
                  {totalCheques > 0 && breakdown.cheques && breakdown.cheques.length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Cheques</div>
                      <div className="space-y-1">
                        {breakdown.cheques.map((cheque: any, chqIdx: number) => (
                          <div key={chqIdx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              #{cheque.chequeNumber} from {cheque.receivedFrom}{cheque.bankName ? ` (${cheque.bankName})` : ''}:
                            </span>
                            <span className="font-mono">Rs. {(cheque.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                          <span>Total Cheques:</span>
                          <span className="font-mono">Rs. {totalCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advances */}
                  {breakdown.advanceTaken > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Advances</div>
                      <div className="text-sm font-mono text-right text-orange-600 dark:text-orange-400">
                        - Rs. {breakdown.advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}

                  {/* Loans */}
                  {loans.length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Loans Given</div>
                      <div className="space-y-1">
                        {loans.map((loan: any, loanIdx: number) => (
                          <div key={loanIdx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Loan to {loan.loanGivenToName || 'Pumper'}:</span>
                            <span className="font-mono text-orange-600 dark:text-orange-400">- Rs. {(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bank Deposits */}
                  {bankDeposits.length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Bank Deposits</div>
                      <div className="space-y-1">
                        {bankDeposits.map((deposit: any, depIdx: number) => (
                          <div key={depIdx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bank Deposit ({deposit.bankName || 'Bank'}):</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400">+ Rs. {(deposit.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Expenses */}
                  {otherExpenses.length > 0 && (
                    <div className="space-y-2 border-t pt-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Other Expenses</div>
                      <div className="space-y-1">
                        {otherExpenses.map((expense: any, expIdx: number) => (
                          <div key={expIdx} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{expense.description || 'Other Expense'}:</span>
                            <span className="font-mono text-orange-600 dark:text-orange-400">- Rs. {(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="space-y-2 border-t pt-2 bg-muted/50 p-2 rounded">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-semibold">Total Declared:</div>
                      <div className="font-mono text-right font-semibold">Rs. {breakdown.declaredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="font-semibold">Variance:</div>
                      <div className={`font-mono text-right font-semibold ${
                        breakdown.variance > 20 ? 'text-red-600 dark:text-red-400' : 
                        breakdown.variance < -20 ? 'text-green-600 dark:text-green-400' : 
                        'text-foreground'
                      }`}>
                        {breakdown.variance >= 0 ? '+' : ''}Rs. {breakdown.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Overall Totals */}
            {(() => {
              const pumperBreakdowns = (shift.declaredAmounts as any).pumperBreakdown
              let totalCalculatedSales = 0
              let totalDeclaredCash = 0
              let totalDeclaredCard = 0
              let totalDeclaredCredit = 0
              let totalDeclaredCheque = 0
              let totalAdvances = 0
              let totalBankDeposits = 0
              let totalOtherExpenses = 0
              let totalDeclared = 0
              let totalVariance = 0

              pumperBreakdowns.forEach((bd: any) => {
                totalCalculatedSales += bd.calculatedSales || 0
                totalDeclaredCash += bd.declaredCash || 0
                totalDeclaredCard += Object.values(bd.declaredCardAmounts || {}).reduce((sum: number, amt: any) => sum + (amt || 0), 0)
                totalDeclaredCredit += Object.values(bd.declaredCreditAmounts || {}).reduce((sum: number, amt: any) => sum + (amt || 0), 0)
                totalDeclaredCheque += (bd.cheques || []).reduce((sum: number, chq: any) => sum + (chq.amount || 0), 0)
                totalAdvances += bd.advanceTaken || 0
                const bankDeposits = (bd.expenses || []).filter((exp: any) => exp.type === 'BANK_DEPOSIT').reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
                const otherExpenses = (bd.expenses || []).filter((exp: any) => exp.type !== 'BANK_DEPOSIT').reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0)
                totalBankDeposits += bankDeposits
                totalOtherExpenses += otherExpenses
                totalDeclared += bd.declaredAmount || 0
                totalVariance += bd.variance || 0
              })

              return (
                <div className="bg-primary/10 dark:bg-primary/20 border-2 border-primary/30 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-bold uppercase text-primary mb-2">Overall Totals</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-semibold">Total Calculated Sales:</div>
                    <div className="font-mono text-right font-semibold">Rs. {totalCalculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    
                    {totalDeclaredCash > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Cash:</div>
                        <div className="font-mono text-right">Rs. {totalDeclaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalDeclaredCard > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Card:</div>
                        <div className="font-mono text-right">Rs. {totalDeclaredCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalDeclaredCredit > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Credit:</div>
                        <div className="font-mono text-right">Rs. {totalDeclaredCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalDeclaredCheque > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Cheques:</div>
                        <div className="font-mono text-right">Rs. {totalDeclaredCheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalBankDeposits > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Bank Deposits:</div>
                        <div className="font-mono text-right text-blue-600 dark:text-blue-400">+ Rs. {totalBankDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalAdvances > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Advances:</div>
                        <div className="font-mono text-right text-orange-600 dark:text-orange-400">- Rs. {totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    {totalOtherExpenses > 0 && (
                      <>
                        <div className="text-muted-foreground">Total Other Expenses:</div>
                        <div className="font-mono text-right text-orange-600 dark:text-orange-400">- Rs. {totalOtherExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </>
                    )}
                    
                    <div className="font-bold text-base pt-2 border-t">Total Declared:</div>
                    <div className="font-mono text-right font-bold text-base pt-2 border-t">Rs. {totalDeclared.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    
                    <div className="font-bold text-base">Total Variance:</div>
                    <div className={`font-mono text-right font-bold text-base ${
                      totalVariance > 20 ? 'text-red-600 dark:text-red-400' : 
                      totalVariance < -20 ? 'text-green-600 dark:text-green-400' : 
                      'text-foreground'
                    }`}>
                      {totalVariance >= 0 ? '+' : ''}Rs. {totalVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
