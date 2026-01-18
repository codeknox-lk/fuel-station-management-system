'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, Column } from '@/components/ui/DataTable'
import { 
  Settings, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  Fuel,
  Droplets,
  Wrench,
  ArrowLeft
} from 'lucide-react'

interface Pump {
  id: string
  pumpNumber: string
  station: { name: string }
  nozzles: { id: string; nozzleNumber: string; tank: { fuelType: string } }[]
}

interface Nozzle {
  id: string
  nozzleNumber: string
  pump: { pumpNumber: string }
  tank: { fuelType: string }
  isActive: boolean
}

interface Tank {
  id: string
  fuelType: string
  capacity: number
  currentLevel: number
}

export default function InfrastructureSetupPage() {
  const router = useRouter()
  const { stations } = useStation()
  
  // Common state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedStation, setSelectedStation] = useState('')
  
  // Pump state
  const [pumps, setPumps] = useState<Pump[]>([])
  const [pumpNumber, setPumpNumber] = useState('')
  const [pumpLoading, setPumpLoading] = useState(false)
  
  // Nozzle state
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [selectedPump, setSelectedPump] = useState('')
  const [selectedTank, setSelectedTank] = useState('')
  const [nozzleNumber, setNozzleNumber] = useState('')
  const [nozzleLoading, setNozzleLoading] = useState(false)
  
  // Load pumps and nozzles when station changes
  useEffect(() => {
    if (selectedStation) {
      loadPumps()
      loadNozzles()
      loadTanks()
    } else {
      setPumps([])
      setNozzles([])
      setTanks([])
    }
  }, [selectedStation])

  const loadPumps = async () => {
    try {
      const response = await fetch(`/api/pumps?stationId=${selectedStation}`)
      const data = await response.json()
      setPumps(data)
    } catch (err) {
      console.error('Failed to load pumps:', err)
    }
  }

  const loadNozzles = async () => {
    try {
      const response = await fetch(`/api/nozzles?stationId=${selectedStation}`)
      const data = await response.json()
      setNozzles(data)
    } catch (err) {
      console.error('Failed to load nozzles:', err)
    }
  }

  const loadTanks = async () => {
    try {
      const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
      const data = await response.json()
      setTanks(data)
    } catch (err) {
      console.error('Failed to load tanks:', err)
    }
  }

  const handleCreatePump = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !pumpNumber) {
      setError('Please fill in all required fields')
      return
    }

    setPumpLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/pumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          pumpNumber,
          isActive: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create pump')
      }

      setSuccess('Pump created successfully!')
      setPumpNumber('')
      loadPumps()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pump')
    } finally {
      setPumpLoading(false)
    }
  }

  const handleCreateNozzle = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedPump || !selectedTank || !nozzleNumber) {
      setError('Please fill in all required fields')
      return
    }

    setNozzleLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/nozzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pumpId: selectedPump,
          tankId: selectedTank,
          nozzleNumber,
          isActive: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create nozzle')
      }

      setSuccess('Nozzle created successfully!')
      setSelectedPump('')
      setSelectedTank('')
      setNozzleNumber('')
      loadNozzles()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nozzle')
    } finally {
      setNozzleLoading(false)
    }
  }

  const pumpColumns: Column<Pump>[] = [
    {
      key: 'pumpNumber' as keyof Pump,
      title: 'Pump Number',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold">{value as string}</span>
        </div>
      )
    },
    {
      key: 'station' as keyof Pump,
      title: 'Station',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{(value as { name: string }).name}</span>
      )
    },
    {
      key: 'nozzles' as keyof Pump,
      title: 'Nozzles',
      render: (value: unknown) => (
        <div className="flex flex-wrap gap-2">
          {(value as { nozzleNumber: string; tank: { fuelType: string } }[]).map((nozzle) => (
            <Badge key={nozzle.nozzleNumber} variant="outline">
              {nozzle.nozzleNumber} → {nozzle.tank.fuelType.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      )
    }
  ]

  const nozzleColumns: Column<Nozzle>[] = [
    {
      key: 'pump' as keyof Nozzle,
      title: 'Pump',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium">{(value as { pumpNumber: string }).pumpNumber}</span>
        </div>
      )
    },
    {
      key: 'nozzleNumber' as keyof Nozzle,
      title: 'Nozzle',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-semibold">#{value as string}</span>
        </div>
      )
    },
    {
      key: 'tank' as keyof Nozzle,
      title: 'Tank / Fuel Type',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <Badge variant="outline">{(value as { fuelType: string }).fuelType.replace(/_/g, ' ')}</Badge>
        </div>
      )
    },
    {
      key: 'isActive' as keyof Nozzle,
      title: 'Status',
      render: (value: unknown) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Infrastructure Setup</h1>
          <p className="text-muted-foreground">Manage pumps, nozzles, and their connections</p>
        </div>
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

      {/* Station Selection */}
      <FormCard className="p-4">
        <div>
          <Label htmlFor="infra-station">Select Station</Label>
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger id="infra-station" className="mt-2">
              <SelectValue placeholder="Select a station to manage" />
            </SelectTrigger>
            <SelectContent>
              {stations.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormCard>

      {selectedStation && (
        <Tabs defaultValue="pumps" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pumps">
              <Wrench className="mr-2 h-4 w-4" />
              Pumps
            </TabsTrigger>
            <TabsTrigger value="nozzles">
              <Droplets className="mr-2 h-4 w-4" />
              Nozzles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pumps" className="space-y-4">
            <FormCard title="Create New Pump">
              <form onSubmit={handleCreatePump} className="space-y-4">
                <div>
                  <Label htmlFor="pumpNumber">Pump Number *</Label>
                  <Input
                    id="pumpNumber"
                    value={pumpNumber}
                    onChange={(e) => setPumpNumber(e.target.value)}
                    placeholder="P-01"
                    disabled={pumpLoading}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Unique identifier for this pump</p>
                </div>

                <Button type="submit" disabled={pumpLoading}>
                  {pumpLoading ? 'Creating...' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Pump
                    </>
                  )}
                </Button>
              </form>
            </FormCard>

            <FormCard title="Existing Pumps">
              <DataTable
                data={pumps}
                columns={pumpColumns}
                searchPlaceholder="Search pumps..."
                emptyMessage="No pumps found. Create one to get started!"
              />
            </FormCard>
          </TabsContent>

          <TabsContent value="nozzles" className="space-y-4">
            <FormCard title="Create New Nozzle">
              <form onSubmit={handleCreateNozzle} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nozzlePump">Pump *</Label>
                    <Select value={selectedPump} onValueChange={setSelectedPump} disabled={nozzleLoading}>
                      <SelectTrigger id="nozzlePump">
                        <SelectValue placeholder="Select pump" />
                      </SelectTrigger>
                      <SelectContent>
                        {pumps.map((pump) => (
                          <SelectItem key={pump.id} value={pump.id}>
                            {pump.pumpNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="nozzleTank">Tank / Fuel Type *</Label>
                    <Select value={selectedTank} onValueChange={setSelectedTank} disabled={nozzleLoading}>
                      <SelectTrigger id="nozzleTank">
                        <SelectValue placeholder="Select tank" />
                      </SelectTrigger>
                      <SelectContent>
                        {tanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            <div className="flex items-center gap-2">
                              <Fuel className="h-4 w-4" />
                              <span>{tank.fuelType.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-muted-foreground">
                                ({tank.capacity.toLocaleString()}L)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="nozzleNumber">Nozzle Number *</Label>
                    <Input
                      id="nozzleNumber"
                      value={nozzleNumber}
                      onChange={(e) => setNozzleNumber(e.target.value)}
                      placeholder="01"
                      disabled={nozzleLoading}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={nozzleLoading}>
                  {nozzleLoading ? 'Creating...' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Nozzle
                    </>
                  )}
                </Button>
              </form>
            </FormCard>

            <FormCard title="Existing Nozzles">
              <DataTable
                data={nozzles}
                columns={nozzleColumns}
                searchPlaceholder="Search nozzles..."
                emptyMessage="No nozzles found. Create one to connect pumps to tanks!"
              />
            </FormCard>
          </TabsContent>
        </Tabs>
      )}

      {!selectedStation && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Station Selected</AlertTitle>
          <AlertDescription>Please select a station to view and manage its infrastructure.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

