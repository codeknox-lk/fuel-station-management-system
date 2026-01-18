'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Plus, Edit, Trash2, TrendingUp, TrendingDown, Calendar, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'

interface Price {
  id: string
  fuelType: 'petrol' | 'diesel' | 'super_diesel' | 'kerosene'
  price: number
  effectiveFrom: string
  effectiveTo?: string
  status: 'active' | 'scheduled' | 'expired'
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface NextPrice {
  fuelType: string
  currentPrice: number
  nextPrice: number
  effectiveFrom: string
  changeAmount: number
  changePercent: number
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([])
  const [nextPrices, setNextPrices] = useState<NextPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState<Price | null>(null)
  const [formData, setFormData] = useState({
    fuelType: 'petrol' as Price['fuelType'],
    price: 0,
    effectiveFrom: new Date().toISOString().slice(0, 16),
    effectiveTo: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPrices()
    fetchNextPrices()
  }, [])

  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/prices')
      const data = await response.json()
      setPrices(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch prices",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchNextPrices = async () => {
    try {
      const response = await fetch('/api/prices/next')
      const data = await response.json()
      setNextPrices(data)
    } catch (error) {
      console.error('Failed to fetch next prices:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPrice ? `/api/prices/${editingPrice.id}` : '/api/prices'
      const method = editingPrice ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          effectiveTo: formData.effectiveTo || null
        })
      })

      if (!response.ok) throw new Error('Failed to save price')

      toast({
        title: "Success",
        description: `Price ${editingPrice ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchPrices()
      fetchNextPrices()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingPrice ? 'update' : 'create'} price`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (price: Price) => {
    setEditingPrice(price)
    setFormData({
      fuelType: price.fuelType,
      price: price.price,
      effectiveFrom: price.effectiveFrom.slice(0, 16),
      effectiveTo: price.effectiveTo?.slice(0, 16) || ''
    })
    setDialogOpen(true)
  }

  const handleDelete = async (price: Price) => {
    if (!confirm(`Are you sure you want to delete this price entry?`)) return

    try {
      const response = await fetch(`/api/prices/${price.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete price')

      toast({
        title: "Success",
        description: "Price deleted successfully"
      })

      fetchPrices()
      fetchNextPrices()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete price",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingPrice(null)
    setFormData({
      fuelType: 'petrol',
      price: 0,
      effectiveFrom: new Date().toISOString().slice(0, 16),
      effectiveTo: ''
    })
  }

  const getStatusColor = (status: Price['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'expired': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getFuelTypeLabel = (fuelType: Price['fuelType']) => {
    switch (fuelType) {
      case 'petrol': return 'Petrol 92'
      case 'diesel': return 'Diesel'
      case 'super_diesel': return 'Super Diesel'
      case 'kerosene': return 'Kerosene'
      default: return fuelType
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns = [
    {
      key: 'fuelType' as keyof Price,
      title: 'Fuel Type',
      render: (value: unknown) => (
        <div className="font-medium">{getFuelTypeLabel(value as Price['fuelType'])}</div>
      )
    },
    {
      key: 'price' as keyof Price,
      title: 'Price (Rs.)',
      render: (value: unknown) => (
        <div className="font-mono font-medium">
          Rs. {(value as number).toFixed(2)}
        </div>
      )
    },
    {
      key: 'effectiveFrom' as keyof Price,
      title: 'Effective From',
      render: (value: unknown) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDateTime(value as string)}
          </div>
        </div>
      )
    },
    {
      key: 'effectiveTo' as keyof Price,
      title: 'Effective To',
      render: (value: unknown) => (
        <div className="text-sm text-muted-foreground">
          {value ? formatDateTime(value as string) : 'Ongoing'}
        </div>
      )
    },
    {
      key: 'status' as keyof Price,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-muted text-foreground">Unknown</Badge>
        return (
          <Badge className={getStatusColor(status as Price['status'])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      }
    },
    {
      key: 'createdBy' as keyof Price,
      title: 'Created By',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'id' as keyof Price,
      title: 'Actions',
      render: (value: unknown, row: Price) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 dark:text-red-400 hover:text-red-700"
            disabled={row.status === 'active'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const stats = [
    {
      title: 'Active Prices',
      value: prices.filter(p => p.status === 'active').length.toString(),
      description: 'Currently effective',
      icon: <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
    },
    {
      title: 'Scheduled',
      value: prices.filter(p => p.status === 'scheduled').length.toString(),
      description: 'Future price changes',
      icon: <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    },
    {
      title: 'Price History',
      value: prices.filter(p => p.status === 'expired').length.toString(),
      description: 'Historical records',
      icon: <div className="h-5 w-5 bg-muted0 rounded-full" />
    },
    {
      title: 'Fuel Types',
      value: new Set(prices.map(p => p.fuelType)).size.toString(),
      description: 'Different fuel types',
      icon: <div className="h-5 w-5 bg-purple-500/10 dark:bg-purple-500/200 rounded-full" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fuel Price Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage fuel pricing with history tracking and future price scheduling
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Price
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPrice ? 'Edit Price' : 'Add New Price'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <select
                    id="fuelType"
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as Price['fuelType'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="petrol">Petrol 92</option>
                    <option value="diesel">Diesel</option>
                    <option value="super_diesel">Super Diesel</option>
                    <option value="kerosene">Kerosene</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="price">Price (Rs.)</Label>
                  <MoneyInput
                    id="price"
                    value={formData.price}
                    onChange={(value) => setFormData({ ...formData, price: value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectiveFrom">Effective From</Label>
                  <Input
                    id="effectiveFrom"
                    type="datetime-local"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
                  <Input
                    id="effectiveTo"
                    type="datetime-local"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPrice ? 'Update Price' : 'Create Price'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Next Price Changes Banner */}
      {nextPrices.length > 0 && (
        <Alert className="border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20">
          <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-blue-700 dark:text-blue-300">Upcoming Price Changes:</strong>
                <div className="mt-1 space-y-1">
                  {nextPrices.map((nextPrice, index) => (
                    <div key={index} className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">{getFuelTypeLabel(nextPrice.fuelType as Price['fuelType'])}</span>
                      : Rs. {nextPrice.currentPrice.toFixed(2)} → Rs. {nextPrice.nextPrice.toFixed(2)}
                      <span className={`ml-2 inline-flex items-center gap-1 ${nextPrice.changeAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {nextPrice.changeAmount > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        Rs. {Math.abs(nextPrice.changeAmount).toFixed(2)} ({nextPrice.changePercent > 0 ? '+' : ''}{nextPrice.changePercent.toFixed(1)}%)
                      </span>
                      <span className="ml-2 text-xs">
                        from {formatDateTime(nextPrice.effectiveFrom)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.title}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Prices Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['petrol', 'diesel', 'super_diesel', 'kerosene'].map((fuelType) => {
          const currentPrice = prices.find(p => p.fuelType === fuelType && p.status === 'active')
          const nextPrice = nextPrices.find(np => np.fuelType === fuelType)
          
          return (
            <Card key={fuelType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{getFuelTypeLabel(fuelType as Price['fuelType'])}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-foreground">
                    Rs. {currentPrice?.price.toFixed(2) || '0.00'}
                  </div>
                  {nextPrice && (
                    <div className="text-sm">
                      <div className={`flex items-center gap-1 ${nextPrice.changeAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {nextPrice.changeAmount > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        Next: Rs. {nextPrice.nextPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(nextPrice.effectiveFrom)}
                      </div>
                    </div>
                  )}
                  {currentPrice && (
                    <div className="text-xs text-muted-foreground">
                      Since: {formatDateTime(currentPrice.effectiveFrom)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Price History Table */}
      <FormCard title="Price History" description="Complete history of fuel price changes and schedules">
        <DataTable
          data={prices}
          columns={columns}
          searchPlaceholder="Search prices..."
        />
      </FormCard>
    </div>
  )
}
