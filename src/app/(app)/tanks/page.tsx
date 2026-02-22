'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Fuel,
  Droplets,
  Truck,
  Wrench,
  Network
} from 'lucide-react'

import { TankWithDetails } from '@/types/db'

// ... existing imports

interface Fuel {
  id: string
  name: string
  icon: string
  code: string
}

// Extend our DB type with the calculated fields used in UI
interface UITank extends TankWithDetails {
  stationName?: string
  fillPercentage: number
  status: 'NORMAL' | 'LOW' | 'CRITICAL'
  lastDipTime: string
  lastDipReading: number
  currentStock: number
}

interface Pump {
  id: string
  pumpNumber: string
  stationId: string
}

interface Nozzle {
  id: string
  nozzleNumber: string
  pump: Pump
}

export default function TanksPage() {
  const router = useRouter()
  const { selectedStation, getSelectedStation } = useStation()

  const [tanks, setTanks] = useState<UITank[]>([])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'LOW': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getFillColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500/60 dark:bg-green-500/70'
    if (percentage >= 50) return 'bg-orange-500/60 dark:bg-orange-500/70'
    if (percentage >= 25) return 'bg-yellow-500/60 dark:bg-yellow-500/70'
    return 'bg-red-500/60 dark:bg-red-500/70'
  }



  interface Dip {
    id: string
    reading: number
    dipDate: string
    recordedBy: string
  }

  interface Delivery {
    id: string
    quantity: number
    supplier: string
    invoiceNumber: string
    deliveryDate: string
  }

  // Tank details dialog state
  const [selectedTank, setSelectedTank] = useState<UITank | null>(null)
  const [showTankDetails, setShowTankDetails] = useState(false)
  const [tankDetails, setTankDetails] = useState<UITank & { recentDips: Dip[]; recentDeliveries: Delivery[]; nozzles: Nozzle[] } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Load infrastructure logic removed from here

  const [stats, setStats] = useState<{
    totalTanks: number;
    fuelTypes: Record<string, { capacity: number; stock: number }>;
    criticalTanks: number;
    lowTanks: number;
  }>({
    totalTanks: 0,
    fuelTypes: {},
    criticalTanks: 0,
    lowTanks: 0,
  })

  useEffect(() => {
    const fetchTanks = async () => {
      try {
        // Build API URL based on station selection
        const currentStation = getSelectedStation()
        const apiUrl = currentStation
          ? `/api/tanks?type=tanks&stationId=${currentStation.id}`
          : '/api/tanks?type=tanks'

        const response = await fetch(apiUrl)

        if (!response.ok) {
          throw new Error('Failed to fetch tanks')
        }

        const data = await response.json()

        // Check if data is an array
        if (!Array.isArray(data)) {
          console.error('Expected array but got:', data)
          setTanks([])
          return
        }

        // Transform the data to include calculated fields
        const transformedTanks = data.map((tank: TankWithDetails & { station?: { name: string }; currentLevel?: number }) => ({
          ...tank,
          tankNumber: tank.tankNumber || 'TANK-1',
          capacity: tank.capacity,
          currentStock: tank.currentLevel || 0,
          stationName: tank.station?.name || `Station ${tank.stationId}`,
          fillPercentage: tank.capacity > 0 ? Math.round(((tank.currentLevel || 0) / tank.capacity) * 100) : 0,
          status: ((tank.currentLevel || 0) / tank.capacity < 0.1 ? 'CRITICAL' :
            (tank.currentLevel || 0) / tank.capacity < 0.25 ? 'LOW' : 'NORMAL') as 'NORMAL' | 'LOW' | 'CRITICAL',
          lastDipTime: new Date().toISOString(),
          lastDipReading: tank.currentLevel || 0
        }))

        setTanks(transformedTanks)

        // Calculate stats by fuel type
        const fuelTypeStats: Record<string, { capacity: number; stock: number }> = {}

        transformedTanks.forEach((tank: UITank) => {
          const fuelName = tank.fuel?.name || 'Unknown'
          if (!fuelTypeStats[fuelName]) {
            fuelTypeStats[fuelName] = { capacity: 0, stock: 0 }
          }
          fuelTypeStats[fuelName].capacity += tank.capacity
          fuelTypeStats[fuelName].stock += tank.currentStock
        })

        setStats({
          totalTanks: transformedTanks.length,
          fuelTypes: fuelTypeStats,
          criticalTanks: transformedTanks.filter((tank: UITank) => tank.status === 'CRITICAL').length,
          lowTanks: transformedTanks.filter((tank: UITank) => tank.status === 'LOW').length
        })

      } catch (err) {
        console.error('Failed to fetch tanks:', err)
        setTanks([])
      }
    }

    fetchTanks()
  }, [selectedStation, getSelectedStation])


  const handleTankClick = async (tank: UITank) => {
    setSelectedTank(tank)
    setShowTankDetails(true)
    setDetailsLoading(true)

    try {
      // Fetch detailed tank information
      const [tankRes, dipsRes, deliveriesRes] = await Promise.all([
        fetch(`/api/tanks?id=${tank.id}`),
        fetch(`/api/tanks/dips?tankId=${tank.id}&limit=5`),
        fetch(`/api/deliveries?tankId=${tank.id}&limit=5`)
      ])

      const tankData = await tankRes.json()
      const dipsData = await dipsRes.json()
      const deliveriesData = await deliveriesRes.json()

      setTankDetails({
        ...tankData,
        recentDips: dipsData || [],
        recentDeliveries: deliveriesData || [],
        nozzles: tankData.nozzles || []
      })
    } catch (err) {
      console.error('Failed to load tank details:', err)
      setTankDetails(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  const columns: Column<UITank>[] = [
    {
      key: 'stationName' as keyof UITank,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'tankNumber' as keyof UITank,
      title: 'Tank',
      render: (value: unknown, row: UITank) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">Tank {value as string}</span>
          <Badge variant="outline">{row.fuel?.icon} {row.fuel?.name || 'Unknown'}</Badge>
        </div>
      )
    },
    {
      key: 'capacity' as keyof UITank,
      title: 'Capacity (L)',
      render: (value: unknown) => (
        <span>
          {((value as number) || 0).toLocaleString()}L
        </span>
      )
    },
    {
      key: 'currentStock' as keyof UITank,
      title: 'Current Stock (L)',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="font-semibold">
            {((value as number) || 0).toLocaleString()}L
          </span>
        </div>
      )
    },
    {
      key: 'fillPercentage' as keyof UITank,
      title: 'Fill Level',
      render: (value: unknown) => {
        const percentage = value as number
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${getFillColor(percentage)} transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        )
      }
    },
    {
      key: 'status' as keyof UITank,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'lastDipTime' as keyof UITank,
      title: 'Last Dip',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value as string).toLocaleDateString()}
        </span>
      )
    }
  ]

  const getFuelTypeColor = (fuelName: string) => {
    const lower = fuelName.toLowerCase()
    if (lower.includes('petrol')) return 'text-orange-600 dark:text-orange-400'
    if (lower.includes('diesel')) return 'text-green-600 dark:text-green-400'
    if (lower.includes('extra')) return 'text-orange-600 dark:text-orange-400'
    return 'text-orange-600 dark:text-orange-400'
  }

  // ... existing code ...

  // NOTE: loadInfrastructure and related state have been moved to settings/tanks/page.tsx

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
        <Fuel className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        Tank Management
      </h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormCard className="p-4" title="Total Tanks">
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.totalTanks}</p>
        </FormCard>
        {Object.entries(stats.fuelTypes).map(([fuelName, data]) => (
          <FormCard key={fuelName} className="p-4" title={fuelName}>
            <p className={`text-3xl font-bold ${getFuelTypeColor(fuelName)}`}>
              {(data.capacity || 0).toLocaleString()}L
            </p>
            <p className="text-sm text-muted-foreground">
              Stock: {(data.stock || 0).toLocaleString()}L
              {data.capacity > 0 && ` (${Math.round((data.stock / data.capacity) * 100)}%)`}
            </p>
          </FormCard>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button variant="outline" onClick={() => router.push('/tanks/dips')}>
          <Droplets className="mr-2 h-4 w-4" />
          Record Tank Dip
        </Button>
        <Button variant="outline" onClick={() => router.push('/tanks/deliveries')}>
          <Truck className="mr-2 h-4 w-4" />
          Record Delivery
        </Button>

        <Button variant="outline" onClick={() => router.push('/settings/tanks')}>
          <Network className="mr-2 h-4 w-4" />
          Manage Tanks & Infrastructure
        </Button>
      </div>

      {/* Tanks Table */}
      <FormCard title="Tank Overview" className="p-6">
        <DataTable
          data={tanks}
          columns={columns}
          searchPlaceholder="Search tanks..."
          emptyMessage="No tanks found."
          onRowClick={handleTankClick}
        />
      </FormCard>

      {/* Tank Details Dialog */}
      <Dialog open={showTankDetails} onOpenChange={setShowTankDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Tank Details: {selectedTank?.tankNumber || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              Complete information about this fuel tank
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tank details...</div>
            </div>
          ) : tankDetails ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Tank Number</Label>
                  <div className="font-semibold">{tankDetails.tankNumber || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fuel Type</Label>
                  <div>
                    <Badge variant="outline">{tankDetails.fuel?.icon} {tankDetails.fuel?.name || 'N/A'}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Station</Label>
                  <div className="font-medium">{tankDetails.station?.name || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>
                    <Badge className={getStatusColor(selectedTank?.status || 'NORMAL')}>
                      {selectedTank?.status || 'NORMAL'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Capacity & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Capacity</Label>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {((tankDetails.capacity) || 0).toLocaleString()}L
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Current Level</Label>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {((tankDetails.currentLevel) || 0).toLocaleString()}L
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {tankDetails.capacity ?
                      `${Math.round((tankDetails.currentLevel / tankDetails.capacity) * 100)}% full` :
                      'N/A'}
                  </div>
                </div>
              </div>

              {/* Fill Level Progress */}
              {tankDetails.capacity && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Fill Level</Label>
                    <span className="text-sm font-medium">
                      {Math.round((tankDetails.currentLevel / tankDetails.capacity) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getFillColor(Math.round((tankDetails.currentLevel / tankDetails.capacity) * 100))} transition-all duration-300`}
                      style={{ width: `${Math.min((tankDetails.currentLevel / tankDetails.capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0L</span>
                    <span>{(tankDetails.capacity || 0).toLocaleString()}L</span>
                  </div>
                </div>
              )}

              {/* Connected Nozzles */}
              {tankDetails.nozzles && tankDetails.nozzles.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Connected Nozzles ({tankDetails.nozzles.length})
                  </Label>
                  <div className="space-y-2">
                    {tankDetails.nozzles.map((nozzle) => (
                      <div key={nozzle.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                        <Wrench className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        <span className="font-medium">Nozzle {nozzle.nozzleNumber || 'N/A'}</span>
                        <span>→</span>
                        <span>Nozzle {nozzle.nozzleNumber || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Dips */}
              {tankDetails.recentDips && tankDetails.recentDips.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Recent Dips ({tankDetails.recentDips.length})
                  </Label>
                  <div className="space-y-2">
                    {tankDetails.recentDips.map((dip) => (
                      <div key={dip.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium">{((dip.reading) || 0).toLocaleString()}L</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(dip.dipDate).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">by {dip.recordedBy}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Deliveries */}
              {tankDetails.recentDeliveries && tankDetails.recentDeliveries.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Recent Deliveries ({tankDetails.recentDeliveries.length})
                  </Label>
                  <div className="space-y-2">
                    {tankDetails.recentDeliveries.map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            +{((delivery.quantity) || 0).toLocaleString()}L
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {delivery.supplier} • {delivery.invoiceNumber || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(delivery.deliveryDate).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Failed to load tank details
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTankDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
