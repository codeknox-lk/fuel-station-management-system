'use client'

import { useState, useEffect } from 'react'
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
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { NumberInput } from '@/components/inputs/NumberInput'
import { ClipboardCheck, Fuel, TrendingUp, Clock } from 'lucide-react'

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
  lastReading?: number
}

interface MeterAudit {
  id: string
  stationId: string
  nozzleId: string
  auditTime: string
  meterReading: number
  previousReading: number
  deltaLitres: number
  auditedBy: string
}

export default function AuditsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [audits, setAudits] = useState<MeterAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
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
        
        setStations(stationsData)
        setAudits(auditsData)
      } catch (err) {
        setError('Failed to load data')
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
          setNozzles(nozzlesData)
          
          // Initialize readings with last known values
          const readings: Record<string, number> = {}
          nozzlesData.forEach((nozzle: Nozzle) => {
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
            stationId: selectedStation,
            nozzleId,
            auditTime: auditTime.toISOString(),
            meterReading: reading,
            auditedBy
          })
        })
      )

      await Promise.all(auditPromises)

      // Reload audits
      const res = await fetch('/api/audits/meter?limit=10')
      const auditsData = await res.json()
      setAudits(auditsData)

      setSuccess('Meter audit recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to record audit')
    } finally {
      setLoading(false)
    }
  }

  const auditColumns = [
    {
      key: 'auditTime' as keyof MeterAudit,
      title: 'Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'nozzleId' as keyof MeterAudit,
      title: 'Nozzle',
      render: (value: unknown) => {
        const nozzle = nozzles.find(n => n.id === value as string)
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{nozzle?.nozzleNumber || (value as string)}</span>
            {nozzle && <Badge variant="outline">{nozzle.fuelType}</Badge>}
          </div>
        )
      }
    },
    {
      key: 'previousReading' as keyof MeterAudit,
      title: 'Previous',
      render: (value: unknown) => {
        const numValue = value as number
        return (
          <span className="font-mono text-sm">
            {numValue != null ? numValue.toLocaleString() : '-'}
          </span>
        )
      }
    },
    {
      key: 'meterReading' as keyof MeterAudit,
      title: 'Current',
      render: (value: unknown) => {
        const numValue = value as number
        return (
          <span className="font-mono text-sm font-semibold">
            {numValue != null ? numValue.toLocaleString() : '-'}
          </span>
        )
      }
    },
    {
      key: 'deltaLitres' as keyof MeterAudit,
      title: 'Delta (L)',
      render: (value: unknown) => {
        const numValue = value as number
        if (numValue == null) {
          return <span className="text-gray-400">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <TrendingUp className={`h-4 w-4 ${numValue >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`font-mono font-semibold ${numValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {numValue.toLocaleString()}
            </span>
          </div>
        )
      }
    },
    {
      key: 'auditedBy' as keyof MeterAudit,
      title: 'Audited By',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Meter Audits</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
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
                      <Fuel className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{nozzle.nozzleNumber}</span>
                      <Badge variant="outline">{nozzle.fuelType}</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-600">
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

      <FormCard title="Recent Audits" description="Latest meter audit records">
        {audits.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No audits recorded yet</p>
            <p className="text-sm">Record your first meter audit above</p>
          </div>
        ) : (
          <DataTable
            data={audits}
            columns={auditColumns}
            searchable={true}
            pagination={true}
            pageSize={10}
          />
        )}
      </FormCard>
    </div>
  )
}
