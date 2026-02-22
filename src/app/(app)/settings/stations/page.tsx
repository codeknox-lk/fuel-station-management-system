'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Clock, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { StationForm, StationData } from '@/components/forms/StationForm'

interface Station extends StationData {
  id: string
  createdAt: string
  updatedAt: string
}

export default function StationsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const { toast } = useToast()

  // Check if user is DEVELOPER or OWNER (roles that can add/delete stations)
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
  const canManageStations = userRole === 'DEVELOPER' || userRole === 'OWNER'

  // State for plan limits
  const [limits, setLimits] = useState<{ currentStations: number; maxStations: number; canAdd: boolean } | null>(null)

  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch('/api/stations')
      const data = await response.json()
      setStations(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch stations",
        variant: "destructive"
      })
    }
  }, [toast])

  const fetchLimits = useCallback(async () => {
    try {
      const res = await fetch('/api/organization/plan')
      if (res.ok) {
        const data = await res.json()
        setLimits(data.limits)
      }
    } catch (err) {
      console.error('Failed to fetch limits', err)
    }
  }, [])

  useEffect(() => {
    fetchStations()
    fetchLimits()
  }, [fetchStations, fetchLimits])

  const handleEdit = (station: Station) => {
    setEditingStation(station)
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
      fetchLimits()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete station",
        variant: "destructive"
      })
    }
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    fetchStations()
    fetchLimits()
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
          {/* Only DEVELOPER/OWNER can delete stations */}
          {canManageStations && (
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
      icon: <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
              Manage petrol stations, locations, and operational details.
            </p>
            {limits && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="border-orange-400/50 text-orange-600 dark:text-orange-400">
                  {limits.currentStations} / {limits.maxStations} Stations Used
                </Badge>
                {!limits.canAdd && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-100 dark:bg-red-900/20 px-2 py-0.5 rounded">Plan limit reached</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Only DEVELOPER/OWNER can see Add Station button */}
        {canManageStations && (
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={() => { setEditingStation(null); setDialogOpen(true); }}
              disabled={!limits?.canAdd && userRole !== 'DEVELOPER'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Station
            </Button>
            {(!limits?.canAdd && userRole !== 'DEVELOPER') && (
              <span className="text-xs text-muted-foreground">Upgrade to add more</span>
            )}
          </div>
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
          <StationForm
            initialData={editingStation}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
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
          enableExport={true}
          exportFileName="stations-list"
        />
      </FormCard>
    </div>
  )
}
