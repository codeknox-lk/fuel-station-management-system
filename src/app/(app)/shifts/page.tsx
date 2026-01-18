'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStation } from '@/contexts/StationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { FormCard } from '@/components/ui/FormCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Clock, 
  Users, 
  PlayCircle, 
  StopCircle,
  Calendar,
  TrendingUp,
  AlertCircle,
  Filter,
  X,
  Power
} from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserName } from '@/lib/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Function to format duration in a more readable way
const formatDuration = (hours: number): string => {
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
}

interface ShiftStats {
  activeShifts: number
  todayShifts: number
  totalSales: number
  averageShiftDuration: number
}

export default function ShiftsPage() {
  const router = useRouter()
  const { selectedStation, isAllStations, getSelectedStation } = useStation()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [stats, setStats] = useState<ShiftStats>({
    activeShifts: 0,
    todayShifts: 0,
    totalSales: 0,
    averageShiftDuration: 0
  })
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    openedBy: '',
    minSales: '',
    maxSales: ''
  })
  const [filteredShifts, setFilteredShifts] = useState<Shift[]>([])
  const [closeAllDialogOpen, setCloseAllDialogOpen] = useState(false)
  const [closingAll, setClosingAll] = useState(false)
  const [closeAllError, setCloseAllError] = useState<string | null>(null)
  const [closeAllSuccess, setCloseAllSuccess] = useState<string | null>(null)

  // Handle row click to navigate to shift details
  const handleRowClick = (shift: Shift) => {
    router.push(`/shifts/${shift.id}`)
  }

  const handleCloseAllActiveShifts = async () => {
    try {
      setClosingAll(true)
      setCloseAllError(null)
      setCloseAllSuccess(null)
      
      const url = isAllStations 
        ? '/api/shifts/bulk-close'
        : `/api/shifts/bulk-close`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedBy: getCurrentUserName(),
          stationId: isAllStations ? undefined : selectedStation
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to close shifts')
      }
      
      if (data.failed && data.failed > 0) {
        setCloseAllError(`Closed ${data.closed} shift(s), but ${data.failed} failed. Check console for details.`)
      } else {
        setCloseAllSuccess(`Successfully closed ${data.closed} shift(s).`)
      }
      
      // Refresh shifts list
      await fetchShifts()
      
      // Close dialog after a short delay
      setTimeout(() => {
        setCloseAllDialogOpen(false)
        setCloseAllSuccess(null)
        setCloseAllError(null)
      }, 2000)
    } catch (error) {
      console.error('Error closing all shifts:', error)
      setCloseAllError(error instanceof Error ? error.message : 'Failed to close shifts')
    } finally {
      setClosingAll(false)
    }
  }

  const handleFilterClick = () => {
    setFilterOpen(true)
  }

  const applyFilters = () => {
    let filtered = [...shifts]

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(shift => shift.status === filters.status)
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(shift => new Date(shift.startTime) >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      filtered = filtered.filter(shift => new Date(shift.startTime) <= new Date(filters.dateTo))
    }

    // Opened by filter
    if (filters.openedBy) {
      filtered = filtered.filter(shift => 
        shift.openedBy.toLowerCase().includes(filters.openedBy.toLowerCase())
      )
    }

    // Sales range filter
    if (filters.minSales) {
      filtered = filtered.filter(shift => (shift.totalSales || 0) >= parseInt(filters.minSales))
    }
    if (filters.maxSales) {
      filtered = filtered.filter(shift => (shift.totalSales || 0) <= parseInt(filters.maxSales))
    }

    setFilteredShifts(filtered)
    setFilterOpen(false)
  }

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      openedBy: '',
      minSales: '',
      maxSales: ''
    })
    setFilteredShifts(shifts)
    setFilterOpen(false)
  }

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '' && value !== 'all').length
  }

  useEffect(() => {
    fetchShifts()
  }, [selectedStation])

  useEffect(() => {
    setFilteredShifts(shifts)
  }, [shifts])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const url = isAllStations 
        ? '/api/shifts'
        : `/api/shifts?stationId=${selectedStation}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      // Handle new API response format
      const shiftsData = data.shifts || data // Support both old and new format
      const summary = data.summary || {}
      
      // Transform the data to include station names and use real statistics
      const transformedShifts = shiftsData.map((shift: any) => {
        // Calculate duration
        const start = new Date(shift.startTime)
        const end = shift.endTime ? new Date(shift.endTime) : new Date()
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        
        // Get actual station and template names from relations
        const stationName = shift.station?.name || `Station ${shift.stationId}`
        const templateName = shift.template?.name || `Template ${shift.templateId}`
        
        return {
          ...shift,
          stationName,
          templateName,
          assignmentCount: shift.statistics?.assignmentCount || shift._count?.assignments || 0,
          totalSales: shift.statistics?.totalSales || 0,
          durationHours: Math.round(durationHours * 100) / 100,
          totalLiters: shift.statistics?.totalLiters || 0
        }
      })
      
      setShifts(transformedShifts)
      
      // Use API summary or calculate from real data
      const activeShifts = summary.active || transformedShifts.filter((s: Shift) => s.status === 'OPEN').length
      const today = new Date().toDateString()
      const todayShifts = transformedShifts.filter((s: Shift) => 
        new Date(s.startTime).toDateString() === today
      ).length
      
      // Calculate real sales from closed shifts with actual data
      const closedShifts = transformedShifts.filter((s: Shift) => s.status === 'CLOSED' && s.statistics?.totalSales && s.statistics.totalSales > 0)
      const totalSales = closedShifts.reduce((sum: number, s: Shift) => sum + (s.statistics?.totalSales || 0), 0)
      
      // Calculate average duration from closed shifts with real data
      const closedShiftsWithDuration = transformedShifts.filter((s: Shift) => s.status === 'CLOSED' && s.statistics?.durationHours && s.statistics.durationHours > 0)
      const averageDuration = closedShiftsWithDuration.length > 0 
        ? closedShiftsWithDuration.reduce((sum: number, s: Shift) => sum + (s.statistics?.durationHours || 0), 0) / closedShiftsWithDuration.length
        : 0
      
      setStats({
        activeShifts,
        todayShifts,
        totalSales,
        averageShiftDuration: Math.round(averageDuration * 100) / 100
      })
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const shiftColumns = [
    {
      key: 'stationName' as keyof Shift,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'templateName' as keyof Shift,
      title: 'Template',
      render: (value: unknown) => (
        <Badge variant="outline">{value as string}</Badge>
      )
    },
    {
      key: 'status' as keyof Shift,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        return (
          <Badge variant={status === 'OPEN' ? 'default' : 'secondary'}>
            {status === 'OPEN' ? (
              <><PlayCircle className="h-3 w-3 mr-1" /> Open</>
            ) : (
              <><StopCircle className="h-3 w-3 mr-1" /> Closed</>
            )}
          </Badge>
        )
      }
    },
    {
      key: 'startTime' as keyof Shift,
      title: 'Start Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'endTime' as keyof Shift,
      title: 'End Time',
      render: (value: unknown) => {
        if (!value) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {new Date(value as string).toLocaleString()}
            </span>
          </div>
        )
      }
    },
    {
      key: 'openedBy' as keyof Shift,
      title: 'Opened By',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'assignmentCount' as keyof Shift,
      title: 'Assignments',
      render: (value: unknown) => (
        <Badge variant="outline">{value as number} pumpers</Badge>
      )
    },
    {
      key: 'totalSales' as keyof Shift,
      title: 'Total Sales',
      render: (value: unknown) => {
        if (!value) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
              Rs. {(value as number).toLocaleString()}
            </span>
          </div>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shift Management</h1>
          <p className="text-muted-foreground mt-1">
            {isAllStations 
              ? 'Manage shifts across all stations, assignments, and operations'
              : `Manage shifts for ${getSelectedStation()?.name || 'selected station'}, assignments, and operations`
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/shifts/open">
            <Button className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Open Shift
            </Button>
          </Link>
          <Link href="/shifts/close">
            <Button variant="outline" className="flex items-center gap-2">
              <StopCircle className="h-4 w-4" />
              Close Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeShifts}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayShifts}</div>
            <p className="text-xs text-muted-foreground">Started today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Closed shifts today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.averageShiftDuration)}</div>
            <p className="text-xs text-muted-foreground">Per shift</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Shifts Alert */}
      {stats.activeShifts > 0 && (
        <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <h3 className="font-medium text-green-700 dark:text-green-300">
                {stats.activeShifts} Active Shift{stats.activeShifts > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Monitor ongoing operations and close shifts when complete.
              </p>
            </div>
            <div className="flex gap-2 ml-auto">
              <Link href="/shifts/close">
                <Button size="sm" variant="outline" className="border-green-500/30 dark:border-green-500/50 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/20">
                  Manage Active Shifts
                </Button>
              </Link>
              <Dialog open={closeAllDialogOpen} onOpenChange={setCloseAllDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Power className="h-4 w-4" />
                    Close All Active
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Close All Active Shifts</DialogTitle>
                    <DialogDescription>
                      This will close all {stats.activeShifts} active shift{stats.activeShifts > 1 ? 's' : ''}. 
                      Open assignments will be automatically closed. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {closeAllError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{closeAllError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {closeAllSuccess && (
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        {closeAllSuccess}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> This will:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      <li>Close all open assignments for each shift</li>
                      <li>Set the end time to the current time</li>
                      <li>Calculate statistics from meter readings</li>
                      <li>Update tank levels based on sales</li>
                      <li>Set declared amounts to zero (you can update these later if needed)</li>
                    </ul>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCloseAllDialogOpen(false)
                        setCloseAllError(null)
                        setCloseAllSuccess(null)
                      }}
                      disabled={closingAll}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleCloseAllActiveShifts}
                      disabled={closingAll}
                    >
                      {closingAll ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Closing...
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Close All Shifts
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      )}

      {/* Shifts Table */}
      <FormCard 
        title="Recent Shifts" 
        description="View and manage all station shifts"
      >
        <div className="space-y-4">
          {/* Filter Button with Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFilterClick}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
              {getActiveFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 dark:text-red-400 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <DataTable
            data={filteredShifts}
            columns={shiftColumns}
            searchable={true}
            searchPlaceholder="Search shifts..."
            pagination={true}
            pageSize={10}
            emptyMessage="No shifts found"
            onRowClick={handleRowClick}
          />
        </div>
      </FormCard>

      {/* Filter Modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Shifts
            </DialogTitle>
            <DialogDescription>
              Apply filters to find specific shifts based on your criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opened By Filter */}
            <div className="space-y-2">
              <Label htmlFor="openedBy">Opened By</Label>
              <Input
                id="openedBy"
                placeholder="Enter name..."
                value={filters.openedBy}
                onChange={(e) => setFilters(prev => ({ ...prev, openedBy: e.target.value }))}
              />
            </div>

            {/* Date From Filter */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>

            {/* Date To Filter */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            {/* Min Sales Filter */}
            <div className="space-y-2">
              <Label htmlFor="minSales">Min Sales (Rs.)</Label>
              <Input
                id="minSales"
                type="number"
                placeholder="0"
                value={filters.minSales}
                onChange={(e) => setFilters(prev => ({ ...prev, minSales: e.target.value }))}
              />
            </div>

            {/* Max Sales Filter */}
            <div className="space-y-2">
              <Label htmlFor="maxSales">Max Sales (Rs.)</Label>
              <Input
                id="maxSales"
                type="number"
                placeholder="No limit"
                value={filters.maxSales}
                onChange={(e) => setFilters(prev => ({ ...prev, maxSales: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <Button variant="outline" onClick={() => setFilterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
