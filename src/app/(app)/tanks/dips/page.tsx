'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Droplets, Clock, AlertCircle, CheckCircle, Plus, ArrowLeft, RefreshCw } from 'lucide-react'
import { depthToVolume, getTankCapacityLabel, validateDepth, getMaxDepth } from '@/lib/tank-calibration'



interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
}

interface Tank {
  id: string
  stationId: string
  tankNumber: string
  fuelId: string
  fuel?: Fuel
  capacity: number
  currentLevel: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

interface TankDip {
  id: string
  tankId: string
  tankNumber?: string
  fuelId?: string
  fuel?: Fuel
  dipLitres: number
  dipTime: string
  recordedBy: string
  variance?: number
  variancePercentage?: number
  createdAt: string
}

interface ActiveShift {
  id: string
  startTime: string
  template: {
    name: string
  }
  assignments: Array<{
    id: string
    pumperName: string
    nozzle: {
      id: string
      nozzleNumber: string
      tank: {
        id: string
        tankNumber: string
        fuelId: string
        fuel?: Fuel
      }
    }
    startMeterReading: number
  }>
}

interface PumpReading {
  assignmentId: string
  nozzleId: string
  tankId: string
  startMeterReading: number
  currentMeter: string
  fuelUsed: number
}

export default function TankDipsPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const { toast } = useToast()

  const [tanks, setTanks] = useState<Tank[]>([])
  const [recentDips, setRecentDips] = useState<TankDip[]>([])
  const [loading, setLoading] = useState(true)
  // const [date, setDate] = useState<Date>(new Date())

  // Tip: dipDepth was missing
  const [selectedTank, setSelectedTank] = useState<string>('')
  const [dipDepth, setDipDepth] = useState('')

  // Dialog states
  // const [isAddDipOpen, setIsAddDipOpen] = useState(false)
  // const [isEditDipOpen, setIsEditDipOpen] = useState(false)
  // const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [dipLitres, setDipLitres] = useState('')
  const [dipTime, setDipTime] = useState<Date | undefined>(new Date())

  // Dip details dialog state
  const [selectedDip, setSelectedDip] = useState<TankDip | null>(null)
  const [showDipDetails, setShowDipDetails] = useState(false)

  // Active shifts state
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [pumpReadings, setPumpReadings] = useState<PumpReading[]>([])
  const [updatedTankLevels, setUpdatedTankLevels] = useState<Record<string, number>>({})
  const [showUpdatedLevels, setShowUpdatedLevels] = useState(false)

  // Load initial data (recent dips)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const dipsRes = await fetch('/api/tanks/dips?limit=10')
        if (dipsRes.ok) {
          const dipsData = await dipsRes.json()
          setRecentDips(dipsData)
        }
      } catch (error) {
        console.error('Failed to load initial data', error)
        toast({
          title: "Error",
          description: "Failed to load recent dips",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Load tanks when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadTanks = async () => {
        try {
          setLoading(true)
          const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
          const tanksData = await response.json()
          setTanks(tanksData)
        } catch {
          toast({
            title: "Error",
            description: "Failed to load tanks",
            variant: "destructive"
          })
        } finally {
          setLoading(false)
        }
      }

      loadTanks()
    } else {
      setTanks([])
      setActiveShifts([])
      setPumpReadings([])
      setShowUpdatedLevels(false)
      // If no station is selected, we shouldn't be in a loading state for tanks
      setLoading(false)
    }
  }, [selectedStation, toast])

  const loadActiveShifts = useCallback(async () => {
    if (!selectedStation || !dipTime) return

    try {
      setLoadingShifts(true)

      const dipTimeISO = dipTime.toISOString()

      const response = await fetch(
        `/api/shifts?stationId=${selectedStation}&activeAt=${dipTimeISO}&includeAssignments=true`
      )

      if (response.ok) {
        const data = await response.json()
        const shiftsData = Array.isArray(data) ? data : data.shifts || []
        setActiveShifts(shiftsData)

        // Initialize pump readings for all nozzles in active shifts
        const initialReadings: PumpReading[] = []
        shiftsData.forEach((shift: ActiveShift) => {
          shift.assignments.forEach(assignment => {
            initialReadings.push({
              assignmentId: assignment.id,
              nozzleId: assignment.nozzle.id,
              tankId: assignment.nozzle.tank.id,
              startMeterReading: assignment.startMeterReading,
              currentMeter: '',
              fuelUsed: 0
            })
          })
        })
        setPumpReadings(initialReadings)
        setShowUpdatedLevels(false)
      }
    } catch (err) {
      console.error('Failed to load active shifts:', err)
    } finally {
      setLoadingShifts(false)
    }
  }, [selectedStation, dipTime])

  // Load shifts active at dip time when station or dip time changes
  useEffect(() => {
    if (selectedStation && dipTime) {
      loadActiveShifts()
    }
  }, [selectedStation, dipTime, loadActiveShifts])

  const handleCurrentMeterChange = (assignmentId: string, value: string) => {
    setPumpReadings(prev => prev.map(reading => {
      if (reading.assignmentId === assignmentId) {
        const currentMeter = parseFloat(value) || 0
        const fuelUsed = Math.max(0, currentMeter - reading.startMeterReading)
        return {
          ...reading,
          currentMeter: value,
          fuelUsed
        }
      }
      return reading
    }))
    setShowUpdatedLevels(false)
  }

  const [updatingStock, setUpdatingStock] = useState(false)

  const updateTankStock = async () => {
    if (tanks.length === 0 || pumpReadings.length === 0) return

    const tankFuelUsed: Record<string, number> = {}

    pumpReadings.forEach(reading => {
      if (reading.currentMeter && reading.fuelUsed > 0) {
        if (!tankFuelUsed[reading.tankId]) {
          tankFuelUsed[reading.tankId] = 0
        }
        tankFuelUsed[reading.tankId] += reading.fuelUsed
      }
    })

    const updated: Record<string, number> = {}
    const tankUpdates: Array<{ tankId: string; newLevel: number }> = []

    tanks.forEach(tank => {
      const fuelUsed = tankFuelUsed[tank.id] || 0
      const currentLevel = tank.currentLevel || 0
      const newLevel = Math.max(0, currentLevel - fuelUsed)
      updated[tank.id] = newLevel

      // Only include tanks that have changed
      if (fuelUsed > 0) {
        tankUpdates.push({
          tankId: tank.id,
          newLevel
        })
      }
    })

    setUpdatedTankLevels(updated)
    setShowUpdatedLevels(true)

    // Update tank stock in database
    if (tankUpdates.length > 0) {
      try {
        setUpdatingStock(true)
        const response = await fetch('/api/tanks/update-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tankUpdates,
            performedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update tank stock')
        }

        // Small delay to ensure database transaction is committed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Reload tanks to get updated stock FIRST
        const tanksRes = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (!tanksRes.ok) {
          throw new Error('Failed to reload tank data')
        }
        const tanksData = await tanksRes.json()

        // Force state update
        setTanks([])
        await new Promise(resolve => setTimeout(resolve, 50))
        setTanks(tanksData)

        // Update the updatedTankLevels with fresh data from server
        const freshUpdated: Record<string, number> = {}
        tanksData.forEach((tank: Tank) => {
          freshUpdated[tank.id] = tank.currentLevel || 0
        })
        setUpdatedTankLevels(freshUpdated)


        // Then show success message
        toast({
          title: "Success",
          description: `Successfully updated stock levels for ${tankUpdates.length} tank(s). Tank levels refreshed.`
        })

      } catch (err) {
        toast({
          title: "Error",
          description: (err as Error).message || 'Failed to update tank stock',
          variant: "destructive"
        })
      } finally {
        setUpdatingStock(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStation || !selectedTank || !dipLitres || !dipTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/tanks/dips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          tankId: selectedTank,
          reading: parseFloat(dipLitres),
          dipDate: dipTime.toISOString()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record tank dip')
      }

      toast({
        title: "Success",
        description: "Tank dip recorded successfully!"
      })

      // Reset form
      setSelectedTank('')
      setDipDepth('')
      setDipLitres('')
      setDipTime(new Date())
      setActiveShifts([])
      setPumpReadings([])
      setUpdatedTankLevels({})
      setShowUpdatedLevels(false)

      // Reload recent dips
      const dipsRes = await fetch('/api/tanks/dips?limit=10')
      const dipsData = await dipsRes.json()
      setRecentDips(dipsData)

      // Reload tanks to update stock levels
      const tanksRes = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
      const tanksData = await tanksRes.json()
      setTanks(tanksData)
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || 'Failed to record tank dip',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (dip: TankDip) => {
    setSelectedDip(dip)
    setShowDipDetails(true)
  }

  const availableTanks = tanks.filter(t => t.stationId === selectedStation)

  const columns: Column<TankDip>[] = [
    {
      key: 'createdAt' as keyof TankDip,
      title: 'Date & Time',
      render: (value: unknown) => {
        if (!value) return <span className="text-muted-foreground">-</span>
        return new Date(value as (string) || 0).toLocaleString()
      }
    },
    {
      key: 'tankNumber' as keyof TankDip,
      title: 'Tank',
      render: (value: unknown, row: TankDip) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">Tank {(value as string) || 'N/A'}</span>
          {row.fuel && <Badge variant="outline">{row.fuel.icon} {row.fuel.name}</Badge>}
        </div>
      )
    },
    {
      key: 'dipLitres' as keyof TankDip,
      title: 'Dip Reading',
      render: (value: unknown) => {
        if (value == null) return <span className="text-muted-foreground">-</span>
        return <span className="font-semibold">{(value as (number) || 0).toLocaleString()}L</span>
      }
    },
    {
      key: 'variance' as keyof TankDip,
      title: 'Variance',
      render: (value: unknown) => {
        if (value == null || value === undefined) {
          return <span className="text-muted-foreground">-</span>
        }
        const numValue = value as number
        if (isNaN(numValue)) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <span className={`${numValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {numValue > 0 ? '+' : ''}{(numValue || 0).toLocaleString()}L
          </span>
        )
      }
    },
    {
      key: 'variancePercentage' as keyof TankDip,
      title: 'Variance %',
      render: (value: unknown) => {
        const numValue = value as number
        if (numValue == null) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <Badge variant={Math.abs(numValue) <= 2 ? 'default' : 'destructive'}>
            {numValue > 0 ? '+' : ''}{numValue.toFixed(2)}%
          </Badge>
        )
      }
    },
    {
      key: 'recordedBy' as keyof TankDip,
      title: 'Recorded By',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{(value as string) || 'N/A'}</span>
      )
    }
  ]

  // Get adjusted level for variance calculation
  const getAdjustedTankLevel = (tankId: string): number => {
    const tank = tanks.find(t => t.id === tankId)
    if (!tank) return 0

    if (showUpdatedLevels && updatedTankLevels[tankId] !== undefined) {
      return updatedTankLevels[tankId]
    }

    return tank.currentLevel || 0
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/tanks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Droplets className="h-8 w-8 text-orange-600" />
              Tank Dips
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record physical tank measurements and track variances
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {/* Record New Dip Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record New Tank Dip</CardTitle>
          <CardDescription>Enter tank dip details and account for any active shifts at the time of measurement</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="flex flex-col md:flex-row gap-4">
              <div>
                <Label htmlFor="tank">Tank *</Label>
                <Select value={selectedTank} onValueChange={setSelectedTank} disabled={loading || !selectedStation}>
                  <SelectTrigger id="tank">
                    <SelectValue placeholder="Select a tank" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        Tank {tank.tankNumber} - {tank.fuel?.icon} {tank.fuel?.name} ({(tank.capacity || 0).toLocaleString()}L)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dipTime">Dip Time *</Label>
                <DateTimePicker
                  value={dipTime}
                  onChange={setDipTime}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Current Stock Info */}
            {selectedTank && (() => {
              const selectedTankData = tanks.find(t => t.id === selectedTank)
              if (selectedTankData) {
                const systemLevel = selectedTankData.currentLevel || 0
                return (
                  <Card key={`tank-stock-${selectedTankData.id}-${systemLevel}`} className="bg-orange-500/5 border-orange-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                            Current System Stock
                            {updatingStock && <RefreshCw className="h-3 w-3 animate-spin" />}
                          </div>
                          <div className="text-2xl font-bold">{(systemLevel || 0).toLocaleString()}L</div>
                          {selectedTankData.updatedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Last updated: {new Date(selectedTankData.updatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <Droplets className="h-12 w-12 text-orange-600 opacity-20" />
                      </div>
                    </CardContent>
                  </Card>
                )
              }
              return null
            })()}

            {/* Active Shifts Section */}
            {selectedStation && selectedTank && dipTime && (
              loadingShifts ? (
                <Card className="border-muted">
                  <CardContent className="pt-6">
                    <div className="text-center py-4 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Checking for shifts active at {dipTime.toLocaleString()}...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : activeShifts.length > 0 ? (
                <Card className="border-orange-500/30 bg-orange-500/5">
                  <CardHeader>
                    <CardTitle className="text-orange-600 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Active Shifts Detected
                    </CardTitle>
                    <CardDescription>
                      {activeShifts.length} shift(s) were running at {dipTime.toLocaleString()}. Enter current meter readings to calculate actual tank levels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeShifts.map((shift) => (
                      <div key={shift.id} className="border rounded-lg p-4 bg-background">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {shift.template.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Started: {new Date(shift.startTime).toLocaleString()}
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                            Was Active
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {shift.assignments.map((assignment) => {
                            const reading = pumpReadings.find(r => r.assignmentId === assignment.id)
                            if (!reading) return null

                            return (
                              <div key={assignment.id} className="grid grid-cols-5 gap-3 items-end p-3 bg-muted/50 rounded">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Pumper</Label>
                                  <div className="font-medium text-sm">{assignment.pumperName}</div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Nozzle/Tank</Label>
                                  <div className="font-medium text-sm">
                                    Nozzle {assignment.nozzle.nozzleNumber}
                                    <Badge variant="outline" className="ml-1 text-xs">{assignment.nozzle.tank.fuel?.icon} {assignment.nozzle.tank.fuel?.name}</Badge>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Opening</Label>
                                  <div className="text-sm font-semibold">
                                    {(assignment.startMeterReading || 0).toLocaleString()}L
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor={`current-${assignment.id}`} className="text-xs">
                                    Current Meter (L) *
                                  </Label>
                                  <Input
                                    id={`current-${assignment.id}`}
                                    type="number"
                                    step="0.01"
                                    min={assignment.startMeterReading}
                                    value={reading.currentMeter}
                                    onChange={(e) => handleCurrentMeterChange(assignment.id, e.target.value)}
                                    placeholder="Enter"
                                    className={reading.currentMeter && parseFloat(reading.currentMeter) < assignment.startMeterReading ? 'border-red-500 ring-red-500' : ''}
                                  />
                                  {reading.currentMeter && parseFloat(reading.currentMeter) < assignment.startMeterReading && (
                                    <p className="text-[10px] text-red-500 mt-1 font-medium">
                                      Cannot be lower than opening
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Fuel Sold</Label>
                                  <div className={`text-sm font-semibold ${reading.fuelUsed > 0 ? 'text-orange-600' : ''}`}>
                                    {reading.fuelUsed > 0 ? `${(reading.fuelUsed || 0).toLocaleString()}L` : '-'}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={updateTankStock}
                            disabled={
                              pumpReadings.every(r => !r.currentMeter) ||
                              pumpReadings.some(r => r.currentMeter && parseFloat(r.currentMeter) < r.startMeterReading) ||
                              updatingStock
                            }
                          >
                            <Droplets className="mr-2 h-4 w-4" />
                            {updatingStock ? 'Updating...' : 'Update Tank Stock'}
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Show Updated Levels */}
                    {showUpdatedLevels && Object.keys(updatedTankLevels).length > 0 && (
                      <Alert className="border-green-500/50 bg-green-500/10">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-600">Tank Stock Updated</AlertTitle>
                        <AlertDescription>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            {tanks.map(tank => {
                              const originalLevel = tank.currentLevel || 0
                              const updatedLevel = updatedTankLevels[tank.id]

                              if (updatedLevel === undefined) return null

                              const fuelUsed = originalLevel - updatedLevel
                              if (fuelUsed === 0) return null

                              return (
                                <div key={tank.id} className="p-3 bg-background rounded border text-sm">
                                  <div className="font-medium mb-2">
                                    Tank {tank.tankNumber} <Badge variant="outline" className="ml-1 text-xs">{tank.fuel?.icon} {tank.fuel?.name}</Badge>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>System:</span>
                                      <span className="">{(originalLevel || 0).toLocaleString()}L</span>
                                    </div>
                                    <div className="flex justify-between text-orange-600">
                                      <span>Sold:</span>
                                      <span className="">-{(fuelUsed || 0).toLocaleString()}L</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 font-semibold text-green-600">
                                      <span>Actual:</span>
                                      <span className="">{(updatedLevel || 0).toLocaleString()}L</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">No Active Shifts</AlertTitle>
                  <AlertDescription className="text-green-600">
                    No shifts were running at {dipTime.toLocaleString()}. System stock levels are accurate.
                  </AlertDescription>
                </Alert>
              )
            )}

            {/* Dip Reading Input */}
            {selectedTank && (() => {
              const tank = tanks.find(t => t.id === selectedTank)
              if (!tank) return null

              const tankCapacity = tank.capacity as 9000 | 15000 | 22500
              const maxDepth = getMaxDepth(tankCapacity)

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dipDepth">Liquid Depth (cm) *</Label>
                      <Input
                        id="dipDepth"
                        type="number"
                        value={dipDepth}
                        onChange={(e) => {
                          const depth = e.target.value
                          setDipDepth(depth)

                          if (depth && parseFloat(depth) > 0) {
                            const validation = validateDepth(parseFloat(depth), tankCapacity)
                            if (validation.valid) {
                              const volume = depthToVolume(parseFloat(depth), tankCapacity)
                              setDipLitres(volume.toString())
                            }
                          } else {
                            setDipLitres('')
                          }
                        }}
                        placeholder="Enter depth from dipstick"
                        min="0"
                        max={maxDepth}
                        step="0.1"
                        disabled={loading}
                        required
                        className=""
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Using {getTankCapacityLabel(tankCapacity)} chart (max: {maxDepth}cm)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="dipLitres">Calculated Volume (Litres)</Label>
                      <Input
                        id="dipLitres"
                        type="text"
                        value={dipLitres ? (parseFloat(dipLitres) || 0).toLocaleString() : ''}
                        disabled
                        placeholder="Auto-calculated from depth"
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {dipDepth && dipLitres ? (
                          <span className="text-green-600 font-semibold">
                            ✓ {dipDepth}cm = {(parseFloat(dipLitres) || 0).toLocaleString()}L
                          </span>
                        ) : (
                          'Automatically calculated from depth measurement'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Live Variance */}
                  {dipLitres && (() => {
                    const adjustedLevel = getAdjustedTankLevel(selectedTank)
                    if (adjustedLevel > 0) {
                      const dipReading = parseFloat(dipLitres)
                      const variance = dipReading - adjustedLevel
                      const variancePercentage = (variance / adjustedLevel) * 100
                      const isWarning = Math.abs(variancePercentage) > 2

                      return (
                        <Card className={isWarning ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-3">
                              {isWarning ? (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                              <div className={`font-semibold ${isWarning ? 'text-red-600' : 'text-green-600'}`}>
                                {isWarning ? 'Variance Warning' : 'Variance OK'}
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {showUpdatedLevels ? 'Adjusted:' : 'System:'}
                                </span>
                                <span className="font-mono font-semibold">{(adjustedLevel || 0).toLocaleString()}L</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Dip:</span>
                                <span className="font-mono font-semibold">{(dipReading || 0).toLocaleString()}L</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="font-semibold">Variance:</span>
                                <div className="text-right">
                                  <div className={`font-mono font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {variance > 0 ? '+' : ''}{(variance || 0).toLocaleString()}L
                                  </div>
                                  <div className={`text-xs ${isWarning ? 'text-red-600' : 'text-green-600'}`}>
                                    ({variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(2)}%)
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                    return null
                  })()}
                </div>
              )
            })()}

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/tanks')} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !dipLitres}>
                {loading ? 'Recording...' : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Tank Dip
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Dips */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tank Dips</CardTitle>
          <CardDescription>Latest 10 tank dip records</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={recentDips}
            columns={columns}
            loading={loading}
            onRowClick={handleViewDetails}
            emptyMessage="No tank dip records found"
          />
        </CardContent>
      </Card>

      {/* Dip Details Dialog */}
      <Dialog open={showDipDetails} onOpenChange={setShowDipDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tank Dip Details</DialogTitle>
            <DialogDescription>
              Detailed information about this tank dip reading
            </DialogDescription>
          </DialogHeader>
          {selectedDip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tank</Label>
                  <div className="font-semibold">
                    Tank {selectedDip.tankNumber || 'N/A'}
                    {selectedDip.fuel && <Badge variant="outline" className="ml-2">{selectedDip.fuel.icon} {selectedDip.fuel.name}</Badge>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date & Time</Label>
                  <div className="font-semibold">
                    {selectedDip.createdAt ? new Date(selectedDip.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dip Reading</Label>
                  <div className="font-mono font-bold text-lg">
                    {selectedDip.dipLitres != null ? (selectedDip.dipLitres || 0).toLocaleString() : '-'}L
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Variance</Label>
                  <div className={`font-mono font-bold text-lg ${(selectedDip.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(selectedDip.variance || 0) > 0 ? '+' : ''}{selectedDip.variance != null ? (selectedDip.variance || 0).toLocaleString() : '0'}L
                    <span className="text-sm ml-2">
                      ({(selectedDip.variancePercentage || 0) > 0 ? '+' : ''}{selectedDip.variancePercentage != null ? selectedDip.variancePercentage.toFixed(2) : '0'}%)
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Recorded By</Label>
                  <div className="font-semibold">{selectedDip.recordedBy || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDipDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
