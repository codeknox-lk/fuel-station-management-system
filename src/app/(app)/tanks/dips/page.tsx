'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
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
import { Fuel, Clock, Droplets, AlertCircle, CheckCircle, Plus, ArrowLeft } from 'lucide-react'

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
  currentStock: number
  lastDipTime: string
  lastDipReading: number
}

interface TankDip {
  id: string
  tankId: string
  tankNumber?: string
  fuelType?: string
  dipLitres: number
  dipTime: string
  recordedBy: string
  variance?: number
  variancePercentage?: number
  createdAt: string
}

export default function TankDipsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [recentDips, setRecentDips] = useState<TankDip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [selectedTank, setSelectedTank] = useState('')
  const [dipLitres, setDipLitres] = useState('')
  const [dipTime, setDipTime] = useState<Date>(new Date())

  // Dip details dialog state
  const [selectedDip, setSelectedDip] = useState<any>(null)
  const [showDipDetails, setShowDipDetails] = useState(false)

  // Variance warning state
  const [varianceWarning, setVarianceWarning] = useState<string>('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, dipsRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/tanks/dips?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const dipsData = await dipsRes.json()

        setStations(stationsData)
        setRecentDips(dipsData)
      } catch (err) {
        setError('Failed to load initial data')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedTank || !dipLitres) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    setVarianceWarning('')

    // Check variance between dip reading and current tank level (warn only, don't block)
    const selectedTankData = tanks.find(t => t.id === selectedTank)
    if (selectedTankData && selectedTankData.currentStock > 0) {
      const dipReading = parseFloat(dipLitres)
      const systemLevel = selectedTankData.currentStock
      const variance = dipReading - systemLevel
      const variancePercentage = (variance / systemLevel) * 100

      // Show warning if variance exceeds ±2% but allow recording
      if (Math.abs(variancePercentage) > 2) {
        setVarianceWarning(`⚠️ Warning: Large variance detected! Dip (${dipReading.toLocaleString()}L) vs System (${systemLevel.toLocaleString()}L) = ${variance > 0 ? '+' : ''}${variance.toLocaleString()}L (${variancePercentage > 0 ? '+' : ''}${variancePercentage.toFixed(2)}%). Please verify.`)
      }
    }

    try {
      const response = await fetch('/api/tanks/dips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          tankId: selectedTank,
          reading: parseFloat(dipLitres),
          dipDate: dipTime.toISOString(),
          recordedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record tank dip')
      }

      await response.json()
      
      // Refetch recent dips to get proper variance calculations
      try {
        const dipsRes = await fetch('/api/tanks/dips?limit=10')
        const dipsData = await dipsRes.json()
        setRecentDips(dipsData)
      } catch (fetchErr) {
        console.error('Failed to refetch dips:', fetchErr)
      }
      
      // Reset form
      setSelectedTank('')
      setDipLitres('')
      setDipTime(new Date())
      
      setSuccess('Tank dip recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record tank dip')
    } finally {
      setLoading(false)
    }
  }

  const availableTanks = tanks.filter(tank => tank.stationId === selectedStation)

  const handleDipClick = (dip: any) => {
    setSelectedDip(dip)
    setShowDipDetails(true)
  }

  const dipColumns: Column<any>[] = [
    {
      key: 'dipDate' as keyof any,
      title: 'Time',
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
      key: 'tank' as keyof any,
      title: 'Tank',
      render: (value: unknown, row: any) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.tank?.fuelType?.replace(/_/g, ' ') || 'Unknown'}</span>
          <Badge variant="outline">{row.tank?.fuelType?.replace(/_/g, ' ') || ''}</Badge>
        </div>
      )
    },
    {
      key: 'reading' as keyof any,
      title: 'Dip Reading (L)',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-mono font-semibold">
            {(value as number)?.toLocaleString() || 0}L
          </span>
        </div>
      )
    },
    {
      key: 'variance' as keyof TankDip,
      title: 'Variance (L)',
      render: (value: unknown) => {
        const numValue = value as number
        if (numValue == null) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            {numValue >= 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-mono font-semibold ${numValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {numValue > 0 ? '+' : ''}{numValue.toLocaleString()}L
            </span>
          </div>
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
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/tanks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Tank Dips</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {varianceWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Variance Warning</AlertTitle>
          <AlertDescription>{varianceWarning}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Record New Tank Dip">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station">Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation} disabled={loading}>
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tank">Tank</Label>
              <Select value={selectedTank} onValueChange={setSelectedTank} disabled={loading || !selectedStation}>
                <SelectTrigger id="tank">
                  <SelectValue placeholder="Select a tank" />
                </SelectTrigger>
                <SelectContent>
                  {availableTanks.map((tank) => (
                    <SelectItem key={tank.id} value={tank.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Tank {tank.tankNumber}</span>
                        <Badge variant="outline">{tank.fuelType}</Badge>
                        <span className="text-xs text-muted-foreground">
                          (Cap: {tank.capacity.toLocaleString()}L)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dipLitres">Dip Reading (Litres)</Label>
              <Input
                id="dipLitres"
                type="number"
                value={dipLitres}
                onChange={(e) => setDipLitres(e.target.value)}
                placeholder="Enter dip reading in litres"
                min="0"
                step="0.1"
                disabled={loading}
                required
              />
              {/* Live variance indicator */}
              {dipLitres && selectedTank && tanks.length > 0 && (() => {
                const selectedTankData = tanks.find(t => t.id === selectedTank)
                if (selectedTankData && selectedTankData.currentStock > 0) {
                  const dipReading = parseFloat(dipLitres)
                  const systemLevel = selectedTankData.currentStock
                  const variance = dipReading - systemLevel
                  const variancePercentage = (variance / systemLevel) * 100
                  const isWarning = Math.abs(variancePercentage) > 2

                  return (
                    <div className={`mt-2 p-2 rounded-lg border-2 ${
                      isWarning ? 'border-orange-500/30 dark:border-orange-500/50 bg-orange-500/10 dark:bg-orange-500/20' : 'border-green-500/30 dark:border-green-500/50 bg-green-500/10 dark:bg-green-500/20'
                    }`}>
                      <div className="text-xs font-semibold mb-1">
                        {isWarning ? '⚠️ Variance Warning' : '✅ Variance OK'}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>System: <span className="font-mono">{systemLevel.toLocaleString()}L</span></div>
                        <div>Dip: <span className="font-mono">{dipReading.toLocaleString()}L</span></div>
                        <div className="font-semibold">
                          Diff: <span className={`font-mono ${isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                            {variance > 0 ? '+' : ''}{variance.toLocaleString()}L ({variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
            </div>

            <div>
              <Label htmlFor="dipTime">Dip Time</Label>
              <DateTimePicker
                value={dipTime}
                onChange={setDipTime}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/tanks')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Dip
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Tank Dips" className="p-6">
        <DataTable
          data={recentDips}
          columns={dipColumns}
          searchPlaceholder="Search tank dips..."
          emptyMessage="No tank dips recorded yet."
          onRowClick={handleDipClick}
        />
      </FormCard>

      {/* Dip Details Dialog */}
      <Dialog open={showDipDetails} onOpenChange={setShowDipDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Tank Dip Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this tank dip
            </DialogDescription>
          </DialogHeader>

          {selectedDip && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Tank</Label>
                  <div className="font-semibold">
                    {selectedDip.tank?.fuelType?.replace(/_/g, ' ') || 'Unknown'}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Station</Label>
                  <div className="font-medium">{selectedDip.station?.name || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dip Reading</Label>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedDip.reading?.toLocaleString() || 0}L
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Recorded By</Label>
                  <div className="font-medium">{selectedDip.recordedBy || 'N/A'}</div>
                </div>
              </div>

              {/* System Level vs Dip Reading Variance */}
              {selectedDip.tank && selectedDip.tank.currentLevel && (
                <div className="p-4 border-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    System Level vs Dip Reading
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">System Level</Label>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {selectedDip.tank.currentLevel.toLocaleString()}L
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Dip Reading</Label>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedDip.reading?.toLocaleString() || 0}L
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const systemLevel = selectedDip.tank.currentLevel
                    const dipReading = selectedDip.reading
                    const diff = dipReading - systemLevel
                    const diffPercentage = (diff / systemLevel) * 100
                    const isWarning = Math.abs(diffPercentage) > 2

                    return (
                      <>
                        <div className="mt-3 pt-3 border-t border-blue-500/20 dark:border-blue-500/30">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Difference (L)</Label>
                              <div className={`text-xl font-bold ${
                                isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                              }`}>
                                {diff > 0 ? '+' : ''}{diff.toLocaleString()}L
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Difference %</Label>
                              <div className="text-xl font-bold">
                                <Badge variant={isWarning ? 'destructive' : 'default'} className="text-base px-3 py-1">
                                  {diffPercentage > 0 ? '+' : ''}{diffPercentage.toFixed(2)}%
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-blue-500/20 dark:border-blue-500/30">
                          <div className="flex items-center gap-2">
                            {isWarning ? (
                              <>
                                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                <div>
                                  <div className="font-semibold text-orange-700">⚠️ High Variance</div>
                                  <div className="text-sm text-muted-foreground">
                                    Difference exceeds ±2% tolerance. Please verify reading.
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <div>
                                  <div className="font-semibold text-green-700">✅ Within Tolerance</div>
                                  <div className="text-sm text-muted-foreground">
                                    Difference within acceptable range (±2%)
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Variance Information (Dip to Dip) */}
              {selectedDip.variance !== null && selectedDip.variance !== undefined && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block">Variance</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Variance (L)</Label>
                      <div className={`text-2xl font-bold ${
                        Math.abs(selectedDip.variancePercentage || 0) <= 2 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {selectedDip.variance > 0 ? '+' : ''}{selectedDip.variance.toLocaleString()}L
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Variance %</Label>
                      <div className="text-2xl font-bold">
                        <Badge variant={Math.abs(selectedDip.variancePercentage || 0) <= 2 ? 'default' : 'destructive'} className="text-lg px-3 py-1">
                          {selectedDip.variancePercentage > 0 ? '+' : ''}{selectedDip.variancePercentage?.toFixed(2) || 0}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      {Math.abs(selectedDip.variancePercentage || 0) <= 2 ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <div>
                            <div className="font-semibold text-green-700">
                              {selectedDip.variance === 0 ? 'Perfect Match!' : 'Acceptable'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Variance within acceptable range (±2%)
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <div>
                            <div className="font-semibold text-red-700">High Variance</div>
                            <div className="text-sm text-muted-foreground">
                              Variance exceeds acceptable range (±2%)
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tank Information */}
              {selectedDip.tank && (
                <div className="p-4 border rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Tank Information
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Level</Label>
                      <div className="font-semibold">
                        {selectedDip.tank.currentLevel?.toLocaleString() || 0}L
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Capacity</Label>
                      <div className="font-semibold">
                        {selectedDip.tank.capacity?.toLocaleString() || 0}L
                      </div>
                    </div>
                  </div>
                  {selectedDip.tank.capacity && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-muted-foreground">Fill Level</Label>
                        <span className="text-xs font-medium">
                          {Math.round((selectedDip.tank.currentLevel / selectedDip.tank.capacity) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            (selectedDip.tank.currentLevel / selectedDip.tank.capacity) >= 0.75 ? 'bg-green-500/10 dark:bg-green-500/200' :
                            (selectedDip.tank.currentLevel / selectedDip.tank.capacity) >= 0.5 ? 'bg-blue-500/10 dark:bg-blue-500/30' :
                            (selectedDip.tank.currentLevel / selectedDip.tank.capacity) >= 0.25 ? 'bg-yellow-500/10 dark:bg-yellow-500/200' : 'bg-red-500/10 dark:bg-red-500/200'
                          }`}
                          style={{ width: `${Math.min((selectedDip.tank.currentLevel / selectedDip.tank.capacity) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Dip Time
                  </Label>
                  <div className="font-medium text-sm">
                    {new Date(selectedDip.dipDate).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-1 block">Created At</Label>
                  <div className="font-medium text-sm">
                    {new Date(selectedDip.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedDip.notes && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-2 block">Notes</Label>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedDip.notes}
                  </div>
                </div>
              )}
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

