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
import { Users, Plus, Edit, Trash2, Phone, Star, Building2, Clock, Award } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Pumper {
  id: string
  name: string
  employeeId: string
  stationId: string
  stationName?: string
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
  shift: 'MORNING' | 'EVENING' | 'NIGHT' | 'ANY'
  phoneNumber: string
  hireDate: string
  experience: number
  rating: number
  specializations: string[]
  createdAt: string
  updatedAt: string
}

interface Station {
  id: string
  name: string
}

export default function PumpersPage() {
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPumper, setEditingPumper] = useState<Pumper | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    stationId: '',
    status: 'ACTIVE' as Pumper['status'],
    shift: 'MORNING' as Pumper['shift'],
    phoneNumber: '',
    hireDate: new Date().toISOString().split('T')[0],
    experience: 0,
    rating: 5,
    specializations: [] as string[]
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPumpers()
    fetchStations()
  }, [])

  const fetchPumpers = async () => {
    try {
      const response = await fetch('/api/pumpers')
      const data = await response.json()
      
      // Map station names to pumpers
      const stationsResponse = await fetch('/api/stations')
      const stationsData = await stationsResponse.json()
      
      const pumpersWithStations = data.map((pumper: Pumper) => ({
        ...pumper,
        stationName: stationsData.find((s: Station) => s.id === pumper.stationId)?.name || 'Unknown Station'
      }))
      
      setPumpers(pumpersWithStations)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pumpers",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations')
      const data = await response.json()
      setStations(data)
    } catch (error) {
      console.error('Failed to fetch stations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPumper ? `/api/pumpers/${editingPumper.id}` : '/api/pumpers'
      const method = editingPumper ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save pumper')

      toast({
        title: "Success",
        description: `Pumper ${editingPumper ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchPumpers()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingPumper ? 'update' : 'create'} pumper`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (pumper: Pumper) => {
    setEditingPumper(pumper)
    setFormData({
      name: pumper.name,
      employeeId: pumper.employeeId,
      stationId: pumper.stationId,
      status: pumper.status,
      shift: pumper.shift,
      phoneNumber: pumper.phoneNumber,
      hireDate: pumper.hireDate,
      experience: pumper.experience,
      rating: pumper.rating,
      specializations: pumper.specializations
    })
    setDialogOpen(true)
  }

  const handleDelete = async (pumper: Pumper) => {
    if (!confirm(`Are you sure you want to delete pumper "${pumper.name}"?`)) return

    try {
      const response = await fetch(`/api/pumpers/${pumper.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete pumper')

      toast({
        title: "Success",
        description: "Pumper deleted successfully"
      })

      fetchPumpers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete pumper",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingPumper(null)
    setFormData({
      name: '',
      employeeId: '',
      stationId: '',
      status: 'ACTIVE',
      shift: 'MORNING',
      phoneNumber: '',
      hireDate: new Date().toISOString().split('T')[0],
      experience: 0,
      rating: 5,
      specializations: []
    })
  }

  const getStatusColor = (status: Pumper['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800'
      case 'ON_LEAVE': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getShiftColor = (shift: Pumper['shift']) => {
    switch (shift) {
      case 'MORNING': return 'bg-blue-100 text-blue-800'
      case 'EVENING': return 'bg-orange-100 text-orange-800'
      case 'NIGHT': return 'bg-purple-100 text-purple-800'
      case 'ANY': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  const handleSpecializationChange = (specialization: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, specialization]
      })
    } else {
      setFormData({
        ...formData,
        specializations: formData.specializations.filter(s => s !== specialization)
      })
    }
  }

  const columns = [
    {
      key: 'employeeId' as keyof Pumper,
      title: 'Employee ID',
      render: (value: unknown) => (
        <span className="font-mono font-medium">{value as string}</span>
      )
    },
    {
      key: 'name' as keyof Pumper,
      title: 'Name',
      render: (value: unknown, row: Pumper) => (
        <div>
          <div className="font-medium">{value as string}</div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {row.phoneNumber}
          </div>
        </div>
      )
    },
    {
      key: 'stationName' as keyof Pumper,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm">
          <Building2 className="h-3 w-3 text-gray-400" />
          {value as string}
        </div>
      )
    },
    {
      key: 'shift' as keyof Pumper,
      title: 'Shift',
      render: (value: unknown) => (
        <Badge className={getShiftColor(value as Pumper['shift'])}>
          <Clock className="h-3 w-3 mr-1" />
          {value as string}
        </Badge>
      )
    },
    {
      key: 'experience' as keyof Pumper,
      title: 'Experience',
      render: (value: unknown) => (
        <div className="text-sm">
          <div className="font-medium">{value as number} years</div>
        </div>
      )
    },
    {
      key: 'rating' as keyof Pumper,
      title: 'Rating',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          {renderStars(value as number)}
          <span className="text-sm text-gray-600 ml-1">{value as number}</span>
        </div>
      )
    },
    {
      key: 'specializations' as keyof Pumper,
      title: 'Specializations',
      render: (value: unknown) => (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((spec, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {spec}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'status' as keyof Pumper,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
        return (
          <Badge className={getStatusColor(status as Pumper['status'])}>
            {status}
          </Badge>
        )
      }
    },
    {
      key: 'id' as keyof Pumper,
      title: 'Actions',
      render: (value: unknown, row: Pumper) => (
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
      title: 'Total Pumpers',
      value: pumpers.length.toString(),
      description: 'Registered pumpers',
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: pumpers.filter(p => p.status === 'ACTIVE').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'On Leave',
      value: pumpers.filter(p => p.status === 'ON_LEAVE').length.toString(),
      description: 'Currently on leave',
      icon: <div className="h-5 w-5 bg-yellow-500 rounded-full" />
    },
    {
      title: 'Avg Rating',
      value: pumpers.length > 0 
        ? (pumpers.reduce((acc, p) => acc + p.rating, 0) / pumpers.length).toFixed(1)
        : '0.0',
      description: 'Average performance',
      icon: <Star className="h-5 w-5 text-yellow-500" />
    }
  ]

  const specializationOptions = ['PETROL', 'DIESEL', 'MAINTENANCE', 'CUSTOMER_SERVICE', 'CASHIER']

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pumper Management</h1>
          <p className="text-gray-600 mt-2">
            Manage pumper employees, their shifts, and specializations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pumper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPumper ? 'Edit Pumper' : 'Add New Pumper'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g., EMP001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stationId">Station</Label>
                  <select
                    id="stationId"
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select Station</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+94771234567"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="shift">Preferred Shift</Label>
                  <select
                    id="shift"
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as Pumper['shift'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="MORNING">Morning</option>
                    <option value="EVENING">Evening</option>
                    <option value="NIGHT">Night</option>
                    <option value="ANY">Any Shift</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Pumper['status'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Experience (Years)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rating">Performance Rating (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 5 })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Specializations</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {specializationOptions.map((spec) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={spec}
                        checked={formData.specializations.includes(spec)}
                        onChange={(e) => handleSpecializationChange(spec, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={spec} className="text-sm font-normal">
                        {spec.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPumper ? 'Update Pumper' : 'Create Pumper'}
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

      {/* Pumpers Table */}
      <FormCard title="Pumpers" description="Manage pumper employees and their assignments">
        <DataTable
          data={pumpers}
          columns={columns}
          searchPlaceholder="Search pumpers..."
        />
      </FormCard>
    </div>
  )
}
