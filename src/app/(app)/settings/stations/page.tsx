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
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Station {
  id: string
  name: string
  address: string
  city: string
  phone?: string
  email?: string
  openingHours?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function StationsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    openingHours: '',
    isActive: true
  })
  const { toast } = useToast()

  // Check if user is DEVELOPER (only role that can add/delete stations)
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
  const isDeveloper = userRole === 'DEVELOPER'

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
      phone: station.phone || '',
      email: station.email || '',
      openingHours: station.openingHours || '',
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
      phone: '',
      email: '',
      openingHours: '',
      isActive: true
    })
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300' : 'bg-muted text-foreground'
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
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
      key: 'phone' as keyof Station,
      title: 'Phone',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value ? (value as string) : '-'}</span>
        </div>
      )
    },
    {
      key: 'openingHours' as keyof Station,
      title: 'Opening Hours',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value ? (value as string) : '-'}</span>
        </div>
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
          {/* Only DEVELOPER can delete stations */}
          {isDeveloper && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row)}
              className="text-red-600 dark:text-red-400 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  const stationsList = Array.isArray(stations) ? stations : []

  const stats = [
    {
      title: 'Total Stations',
      value: stationsList.length.toString(),
      description: 'Registered stations',
      icon: <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    },
    {
      title: 'Active',
      value: stationsList.filter(s => s.isActive).length.toString(),
      description: 'Currently operational',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'Inactive',
      value: stationsList.filter(s => !s.isActive).length.toString(),
      description: 'Not operational',
      icon: <div className="h-5 w-5 bg-red-500/10 dark:bg-red-500/200 rounded-full" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Station Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage petrol stations, locations, and operational details
            </p>
          </div>
        </div>

        {/* Only DEVELOPER can see Add Station button */}
        {isDeveloper && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Station
          </Button>
        )}
      </div>

      {/* Dialog for both Add and Edit - visible to all roles */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +1 234 567 8900"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="station@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="openingHours">Opening Hours</Label>
              <Input
                id="openingHours"
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                placeholder="e.g., Mon-Fri: 6AM-10PM, Sat-Sun: 7AM-9PM"
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
