'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Plus, AlertCircle, Fuel, BarChart3, Droplet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Fuel {
  id: string
  code: string
  name: string
  category: string
  description?: string | null
  icon?: string | null
  isActive: boolean
  sortOrder: number
  _count?: {
    tanks: number
    prices: number
  }
}

interface Price {
  id: string
  stationId: string
  fuelId: string
  fuel?: Fuel
  price: number
  effectiveDate: string
  isActive: boolean
  createdAt: string
  station?: {
    name: string
  }
}

interface Tank {
  id: string
  tankNumber: string
  fuelId: string
  fuel?: Fuel
  capacity: number
  currentLevel: number
  station: {
    name: string
  }
}

export default function FuelsPage() {
  const router = useRouter()
  const [prices, setPrices] = useState<Price[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [fuels, setFuels] = useState<Fuel[]>([])
  const [loading, setLoading] = useState(true)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [fuelTypeDialogOpen, setFuelTypeDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [formData, setFormData] = useState({
    fuelId: '',
    price: 0,
    effectiveDate: new Date().toISOString().slice(0, 16)
  })
  const [newFuelData, setNewFuelData] = useState({
    code: '',
    name: '',
    category: 'PETROL',
    description: '',
    icon: '⛽'
  })
  const { selectedStation } = useStation()
  const { toast } = useToast()

  const fetchFuels = useCallback(async () => {
    try {
      const response = await fetch('/api/fuels')
      if (!response.ok) throw new Error('Failed to fetch fuels')

      const data = await response.json()
      setFuels(Array.isArray(data) ? data : [])

      // Set default fuel if not set
      if (data.length > 0 && !formData.fuelId) {
        setFormData(prev => ({ ...prev, fuelId: data[0].id }))
      }
    } catch {
      console.error('Error fetching fuels:')
      toast({
        title: "Error",
        description: "Failed to fetch fuel types",
        variant: "destructive"
      })
    }
  }, [formData.fuelId, toast])

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    try {
      const url = selectedStation && selectedStation !== 'all'
        ? `/api/prices?stationId=${selectedStation}`
        : '/api/prices'

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch prices')

      const data = await response.json()
      setPrices(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching prices:')
      toast({
        title: "Error",
        description: "Failed to fetch prices",
        variant: "destructive"
      })
      setPrices([])
    } finally {
      setLoading(false)
    }
  }, [selectedStation, toast])

  const fetchTanks = useCallback(async () => {
    try {
      const url = selectedStation && selectedStation !== 'all'
        ? `/api/tanks?stationId=${selectedStation}`
        : '/api/tanks'

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch tanks')

      const data = await response.json()
      setTanks(Array.isArray(data) ? data : [])
    } catch {
      console.error('Error fetching tanks:')
    }
  }, [selectedStation])

  useEffect(() => {
    fetchFuels()
    fetchPrices()
    fetchTanks()
  }, [fetchFuels, fetchPrices, fetchTanks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStation || selectedStation === 'all') {
      toast({
        title: "Error",
        description: "Please select a specific station",
        variant: "destructive"
      })
      return
    }

    if (!formData.fuelId) {
      toast({
        title: "Error",
        description: "Please select a fuel type",
        variant: "destructive"
      })
      return
    }

    if (formData.price <= 0) {
      toast({
        title: "Error",
        description: "Price must be greater than 0",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          fuelId: formData.fuelId,
          price: parseFloat(formData.price.toString()),
          effectiveDate: new Date(formData.effectiveDate).toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add price')
      }

      toast({
        title: "Success",
        description: "New price added successfully"
      })

      setPriceDialogOpen(false)
      setFormData({
        fuelId: fuels[0]?.id || '',
        price: 0,
        effectiveDate: new Date().toISOString().slice(0, 16)
      })
      fetchPrices()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add price',
        variant: "destructive"
      })
    }
  }

  const handleAddFuel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFuelData.code || !newFuelData.name) {
      toast({
        title: "Error",
        description: "Code and name are required",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/fuels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFuelData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add fuel type')
      }

      const newFuel = await response.json()

      toast({
        title: "Success",
        description: `${newFuelData.name} added successfully!`
      })

      setNewFuelDialogOpen(false)
      setNewFuelData({
        code: '',
        name: '',
        category: 'PETROL',
        description: '',
        icon: '⛽'
      })

      // Refresh fuels list
      await fetchFuels()

      // Open price dialog with new fuel selected
      setFormData(prev => ({ ...prev, fuelId: newFuel.id }))
      setFuelTypeDialogOpen(false)
      setPriceDialogOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add fuel type',
        variant: "destructive"
      })
    }
  }

  // Get current prices (most recent for each fuel type)
  const getCurrentPrices = () => {
    const currentPricesMap = new Map<string, Price>()

    // Filter out any invalid prices and sort by date
    const validPrices = prices.filter(p => p && p.fuelId && p.effectiveDate && p.price !== undefined)

    const sortedPrices = [...validPrices].sort((a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    )

    // Get the most recent price for each fuel type
    for (const price of sortedPrices) {
      if (!currentPricesMap.has(price.fuelId)) {
        currentPricesMap.set(price.fuelId, price)
      }
    }

    return Array.from(currentPricesMap.values())
  }

  const currentPrices = getCurrentPrices()
  const activePricesCount = currentPrices.filter(p =>
    p && p.effectiveDate && new Date(p.effectiveDate) <= new Date()
  ).length

  // Get valid prices for history table
  const validPricesForHistory = prices.filter(p =>
    p && p.fuelId && p.effectiveDate !== undefined && p.price !== undefined
  )

  // Calculate fuel statistics
  const getFuelStats = () => {
    const stats = new Map<string, {
      totalCapacity: number,
      currentStock: number,
      tankCount: number,
      currentPrice: number
    }>()

    // Initialize stats for all fuel types
    fuels.forEach(fuel => {
      stats.set(fuel.id, {
        totalCapacity: 0,
        currentStock: 0,
        tankCount: 0,
        currentPrice: 0
      })
    })

    // Aggregate tank data
    tanks.forEach(tank => {
      const stat = stats.get(tank.fuelId)
      if (stat) {
        stat.totalCapacity += tank.capacity
        stat.currentStock += tank.currentLevel
        stat.tankCount += 1
      }
    })

    // Add price data
    currentPrices.forEach(price => {
      const stat = stats.get(price.fuelId)
      if (stat) {
        stat.currentPrice = price.price || 0
      }
    })

    return stats
  }

  const fuelStats = getFuelStats()

  // Helper function to determine if a price is the current active one
  const isCurrentPrice = (price: Price): boolean => {
    const now = new Date()
    const priceDate = new Date(price.effectiveDate)

    // If price is in the future, it's not current
    if (priceDate > now) return false

    // Find all prices for the same fuel type and station
    const sameFuelPrices = prices.filter(p =>
      p.fuelId === price.fuelId &&
      p.stationId === price.stationId &&
      new Date(p.effectiveDate) <= now
    )

    // Sort by date descending to find the most recent
    const sortedPrices = sameFuelPrices.sort((a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    )

    // This price is current if it's the most recent one
    return sortedPrices.length > 0 && sortedPrices[0].id === price.id
  }

  const columns: Column<Price>[] = [
    {
      key: 'fuelId',
      title: 'Fuel Type',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className="text-xl">{row.fuel?.icon || '⛽'}</span>
          <span className="font-medium">{row.fuel?.name || 'Unknown'}</span>
        </div>
      )
    },
    {
      key: 'price',
      title: 'Price (LKR/L)',
      render: (value, row) => (
        <div className="font-semibold text-lg">
          Rs. {row.price.toFixed(2)}
        </div>
      )
    },
    {
      key: 'effectiveDate',
      title: 'Effective From',
      render: (value, row) => (
        <div className="text-sm">
          {new Date(row.effectiveDate).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )
    },
    {
      key: 'stationId',
      title: 'Station',
      render: (value, row) => (
        <div className="text-sm text-muted-foreground">
          {row.station?.name || 'Unknown'}
        </div>
      )
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value, row) => {
        const priceDate = new Date(row.effectiveDate)
        const now = new Date()

        // Future price
        if (priceDate > now) {
          return (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
              Scheduled
            </Badge>
          )
        }

        // Check if this is the current active price
        const isCurrent = isCurrentPrice(row)

        if (isCurrent) {
          return (
            <Badge variant="default" className="bg-green-600 text-white">
              Active
            </Badge>
          )
        }

        // Historical/superseded price
        return (
          <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Historical
          </Badge>
        )
      }
    }
  ]


  const totalCapacity = Array.from(fuelStats.values()).reduce((sum, stat) => sum + stat.totalCapacity, 0)
  const totalStock = Array.from(fuelStats.values()).reduce((sum, stat) => sum + stat.currentStock, 0)
  const stockPercentage = totalCapacity > 0 ? (totalStock / totalCapacity) * 100 : 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fuels</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive fuel management - types, pricing, and inventory
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={fuelTypeDialogOpen} onOpenChange={setFuelTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add New Fuel Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Fuel Type</DialogTitle>
                <DialogDescription>
                  Add a completely new fuel or oil type to your system.
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto flex-1 pr-2">
                <form onSubmit={handleAddFuel} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newFuelName">Fuel Name *</Label>
                      <Input
                        id="newFuelName"
                        value={newFuelData.name}
                        onChange={(e) => setNewFuelData({ ...newFuelData, name: e.target.value })}
                        placeholder="e.g., Bio Diesel, Hydrogen"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="newFuelCode">Code *</Label>
                      <Input
                        id="newFuelCode"
                        value={newFuelData.code}
                        onChange={(e) => setNewFuelData({ ...newFuelData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                        placeholder="e.g., BIO_DIESEL"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Unique identifier (auto-formatted)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newFuelCategory">Category *</Label>
                      <Select
                        value={newFuelData.category}
                        onValueChange={(value) => setNewFuelData({ ...newFuelData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PETROL">Petrol</SelectItem>
                          <SelectItem value="DIESEL">Diesel</SelectItem>
                          <SelectItem value="OIL">Oil</SelectItem>
                          <SelectItem value="GAS">Gas (LPG/CNG)</SelectItem>
                          <SelectItem value="ELECTRIC">Electric</SelectItem>
                          <SelectItem value="HYDROGEN">Hydrogen</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="newFuelIcon">Icon (Emoji)</Label>
                      <Input
                        id="newFuelIcon"
                        value={newFuelData.icon}
                        onChange={(e) => setNewFuelData({ ...newFuelData, icon: e.target.value })}
                        placeholder="⛽"
                        maxLength={2}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Single emoji character</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newFuelDescription">Description (Optional)</Label>
                    <Input
                      id="newFuelDescription"
                      value={newFuelData.description}
                      onChange={(e) => setNewFuelData({ ...newFuelData, description: e.target.value })}
                      placeholder="e.g., Environmentally friendly bio-diesel blend"
                    />
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Preview
                    </h4>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded border">
                      <span className="text-2xl">{newFuelData.icon || '⛽'}</span>
                      <div>
                        <p className="font-medium">{newFuelData.name || 'Fuel Name'}</p>
                        <p className="text-xs text-muted-foreground">{newFuelData.code || 'FUEL_CODE'} • {newFuelData.category}</p>
                        {newFuelData.description && (
                          <p className="text-xs text-muted-foreground mt-1">{newFuelData.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setFuelTypeDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Fuel Type
                    </Button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-sm mb-3">Existing Fuel Types ({fuels.length})</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {fuels.map((fuel) => (
                      <div
                        key={fuel.id}
                        className="flex items-center gap-2 p-2 rounded border bg-gray-50 dark:bg-gray-900"
                      >
                        <span className="text-lg">{fuel.icon}</span>
                        <span className="flex-1 text-xs font-medium">{fuel.name}</span>
                        {fuel.isActive && <Badge variant="default" className="text-xs">Active</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Price
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Fuel Price</DialogTitle>
                <DialogDescription>
                  Add a new price for a fuel type. This will be effective from the date you specify.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="fuelId">Fuel Type</Label>
                  <Select
                    value={formData.fuelId}
                    onValueChange={(value) => setFormData({ ...formData, fuelId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuels.filter(f => f.isActive).map(fuel => (
                        <SelectItem key={fuel.id} value={fuel.id}>
                          {fuel.icon} {fuel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">Price (LKR per Liter)</Label>
                  <MoneyInput
                    id="price"
                    value={formData.price}
                    onChange={(value) => setFormData({ ...formData, price: value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="effectiveDate">Effective From</Label>
                  <Input
                    type="datetime-local"
                    id="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    required
                  />
                </div>

                {selectedStation === 'all' && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Please select a specific station to add prices
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setPriceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={selectedStation === 'all'}>
                    Add Price
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fuel Types</CardTitle>
                <Fuel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fuels.length}</div>
                <p className="text-xs text-muted-foreground">Available types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
                <Droplet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCapacity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Liters across all tanks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{stockPercentage.toFixed(1)}% capacity</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Prices</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activePricesCount}</div>
                <p className="text-xs text-muted-foreground">Currently effective</p>
              </CardContent>
            </Card>
          </div>

          {/* Fuel Type Details */}
          <FormCard
            title="Fuel Types & Statistics"
            description="Detailed breakdown by fuel type"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fuels.map(fuel => {
                const stats = fuelStats.get(fuel.id)
                if (!stats) return null

                const stockPerc = stats.totalCapacity > 0
                  ? (stats.currentStock / stats.totalCapacity) * 100
                  : 0

                return (
                  <Card key={fuel.id} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{fuel.icon}</span>
                          <CardTitle className="text-sm font-medium">
                            {fuel.name}
                          </CardTitle>
                        </div>
                        <Badge variant="outline">{stats.tankCount} tanks</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {/* Price */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                        <p className="text-2xl font-bold">
                          Rs. {stats.currentPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">per liter</p>
                      </div>

                      {/* Inventory */}
                      <div className="pt-3 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Capacity:</span>
                          <span className="font-medium">{stats.totalCapacity.toLocaleString()} L</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className="font-medium">{stats.currentStock.toLocaleString()} L</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Fill Level:</span>
                          <span className={`font-medium ${stockPerc < 20 ? 'text-red-600' :
                            stockPerc < 50 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                            {stockPerc.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${stockPerc < 20 ? 'bg-red-500' :
                            stockPerc < 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                          style={{ width: `${Math.min(stockPerc, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </FormCard>
        </TabsContent>

        {/* Prices Tab */}
        <TabsContent value="prices" className="space-y-6">
          {/* Current Prices */}
          <FormCard
            title="Current Prices"
            description="Latest effective prices for each fuel type"
          >
            {currentPrices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentPrices.map(price => (
                  <Card key={price.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{price.fuel?.icon || '⛽'}</span>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {price.fuel?.name || 'Unknown Fuel'}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        Rs. {price.price ? price.price.toFixed(2) : '0.00'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        per liter
                      </p>
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                          Effective: {price.effectiveDate ? new Date(price.effectiveDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No current prices available
              </div>
            )}
          </FormCard>

          {/* Price History */}
          <FormCard
            title="Price History"
            description={`All ${validPricesForHistory.length} price records (view only)`}
          >
            {validPricesForHistory.length > 0 ? (
              <DataTable
                data={validPricesForHistory}
                columns={columns}
                loading={loading}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Loading...' : 'No price history available'}
              </div>
            )}
          </FormCard>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <FormCard
            title="Tank Inventory by Fuel Type"
            description={`Current stock levels across ${tanks.length} tanks`}
          >
            {tanks.length > 0 ? (
              <div className="space-y-6">
                {fuels.map(fuel => {
                  const fuelTanks = tanks.filter(t => t && t.fuelId === fuel.id)
                  const stats = fuelStats.get(fuel.id)

                  // Show all fuel types, even if no tanks
                  const totalCap = stats?.totalCapacity || 0
                  const currentStock = stats?.currentStock || 0
                  const fillPercentage = totalCap > 0 ? (currentStock / totalCap) * 100 : 0

                  return (
                    <div key={fuel.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{fuel.icon}</span>
                          <h3 className="font-semibold">{fuel.name}</h3>
                        </div>
                        <Badge variant={fuelTanks.length > 0 ? 'default' : 'secondary'}>
                          {fuelTanks.length} {fuelTanks.length === 1 ? 'tank' : 'tanks'}
                        </Badge>
                      </div>

                      {fuelTanks.length > 0 ? (
                        <>
                          <div className="grid gap-3 md:grid-cols-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total Capacity</p>
                              <p className="text-lg font-semibold">{totalCap.toLocaleString()} L</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Current Stock</p>
                              <p className="text-lg font-semibold">{currentStock.toLocaleString()} L</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Available Space</p>
                              <p className="text-lg font-semibold">
                                {(totalCap - currentStock).toLocaleString()} L
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Fill Level</p>
                              <p className={`text-lg font-semibold ${fillPercentage < 20 ? 'text-red-600' :
                                fillPercentage < 50 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                {fillPercentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${fillPercentage < 20 ? 'bg-red-500' :
                                fillPercentage < 50 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            />
                          </div>

                          {/* Individual Tank Details */}
                          <div className="pt-3 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Individual Tanks:</p>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {fuelTanks.map(tank => {
                                const tankFill = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0
                                return (
                                  <div key={tank.id} className="text-sm bg-muted/30 p-2 rounded">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-medium">{tank.tankNumber}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {tank.station?.name || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span>Stock: {tank.currentLevel.toLocaleString()} L</span>
                                      <span>Cap: {tank.capacity.toLocaleString()} L</span>
                                    </div>
                                    <div className="w-full bg-background rounded-full h-1 mt-1">
                                      <div
                                        className={`h-1 rounded-full ${tankFill < 20 ? 'bg-red-500' :
                                          tankFill < 50 ? 'bg-yellow-500' :
                                            'bg-green-500'
                                          }`}
                                        style={{ width: `${Math.min(tankFill, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">No tanks configured for this fuel type</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Loading tank data...' : 'No tanks found'}
              </div>
            )}
          </FormCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
