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
import { Fuel, Clock, Droplets, AlertCircle, CheckCircle, Plus } from 'lucide-react'

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
  const { selectedStation } = useStation()
  const [selectedTank, setSelectedTank] = useState('')
  const [dipLitres, setDipLitres] = useState('')
  const [dipTime, setDipTime] = useState<Date>(new Date())

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

    try {
      const response = await fetch('/api/tanks/dips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId: selectedTank,
          dipLitres: parseFloat(dipLitres),
          dipTime: dipTime.toISOString(),
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record tank dip')
      }

      const newDip = await response.json()
      
      // Add to recent dips list
      setRecentDips(prev => [newDip, ...prev.slice(0, 9)])
      
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

  const dipColumns: Column<TankDip>[] = [
    {
      key: 'dipTime' as keyof TankDip,
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
      key: 'tankNumber' as keyof TankDip,
      title: 'Tank',
      render: (value: unknown, row: TankDip) => {
        const tank = tanks.find(t => t.id === row.tankId)
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{tank?.tankNumber || (value as string)}</span>
            {tank && <Badge variant="outline">{tank.fuelType}</Badge>}
          </div>
        )
      }
    },
    {
      key: 'dipLitres' as keyof TankDip,
      title: 'Dip Reading (L)',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
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
          return <span className="text-gray-400">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            {numValue >= 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={`font-mono font-semibold ${numValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
          return <span className="text-gray-400">-</span>
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
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Tank Dips</h1>

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
                        <span className="text-xs text-gray-500">
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
        />
      </FormCard>
    </div>
  )
}

