'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, Column } from '@/components/ui/DataTable'
import {
  Fuel,
  Plus,
  AlertCircle,
  Droplets,
  Wrench,
  ArrowLeft,
  Trash2,
  Edit,
  Map,
  Activity,
  Gauge
} from 'lucide-react'
import { InfrastructureView } from '@/components/tanks/InfrastructureView'

interface Pump {
  id: string
  pumpNumber: string
  station: { name: string }
  nozzles: { id: string; nozzleNumber: string; tank: { fuelId: string; fuel?: Fuel } }[]
}

interface Nozzle {
  id: string
  nozzleNumber: string
  pump: { pumpNumber: string }
  tank: { fuelId: string; fuel?: Fuel }
  isActive: boolean
}

interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
  isActive?: boolean
}

interface Tank {
  id: string
  fuelId: string
  fuel?: Fuel
  capacity: number
  currentLevel: number
  tankNumber: string
}

export default function TanksSettingsPage() {
  const router = useRouter()
  const { stations, selectedStation: globalSelectedStation } = useStation()
  const { toast } = useToast()

  // Common state - removed local selectedStation as we use globalSelectedStation directly

  // Tank creation/editing dialog state
  const [showTankDialog, setShowTankDialog] = useState(false)
  const [tankLoading, setTankLoading] = useState(false)
  const [editingTankId, setEditingTankId] = useState<string | null>(null)

  // Tank form state
  const [selectedStationForTank, setSelectedStationForTank] = useState('')
  const [fuelId, setFuelId] = useState('')
  const [fuels, setFuels] = useState<Fuel[]>([])
  const [capacity, setCapacity] = useState('')
  const [tankNumber, setTankNumber] = useState('')

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

  // Load pumps, nozzles, and fuels when station changes


  const loadFuels = useCallback(async () => {
    try {
      const response = await fetch('/api/fuels')
      const data = await response.json()
      setFuels(data.filter((f: Fuel) => f.isActive))
    } catch (err) {
      console.error('Failed to load fuels:', err)
    }
  }, [])

  const loadPumps = useCallback(async () => {
    try {
      const response = await fetch(`/api/pumps?stationId=${globalSelectedStation}`)
      const data = await response.json()
      setPumps(data)
    } catch (err) {
      console.error('Failed to load pumps:', err)
    }
  }, [globalSelectedStation])

  const loadNozzles = useCallback(async () => {
    try {
      const response = await fetch(`/api/nozzles?stationId=${globalSelectedStation}`)
      const data = await response.json()
      setNozzles(data)
    } catch (err) {
      console.error('Failed to load nozzles:', err)
    }
  }, [globalSelectedStation])

  const loadTanks = useCallback(async () => {
    try {
      const response = await fetch(`/api/tanks?stationId=${globalSelectedStation}&type=tanks`)
      const data = await response.json()
      setTanks(data)
    } catch (err) {
      console.error('Failed to load tanks:', err)
    }
  }, [globalSelectedStation])

  useEffect(() => {
    loadFuels()
    if (globalSelectedStation) {
      loadPumps()
      loadNozzles()
      loadTanks()
    } else {
      setPumps([])
      setNozzles([])
      setTanks([])
    }
  }, [globalSelectedStation, loadFuels, loadPumps, loadNozzles, loadTanks])

  const resetTankForm = () => {
    setEditingTankId(null)
    setSelectedStationForTank(globalSelectedStation || '')
    setFuelId('')
    setCapacity('')
    setTankNumber('')
  }

  const handleEditTank = (tank: Tank) => {
    setEditingTankId(tank.id)
    setSelectedStationForTank(globalSelectedStation || '') // Assuming tanks belong to current selected station
    setFuelId(tank.fuelId)
    setCapacity(tank.capacity.toString())
    setTankNumber(tank.tankNumber.replace('TANK-', '')) // effective editing
    setShowTankDialog(true)
  }

  const handleSaveTank = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStationForTank || !fuelId || !capacity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setTankLoading(true)

    try {
      const url = editingTankId ? `/api/tanks/${editingTankId}` : '/api/tanks'
      const method = editingTankId ? 'PUT' : 'POST'

      // Auto-format tank number if provided
      let formattedTankNumber = undefined
      if (tankNumber && tankNumber.trim()) {
        const rawNumber = tankNumber.trim()
        if (/^\d+$/.test(rawNumber)) {
          formattedTankNumber = `TANK-${rawNumber.padStart(2, '0')}`
        } else {
          formattedTankNumber = rawNumber
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStationForTank,
          fuelId,
          capacity: parseFloat(capacity),
          tankNumber: formattedTankNumber,
          ...(editingTankId ? {} : { currentLevel: 0 }) // Only set initial level for new tanks
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${editingTankId ? 'update' : 'create'} tank`)
      }

      toast({
        title: "Success",
        description: `Tank ${editingTankId ? 'updated' : 'created'} successfully!`
      })
      setShowTankDialog(false)
      resetTankForm()

      // Refresh tanks if viewing a station
      if (globalSelectedStation) {
        loadTanks()
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : `Failed to ${editingTankId ? 'update' : 'create'} tank`,
        variant: "destructive"
      })
    } finally {
      setTankLoading(false)
    }
  }

  const handleDeleteTank = async (tankId: string) => {
    if (!confirm('Are you sure you want to delete this tank? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/tanks/${tankId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || data.error || 'Failed to delete tank')
      }

      toast({
        title: "Success",
        description: "Tank deleted successfully"
      })
      loadTanks()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete tank",
        variant: "destructive"
      })
    }
  }

  const handleCreatePump = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!globalSelectedStation || !pumpNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setPumpLoading(true)

    try {
      // Auto-format pump number
      let formattedPumpNumber = pumpNumber.trim()

      // If it's just a number (e.g. "1" or "01"), format it as "PUMP-01"
      if (/^\d+$/.test(formattedPumpNumber)) {
        formattedPumpNumber = `PUMP-${formattedPumpNumber.padStart(2, '0')}`
      }

      const response = await fetch('/api/pumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: globalSelectedStation,
          pumpNumber: formattedPumpNumber,
          isActive: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create pump')
      }

      toast({
        title: "Success",
        description: "Pump created successfully!"
      })
      setPumpNumber('')
      loadPumps()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create pump',
        variant: "destructive"
      })
    } finally {
      setPumpLoading(false)
    }
  }

  const handleCreateNozzle = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!globalSelectedStation || !selectedPump || !selectedTank || !nozzleNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setNozzleLoading(true)

    try {
      // Auto-format nozzle number
      let formattedNozzleNumber = nozzleNumber.trim()

      // If it's just a number (e.g. "1" or "01"), format it as "NOZZLE-01"
      if (/^\d+$/.test(formattedNozzleNumber)) {
        formattedNozzleNumber = `NOZZLE-${formattedNozzleNumber.padStart(2, '0')}`
      }

      const response = await fetch('/api/nozzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pumpId: selectedPump,
          tankId: selectedTank,
          nozzleNumber: formattedNozzleNumber,
          isActive: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create nozzle')
      }

      toast({
        title: "Success",
        description: "Nozzle created successfully!"
      })
      setSelectedPump('')
      setSelectedTank('')
      setNozzleNumber('')
      loadNozzles()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create nozzle',
        variant: "destructive"
      })
    } finally {
      setNozzleLoading(false)
    }
  }

  const handleDeletePump = async (pumpId: string) => {
    if (!confirm('Are you sure you want to delete this pump? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/pumps/${pumpId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || data.error || 'Failed to delete pump')
      }

      toast({
        title: "Success",
        description: "Pump deleted successfully"
      })
      loadPumps()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete pump",
        variant: "destructive"
      })
    }
  }

  const handleDeleteNozzle = async (nozzleId: string) => {
    if (!confirm('Are you sure you want to delete this nozzle? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/nozzles/${nozzleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || data.error || 'Failed to delete nozzle')
      }

      toast({
        title: "Success",
        description: "Nozzle deleted successfully"
      })
      loadNozzles()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete nozzle",
        variant: "destructive"
      })
    }
  }

  const tankColumns: Column<Tank>[] = [
    {
      key: 'tankNumber' as keyof Tank,
      title: 'Tank Number',
      render: (value: unknown) => <span className="font-semibold">{value as string}</span>
    },
    {
      key: 'fuel' as keyof Tank,
      title: 'Fuel Type',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span>{(value as Fuel)?.name || 'Unknown'}</span>
        </div>
      )
    },
    {
      key: 'capacity' as keyof Tank,
      title: 'Capacity',
      render: (value: unknown) => (
        <Badge variant="outline">{(value as (number) || 0).toLocaleString()} L</Badge>
      )
    },
    {
      key: 'currentLevel' as keyof Tank,
      title: 'Current Level',
      render: (value: unknown, row: Tank) => {
        const percent = Math.round(((value as number) / row.capacity) * 100)
        let colorClass = 'bg-emerald-500'
        if (percent < 20) colorClass = 'bg-red-500'
        else if (percent < 40) colorClass = 'bg-yellow-500'

        return (
          <div className="space-y-1.5 min-w-[140px]">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Level</span>
              <span className={`${percent < 20 ? 'text-red-600' : 'text-foreground'}`}>{percent}%</span>
            </div>
            <Progress value={percent} className="h-3" indicatorClassName={colorClass} />

            <p className="text-[10px] text-muted-foreground text-right font-mono">
              {(value as (number) || 0).toLocaleString()} / {row.capacity.toLocaleString()} L
            </p>
          </div >
        )
      },
    },
    {
      key: 'id' as keyof Tank,
      title: 'Actions',
      render: (value: unknown, row: Tank) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditTank(row)}
            className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTank(row.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const pumpColumns: Column<Pump>[] = [
    {
      key: 'pumpNumber' as keyof Pump,
      title: 'Pump Number',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
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
          {(value as { nozzleNumber: string; tank: { fuelId: string; fuel?: Fuel } }[]).map((nozzle) => (
            <Badge key={nozzle.nozzleNumber} variant="outline">
              {nozzle.nozzleNumber} → {nozzle.tank.fuel?.name || 'Unknown'}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'id' as keyof Pump,
      title: 'Actions',
      render: (value: unknown, row: Pump) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeletePump(row.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ]

  const nozzleColumns: Column<Nozzle>[] = [
    {
      key: 'pump' as keyof Nozzle,
      title: 'Pump',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold">{(value as { pumpNumber: string }).pumpNumber}</span>
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
          <Badge variant="outline">{(value as { fuelId: string; fuel?: Fuel }).fuel?.name || 'Unknown'}</Badge>
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
    },
    {
      key: 'id' as keyof Nozzle,
      title: 'Actions',
      render: (value: unknown, row: Nozzle) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteNozzle(row.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Standard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tank Management</h1>
            <p className="text-muted-foreground mt-2">
              Monitor stock levels, manage pumps, and configure station infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* Tank Dialog */}
      <Dialog open={showTankDialog} onOpenChange={(open) => {
        setShowTankDialog(open)
        if (!open) resetTankForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTankId ? 'Edit Tank' : 'Create New Tank'}</DialogTitle>
            <DialogDescription>
              {editingTankId ? 'Update tank details' : 'Add a new fuel storage tank to a station'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTank} className="space-y-4">
            <div>
              <Label htmlFor="tank-station">Station *</Label>
              <Select
                value={selectedStationForTank}
                onValueChange={setSelectedStationForTank}
                required
                disabled={!!editingTankId} // Prevent changing station when editing
              >
                <SelectTrigger id="tank-station" className="mt-2">
                  <SelectValue placeholder="Select station" />
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
            <div>
              <Label htmlFor="tankNumber">Tank Number (Optional)</Label>
              <Input
                id="tankNumber"
                value={tankNumber}
                onChange={(e) => setTankNumber(e.target.value)}
                placeholder="01"
                className="mt-2"
                disabled={tankLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-generate (e.g. TANK-01)</p>
            </div>
            <div>
              <Label htmlFor="fuelId">Fuel Type *</Label>
              <Select value={fuelId} onValueChange={setFuelId} required>
                <SelectTrigger id="fuelId" className="mt-2">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {fuels.map(fuel => (
                    <SelectItem key={fuel.id} value={fuel.id}>
                      {fuel.icon} {fuel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="capacity">Capacity (Liters/KL) *</Label>
              <Select
                value={capacity.toString()}
                onValueChange={(val) => setCapacity(val)}
                required
                disabled={tankLoading}
              >
                <SelectTrigger id="capacity" className="mt-2">
                  <SelectValue placeholder="Select calibrated capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9000">9,000 Liters (9 KL)</SelectItem>
                  <SelectItem value="15000">15,000 Liters (15 KL)</SelectItem>
                  <SelectItem value="22500">22,500 Liters (22.5 KL)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only calibrated tank sizes are supported for accurate volume calculation.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTankDialog(false)}
                disabled={tankLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={tankLoading}>
                {tankLoading ? 'Saving...' : (editingTankId ? 'Update Tank' : 'Create Tank')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Infrastructure Setup Section removed - using global station selector */}

      {globalSelectedStation && (
        <Tabs defaultValue="tanks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tanks">
              <Fuel className="mr-2 h-4 w-4" />
              Tanks
            </TabsTrigger>
            <TabsTrigger value="pumps">
              <Wrench className="mr-2 h-4 w-4" />
              Pumps
            </TabsTrigger>
            <TabsTrigger value="nozzles">
              <Droplets className="mr-2 h-4 w-4" />
              Nozzles
            </TabsTrigger>
            <TabsTrigger value="infrastructure">
              <Map className="mr-2 h-4 w-4" />
              Infrastructure View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infrastructure">
            <InfrastructureView stationId={globalSelectedStation} />
          </TabsContent>

          <TabsContent value="tanks" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                resetTankForm()
                setShowTankDialog(true)
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Tank
              </Button>
            </div>
            <FormCard title="Existing Tanks">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background/40 p-4 rounded-lg border border-muted/20 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full text-blue-500"><Activity className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Capacity</p>
                    <p className="text-xl font-bold">{tanks.reduce((acc, t) => acc + t.capacity, 0).toLocaleString()} L</p>
                  </div>
                </div>
                <div className="bg-background/40 p-4 rounded-lg border border-muted/20 flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full text-green-500"><Droplets className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stock</p>
                    <p className="text-xl font-bold">{tanks.reduce((acc, t) => acc + t.currentLevel, 0).toLocaleString()} L</p>
                  </div>
                </div>
                <div className="bg-background/40 p-4 rounded-lg border border-muted/20 flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-full text-orange-500"><Gauge className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Pumps</p>
                    <p className="text-xl font-bold">{pumps.length}</p>
                  </div>
                </div>
              </div>

              <DataTable
                data={tanks}
                columns={tankColumns}
                searchPlaceholder="Search tanks..."
                emptyMessage="No tanks found. Create one to get started!"
                enableExport={true}
                exportFileName="tanks-list"
              />
            </FormCard>
          </TabsContent>

          <TabsContent value="pumps" className="space-y-4">
            <FormCard title="Create New Pump" className="bg-card/50 backdrop-blur-sm border-muted/40">
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
                              <span className="font-semibold">{tank.tankNumber}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{tank.fuel?.name || 'Unknown'}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(tank.capacity || 0).toLocaleString()}L)
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

      {!globalSelectedStation && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Station Selected</AlertTitle>
          <AlertDescription>Please select a station to view and manage its infrastructure.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
