'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Station {
  id: string
  name: string
  address: string
  city: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    isActive: true
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchStations()
  }, [])

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations')
      const data = await response.json()
      setStations(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingStation ? `/api/stations/${editingStation.id}` : '/api/stations'
      const method = editingStation ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save station')

      toast({
        title: "Success",
        description: `Station ${editingStation ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchStations()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingStation ? 'update' : 'create'} station`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (station: Station) => {
    setEditingStation(station)
    setFormData({
      name: station.name,
      address: station.address,
      city: station.city,
      isActive: station.isActive
    })
    setDialogOpen(true)
  }

  const handleDelete = async (station: Station) => {
    if (!confirm(`Are you sure you want to delete station "${station.name}"?`)) return

    try {
      const response = await fetch(`/api/stations/${station.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete station')

      toast({
        title: "Success",
        description: "Station deleted successfully"
      })

      fetchStations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete station",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingStation(null)
    setFormData({
      name: '',
      address: '',
      city: '',
      isActive: true
    })
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const columns = [
    {
      key: 'name' as keyof Station,
      title: 'Station Name',
      render: (value: unknown) => (
        <div className="font-medium">{value as string}</div>
      )
    },
    {
      key: 'address' as keyof Station,
      title: 'Address',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="h-3 w-3" />
          {value as string}
        </div>
      )
    },
    {
      key: 'city' as keyof Station,
      title: 'City',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'isActive' as keyof Station,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as boolean)}>
          {(value as boolean) ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'id' as keyof Station,
      title: 'Actions',
      render: (value: unknown, row: Station) => (
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
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const stats = [
    {
      title: 'Total Stations',
      value: stations.length.toString(),
      description: 'Registered stations',
      icon: <Building2 className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: stations.filter(s => s.status === 'active').length.toString(),
      description: 'Currently operational',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'Maintenance',
      value: stations.filter(s => s.status === 'maintenance').length.toString(),
      description: 'Under maintenance',
      icon: <div className="h-5 w-5 bg-yellow-500 rounded-full" />
    },
    {
      title: 'Inactive',
      value: stations.filter(s => s.status === 'inactive').length.toString(),
      description: 'Not operational',
      icon: <div className="h-5 w-5 bg-gray-500 rounded-full" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Station Management</h1>
          <p className="text-gray-600 mt-2">
            Manage petrol stations, locations, and operational details
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Station
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStation ? 'Edit Station' : 'Add New Station'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Station Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Street Station"
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  required
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="isActive">Status</Label>
                <Select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStation ? 'Update Station' : 'Create Station'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.title}</div>
                  <div className="text-xs text-gray-500">{stat.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stations Table */}
      <FormCard title="Stations" description="Manage all petrol station locations and details">
        <DataTable
          data={stations}
          columns={columns}
          searchPlaceholder="Search stations..."
        />
      </FormCard>
    </div>
  )
}
