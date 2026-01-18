'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
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
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { NumberInput } from '@/components/inputs/NumberInput'
import { ClipboardCheck, Fuel, TrendingUp, Clock, User, FileText, Package } from 'lucide-react'
import { getNozzleDisplayWithBadge } from '@/lib/nozzleUtils'

// Group audits into batches (same auditTime + auditedBy within 5 seconds)
function groupAuditsIntoBatches(audits: MeterAudit[]): AuditBatch[] {
  const batchMap = new Map<string, MeterAudit[]>()
  
  // Group audits by auditTime (rounded to nearest second) + auditedBy
  audits.forEach(audit => {
    const auditDate = new Date(audit.auditTime || audit.timestamp || '')
    // Round to nearest 5 seconds to group together
    const roundedTime = new Date(Math.floor(auditDate.getTime() / 5000) * 5000)
    const batchKey = `${roundedTime.toISOString()}_${audit.auditedBy}`
    
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, [])
    }
    batchMap.get(batchKey)!.push(audit)
  })
  
  // Convert to AuditBatch objects
  const batches: AuditBatch[] = Array.from(batchMap.entries()).map(([batchKey, batchAudits]) => {
    // Sort audits by auditTime to get the earliest
    const sortedAudits = batchAudits.sort((a, b) => {
      const timeA = new Date(a.auditTime || a.timestamp || '').getTime()
      const timeB = new Date(b.auditTime || b.timestamp || '').getTime()
      return timeA - timeB
    })
    
    const firstAudit = sortedAudits[0]
    const totalDelta = sortedAudits.reduce((sum, audit) => sum + (audit.deltaLitres || 0), 0)
    
    return {
      id: batchKey,
      auditTime: firstAudit.auditTime || firstAudit.timestamp || '',
      auditedBy: firstAudit.auditedBy,
      audits: sortedAudits,
      nozzleCount: sortedAudits.length,
      totalDelta
    }
  })
  
  // Sort batches by auditTime (newest first)
  return batches.sort((a, b) => {
    const timeA = new Date(a.auditTime).getTime()
    const timeB = new Date(b.auditTime).getTime()
    return timeB - timeA
  })
}

interface Station {
  id: string
  name: string
  city: string
}

interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  fuelType: string
  pumpNumber?: string
  lastReading?: number
}

interface MeterAudit {
  id: string
  stationId?: string
  nozzleId: string
  auditTime: string
  meterReading: number
  previousReading: number
  deltaLitres: number
  auditedBy: string
  timestamp?: string
  variance?: number | null
  status?: string | null
  notes?: string | null
  shiftId?: string | null
  nozzle?: {
    id: string
    nozzleNumber: string
    pump?: {
      id: string
      pumpNumber: string
    }
    tank?: {
      id: string
      fuelType: string
    }
  }
  shift?: {
    id: string
    startTime: string
    endTime?: string
    status: string
  } | null
}

interface AuditBatch {
  id: string // Generated from auditTime + auditedBy
  auditTime: string
  auditedBy: string
  audits: MeterAudit[]
  nozzleCount: number
  totalDelta: number
}

export default function AuditsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [audits, setAudits] = useState<MeterAudit[]>([])
  const [auditBatches, setAuditBatches] = useState<AuditBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<AuditBatch | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [auditTime, setAuditTime] = useState<Date>(new Date())
  const [nozzleReadings, setNozzleReadings] = useState<Record<string, number>>({})
  const [auditedBy, setAuditedBy] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, auditsRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/audits/meter?limit=10')
        ])
        
        const stationsData = await stationsRes.json()
        const auditsData = await auditsRes.json()
        
        // Ensure auditsData is an array
        if (!auditsRes.ok || auditsData.error) {
          console.error('Error loading audits:', auditsData.error || auditsRes.statusText)
          setAudits([])
          setAuditBatches([])
        } else {
          const auditsArray = Array.isArray(auditsData) ? auditsData : []
          setAudits(auditsArray)
          
          // Group audits into batches (same auditTime + auditedBy within 5 seconds)
          const batches = groupAuditsIntoBatches(auditsArray)
          setAuditBatches(batches)
        }
        
        setStations(Array.isArray(stationsData) ? stationsData : [])
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load data')
        setAudits([])
      }
    }
    
    loadData()
  }, [])

  // Load nozzles when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadNozzles = async () => {
        try {
          const res = await fetch(`/api/tanks?stationId=${selectedStation}&type=nozzles`)
          const nozzlesData = await res.json()
          
          // Transform API response to match interface (extract pumpNumber and fuelType from nested objects)
          const transformedNozzles = nozzlesData.map((nozzle: Nozzle & { tank?: { fuelType?: string }, pump?: { pumpNumber?: string }, lastReading?: number }) => ({
            id: nozzle.id,
            pumpId: nozzle.pumpId,
            tankId: nozzle.tankId,
            nozzleNumber: nozzle.nozzleNumber,
            fuelType: nozzle.tank?.fuelType || nozzle.fuelType || 'Unknown',
            pumpNumber: nozzle.pump?.pumpNumber || nozzle.pumpNumber || '?',
            lastReading: nozzle.lastReading
          }))
          
          setNozzles(transformedNozzles)
          
          // Initialize readings with last known values
          const readings: Record<string, number> = {}
          transformedNozzles.forEach((nozzle: Nozzle) => {
            readings[nozzle.id] = nozzle.lastReading || 0
          })
          setNozzleReadings(readings)
        } catch (err) {
          setError('Failed to load nozzles')
        }
      }
      
      loadNozzles()
    }
  }, [selectedStation])

  const handleReadingChange = (nozzleId: string, reading: number) => {
    setNozzleReadings(prev => ({
      ...prev,
      [nozzleId]: reading
    }))
  }

  const handleSubmitAudit = async () => {
    if (!selectedStation || !auditedBy || Object.keys(nozzleReadings).length === 0) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const auditPromises = Object.entries(nozzleReadings).map(([nozzleId, reading]) =>
        fetch('/api/audits/meter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nozzleId,
            reading: reading, // Required field
            meterReading: reading, // Required field
            timestamp: auditTime.toISOString(), // Required field (auditTime is also sent for convenience)
            auditTime: auditTime.toISOString(),
            auditedBy
          })
        })
      )

      await Promise.all(auditPromises)

      // Reload audits
      const res = await fetch('/api/audits/meter?limit=50') // Load more to see batches
      const auditsData = await res.json()
      // Ensure auditsData is an array
      if (!res.ok || auditsData.error) {
        console.error('Error loading audits:', auditsData.error || res.statusText)
        setAudits([])
        setAuditBatches([])
      } else {
        const auditsArray = Array.isArray(auditsData) ? auditsData : []
        setAudits(auditsArray)
        
        // Group audits into batches
        const batches = groupAuditsIntoBatches(auditsArray)
        setAuditBatches(batches)
      }

      setSuccess('Meter audit recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to record audit')
    } finally {
      setLoading(false)
    }
  }

  // Columns for batch table
  const batchColumns = [
    {
      key: 'auditTime' as keyof AuditBatch,
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
      key: 'auditedBy' as keyof AuditBatch,
      title: 'Audited By',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{value as string}</span>
        </div>
      )
    },
    {
      key: 'nozzleCount' as keyof AuditBatch,
      title: 'Nozzles',
      render: (value: unknown, row: AuditBatch) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">
            {row.nozzleCount} nozzle{row.nozzleCount !== 1 ? 's' : ''}
          </Badge>
        </div>
      )
    },
    {
      key: 'totalDelta' as keyof AuditBatch,
      title: 'Total Delta (L)',
      render: (value: unknown, row: AuditBatch) => {
        const numValue = row.totalDelta
        if (numValue == null) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-4 w-4 ${numValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            <span className={`font-mono font-semibold ${numValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {numValue.toLocaleString()}
            </span>
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        <h1 className="text-2xl font-bold">Meter Audits</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/20 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/20">
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <FormCard title="New Meter Audit" description="Record meter readings for all nozzles">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station">Station *</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} - {station.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditTime">Audit Time *</Label>
              <DateTimePicker
                value={auditTime}
                onChange={(date) => setAuditTime(date || new Date())}
                placeholder="Select audit time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="auditedBy">Audited By *</Label>
              <Input
                value={auditedBy}
                onChange={(e) => setAuditedBy(e.target.value)}
                placeholder="Enter auditor name"
              />
            </div>
          </div>

          {selectedStation && nozzles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Meter Readings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nozzles.map((nozzle) => (
                  <div key={nozzle.id} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-muted-foreground" />
                      {(() => {
                        const display = getNozzleDisplayWithBadge({
                          id: nozzle.id,
                          pumpNumber: nozzle.pumpNumber || '?',
                          nozzleNumber: nozzle.nozzleNumber,
                          fuelType: nozzle.fuelType
                        })
                        return (
                          <>
                            <span className="font-medium">{display.label}</span>
                            <Badge variant="outline">{display.badge}</Badge>
                          </>
                        )
                      })()}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">
                        Last Reading: {nozzle.lastReading?.toLocaleString() || 'N/A'}
                      </Label>
                      <NumberInput
                        value={nozzleReadings[nozzle.id] || 0}
                        onChange={(value) => handleReadingChange(nozzle.id, value)}
                        placeholder="Enter current reading"
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmitAudit}
              disabled={loading || !selectedStation || !auditedBy || Object.keys(nozzleReadings).length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Recording...' : 'Record Audit'}
            </Button>
          </div>
        </div>
      </FormCard>

      <FormCard title="Recent Audit Batches" description="Latest meter audit batches - click to view all audits in a batch">
        {auditBatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No audit batches recorded yet</p>
            <p className="text-sm">Record your first meter audit above</p>
          </div>
        ) : (
          <DataTable
            data={auditBatches}
            columns={batchColumns}
            searchable={true}
            pagination={true}
            pageSize={10}
            onRowClick={(batch) => {
              setSelectedBatch(batch as AuditBatch)
              setDialogOpen(true)
            }}
          />
        )}
      </FormCard>

      {/* Audit Batch Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Audit Batch Details
            </DialogTitle>
            <DialogDescription>
              {selectedBatch && `Viewing ${selectedBatch.nozzleCount} audit${selectedBatch.nozzleCount !== 1 ? 's' : ''} from this batch`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-6">
              {/* Batch Summary */}
              <div className="space-y-3 bg-muted p-4 rounded-lg">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Batch Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Audit Time</Label>
                    <p className="mt-1 text-sm font-medium">
                      {new Date(selectedBatch.auditTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Audited By
                    </Label>
                    <p className="mt-1 text-sm font-medium">{selectedBatch.auditedBy}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Nozzles</Label>
                    <p className="mt-1 text-sm font-medium">
                      <Badge variant="secondary">{selectedBatch.nozzleCount} nozzle{selectedBatch.nozzleCount !== 1 ? 's' : ''}</Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Delta</Label>
                    <p className={`mt-1 text-sm font-semibold ${
                      selectedBatch.totalDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {selectedBatch.totalDelta.toLocaleString()} L
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Audits */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  Individual Audits ({selectedBatch.audits.length})
                </h3>
                <div className="space-y-4">
                  {selectedBatch.audits.map((audit, index) => (
                    <div key={audit.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-muted-foreground" />
                          {(() => {
                            const nozzle = nozzles.find(n => n.id === audit.nozzleId)
                            if (nozzle) {
                              const display = getNozzleDisplayWithBadge({
                                id: nozzle.id,
                                pumpNumber: nozzle.pumpNumber || audit.nozzle?.pump?.pumpNumber || '?',
                                nozzleNumber: nozzle.nozzleNumber || audit.nozzle?.nozzleNumber || '?',
                                fuelType: nozzle.fuelType || audit.nozzle?.tank?.fuelType || 'Unknown'
                              })
                              return (
                                <>
                                  <span className="font-medium">{display.label}</span>
                                  <Badge variant="outline">{display.badge}</Badge>
                                </>
                              )
                            }
                            return <span className="font-medium">{audit.nozzleId}</span>
                          })()}
                        </div>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Previous</Label>
                          <p className="mt-1 text-sm font-mono">
                            {audit.previousReading?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Current</Label>
                          <p className="mt-1 text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {audit.meterReading?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Delta (L)</Label>
                          <p className={`mt-1 text-sm font-mono font-semibold ${
                            (audit.deltaLitres || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {audit.deltaLitres?.toLocaleString() || '0'}
                          </p>
                        </div>
                        {audit.variance !== null && audit.variance !== undefined && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Variance</Label>
                            <p className={`mt-1 text-sm font-semibold ${
                              Math.abs(audit.variance) > 5 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            }`}>
                              {audit.variance.toLocaleString()} L
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {audit.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Notes
                          </Label>
                          <p className="mt-1 text-xs text-muted-foreground">{audit.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
