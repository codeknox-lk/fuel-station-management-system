'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Fuel, 
  Droplets, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  BarChart3,
  Truck,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Network,
  Wrench
} from 'lucide-react'

interface Tank {
  id: string
  stationId: string
  stationName?: string
  tankNumber: string
  fuelType: string
  capacity: number
  currentStock: number
  lastDipTime: string
  lastDipReading: number
  fillPercentage: number
  status: 'NORMAL' | 'LOW' | 'CRITICAL'
}

export default function TanksPage() {
  const router = useRouter()
  const { stations, selectedStation, getSelectedStation } = useStation()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  
  // Tank details dialog state
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)
  const [showTankDetails, setShowTankDetails] = useState(false)
  const [tankDetails, setTankDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  // Infrastructure tree state
  const [showInfrastructure, setShowInfrastructure] = useState(false)
  const [infrastructure, setInfrastructure] = useState<any>(null)
  const [infraLoading, setInfraLoading] = useState(false)
  const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTanks()
  }, [selectedStation])

  const fetchTanks = async () => {
    try {
      setLoading(true)
      
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
      const transformedTanks = data.map((tank: { id: string; stationId: string; tankNumber?: string; capacity: number; fuelType: string; currentLevel: number; station?: { name: string } }) => ({
        ...tank,
        tankNumber: tank.tankNumber || 'TANK-1',
        currentStock: tank.currentLevel,
        stationName: tank.station?.name || `Station ${tank.stationId}`,
        fillPercentage: Math.round((tank.currentLevel / tank.capacity) * 100),
        status: tank.currentLevel / tank.capacity < 0.1 ? 'CRITICAL' : 
                tank.currentLevel / tank.capacity < 0.25 ? 'LOW' : 'NORMAL',
        lastDipTime: new Date().toISOString(),
        lastDipReading: tank.currentLevel
      }))

      setTanks(transformedTanks)

      // Calculate stats
      const totalCapacity = transformedTanks.reduce((sum: number, tank: Tank) => sum + tank.capacity, 0)
      const totalStock = transformedTanks.reduce((sum: number, tank: Tank) => sum + tank.currentStock, 0)
      const criticalTanks = transformedTanks.filter((tank: Tank) => tank.status === 'CRITICAL').length
      const lowTanks = transformedTanks.filter((tank: Tank) => tank.status === 'LOW').length

      setStats({
        totalTanks: transformedTanks.length,
        totalCapacity,
        totalStock,
        fillPercentage: totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0,
        criticalTanks,
        lowTanks
      })

    } catch (err) {
      console.error('Failed to fetch tanks:', err)
      setError('Failed to load tanks data.')
      setTanks([])
    } finally {
      setLoading(false)
    }
  }

  const [stats, setStats] = useState({
    totalTanks: 0,
    totalCapacity: 0,
    totalStock: 0,
    fillPercentage: 0,
    criticalTanks: 0,
    lowTanks: 0,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'LOW': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getFillColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500/10 dark:bg-green-500/200'
    if (percentage >= 50) return 'bg-blue-500/10 dark:bg-blue-500/30'
    if (percentage >= 25) return 'bg-yellow-500/10 dark:bg-yellow-500/200'
    return 'bg-red-500/10 dark:bg-red-500/200'
  }

  const loadInfrastructure = async (stationId: string) => {
    setInfraLoading(true)
    try {
      const response = await fetch(`/api/tanks/infrastructure?stationId=${stationId}`)
      const data = await response.json()
      setInfrastructure(data)
      setShowInfrastructure(true)
      // Expand all tanks by default
      setExpandedTanks(new Set(data.tanks.map((t: any) => t.id)))
    } catch (err) {
      console.error('Failed to load infrastructure:', err)
      setError('Failed to load infrastructure')
    } finally {
      setInfraLoading(false)
    }
  }

  const toggleTankExpand = (tankId: string) => {
    setExpandedTanks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tankId)) {
        newSet.delete(tankId)
      } else {
        newSet.add(tankId)
      }
      return newSet
    })
  }

  const handleTankClick = async (tank: Tank) => {
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

  const columns: Column<Tank>[] = [
    {
      key: 'stationName' as keyof Tank,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'tankNumber' as keyof Tank,
      title: 'Tank',
      render: (value: unknown, row: Tank) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">Tank {value as string}</span>
          <Badge variant="outline">{row.fuelType}</Badge>
        </div>
      )
    },
    {
      key: 'capacity' as keyof Tank,
      title: 'Capacity (L)',
      render: (value: unknown) => (
        <span className="font-mono">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'currentStock' as keyof Tank,
      title: 'Current Stock (L)',
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
      key: 'fillPercentage' as keyof Tank,
      title: 'Fill Level',
      render: (value: unknown, row: Tank) => {
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
      key: 'status' as keyof Tank,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'lastDipTime' as keyof Tank,
      title: 'Last Dip',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value as string).toLocaleDateString()}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Tank Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Tanks</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalTanks}</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Capacity</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalCapacity.toLocaleString()}L
          </p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Current Stock</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.totalStock.toLocaleString()}L
          </p>
          <p className="text-sm text-muted-foreground">({stats.fillPercentage}% full)</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Alerts</h3>
          <div className="flex gap-2">
            <Badge className="bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300">
              {stats.criticalTanks} Critical
            </Badge>
            <Badge className="bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300">
              {stats.lowTanks} Low
            </Badge>
          </div>
        </FormCard>
      </div>

      {/* Success Alert */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

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
        <Button variant="outline" onClick={() => router.push('/tanks/report')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Variance Report
        </Button>
        <Button variant="outline" onClick={() => router.push('/settings/tanks')}>
          <Network className="mr-2 h-4 w-4" />
          Manage Tanks & Infrastructure
        </Button>
      </div>

      {/* Infrastructure Tree Selector */}
      {!showInfrastructure && (
        <FormCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">View Infrastructure Tree</h3>
              <p className="text-sm text-muted-foreground">See all tanks, pumps, and nozzles for a station</p>
            </div>
            <Select onValueChange={(value) => loadInfrastructure(value)} disabled={infraLoading}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select station to view" />
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
      )}

      {/* Infrastructure Tree Display */}
      {showInfrastructure && infrastructure && (
        <FormCard title={`Infrastructure: ${infrastructure.station.name}`} className="p-6">
          <div className="space-y-4">
            {/* Tanks Section */}
            {infrastructure.tanks.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Tanks ({infrastructure.tanks.length})
                </h4>
                <div className="space-y-2 border-l-2 border-border pl-4">
                  {infrastructure.tanks.map((tank: any) => {
                    const isExpanded = expandedTanks.has(tank.id)
                    const fillPercentage = Math.round((tank.currentLevel / tank.capacity) * 100)
                    return (
                      <div key={tank.id} className="space-y-1">
                        <button
                          onClick={() => toggleTankExpand(tank.id)}
                          className="flex items-center gap-2 w-full text-left hover:bg-muted p-2 rounded-md transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <span className="font-semibold">{tank.fuelType.replace(/_/g, ' ')}</span>
                          <Badge variant="outline">
                            {fillPercentage}% full
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {tank.currentLevel.toLocaleString()}L / {tank.capacity.toLocaleString()}L
                          </span>
                        </button>
                        {isExpanded && tank.nozzles.length > 0 && (
                          <div className="ml-8 space-y-1 border-l-2 border-blue-500/20 dark:border-blue-500/30 pl-4">
                            {tank.nozzles.map((nozzle: any) => (
                              <div key={nozzle.id} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                <Droplets className="h-3 w-3 text-green-600 dark:text-green-400" />
                                <span className="font-medium">
                                  <Wrench className="h-3 w-3 text-blue-600 dark:text-blue-400 inline mr-1" />
                                  {nozzle.pump.pumpNumber} → Nozzle {nozzle.nozzleNumber}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {isExpanded && tank.nozzles.length === 0 && (
                          <div className="ml-8 text-sm text-muted-foreground italic">
                            No nozzles connected
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {infrastructure.tanks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Network className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p>No infrastructure found for this station.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/settings/tanks')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Infrastructure
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowInfrastructure(false)}>
              Close View
            </Button>
          </div>
        </FormCard>
      )}

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
                    <Badge variant="outline">{tankDetails.fuelType?.replace(/_/g, ' ') || 'N/A'}</Badge>
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
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {tankDetails.capacity?.toLocaleString() || 0}L
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">Current Level</Label>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {tankDetails.currentLevel?.toLocaleString() || 0}L
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
                    <span>{tankDetails.capacity.toLocaleString()}L</span>
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
                    {tankDetails.nozzles.map((nozzle: any) => (
                      <div key={nozzle.id} className="flex items-center gap-2 text-sm p-2 bg-muted rounded">
                        <Wrench className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Pump {nozzle.pump?.pumpNumber || 'N/A'}</span>
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
                    <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Recent Dips ({tankDetails.recentDips.length})
                  </Label>
                  <div className="space-y-2">
                    {tankDetails.recentDips.map((dip: any) => (
                      <div key={dip.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium">{dip.reading?.toLocaleString() || 0}L</div>
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
                    {tankDetails.recentDeliveries.map((delivery: any) => (
                      <div key={delivery.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            +{delivery.quantity?.toLocaleString() || 0}L
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
