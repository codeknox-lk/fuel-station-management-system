'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Edit, Trash2, Phone, Star, Building2, Clock, Award, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'

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
  baseSalary?: number
  holidayAllowance?: number
}

interface Station {
  id: string
  name: string
}

export default function PumpersPage() {
  const router = useRouter()
  const { selectedStation, isAllStations } = useStation()
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPumper, setEditingPumper] = useState<Pumper | null>(null)
  const [deletingPumperId, setDeletingPumperId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    stationId: !isAllStations && selectedStation ? selectedStation : '',
    status: 'ACTIVE' as Pumper['status'],
    shift: 'MORNING' as Pumper['shift'],
    phoneNumber: '',
    hireDate: new Date().toISOString().split('T')[0],
    experience: 0,
    rating: 5,
    specializations: [] as string[],
    baseSalary: 0,
    holidayAllowance: 4500
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPumpers()
    fetchStations()
    // Update formData stationId when selectedStation changes
    if (selectedStation && !isAllStations) {
      setFormData(prev => ({
        ...prev,
        stationId: selectedStation
      }))
    }
  }, [selectedStation])

  const fetchPumpers = async () => {
    try {
      const url = isAllStations
        ? '/api/pumpers'
        : `/api/pumpers?stationId=${selectedStation}`

      const response = await fetch(url)
      const data = await response.json()

      // Map station names to pumpers
      const stationsResponse = await fetch('/api/stations')
      const stationsData = await stationsResponse.json()

      interface ApiPumper {
        id: string
        name: string
        employeeId: string
        stationId: string
        shift: string
        status: string
        phone?: string
        phoneNumber?: string
        hireDate?: string
        experience?: number
        rating?: number
        specializations?: string[] | string
        baseSalary?: number
        holidayAllowance?: number
        createdAt: string
        updatedAt: string
      }

      const pumpersWithStations = data.map((pumper: ApiPumper) => ({
        ...pumper,
        stationName: stationsData.find((s: Station) => s.id === pumper.stationId)?.name || 'Unknown Station',
        // Map phone to phoneNumber for frontend compatibility
        phoneNumber: pumper.phone || pumper.phoneNumber || '',
        // Ensure specializations is always an array (handle null, undefined, or string)
        specializations: Array.isArray(pumper.specializations)
          ? pumper.specializations
          : (pumper.specializations ? [pumper.specializations] : []),
        shift: (pumper.shift as Pumper['shift']) || 'MORNING',
        status: (pumper.status as Pumper['status']) || 'ACTIVE',
        hireDate: pumper.hireDate || new Date().toISOString().split('T')[0],
        experience: pumper.experience || 0,
        rating: pumper.rating || 0
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

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingPumper ? `/api/pumpers/${editingPumper.id}` : '/api/pumpers'
      const method = editingPumper ? 'PUT' : 'POST'

      // Remove employeeId from formData when creating (always auto-generated)
      const submitData = editingPumper
        ? formData // Keep employeeId when editing (display only)
        : { ...formData, employeeId: undefined } // Remove employeeId when creating

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || `Failed to ${editingPumper ? 'update' : 'create'} pumper`
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Verify ID matches when editing
      if (editingPumper && result.id !== editingPumper.id) {
        throw new Error('Update failed: Returned pumper ID does not match')
      }

      toast({
        title: "Success",
        description: `Pumper ${editingPumper ? 'updated' : 'created'} successfully`
      })

      // Close dialog and reset
      setDialogOpen(false)
      setEditingPumper(null)
      resetForm()

      // Refresh list
      fetchPumpers()
    } catch (error) {
      console.error('❌ Error submitting pumper:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save pumper',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (pumper: Pumper) => {
    setEditingPumper(pumper)
    setFormData({
      name: pumper.name || '',
      employeeId: pumper.employeeId || '',
      stationId: pumper.stationId || '',
      status: pumper.status || 'ACTIVE',
      shift: pumper.shift || 'MORNING',
      // Use phoneNumber if available, otherwise fallback to phone property
      phoneNumber: pumper.phoneNumber || '',
      hireDate: pumper.hireDate ? (new Date(pumper.hireDate).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      experience: typeof pumper.experience === 'number' ? pumper.experience : (pumper.experience ? parseFloat(String(pumper.experience)) : 0),
      rating: typeof pumper.rating === 'number' ? pumper.rating : (pumper.rating ? parseFloat(String(pumper.rating)) : 5),
      specializations: Array.isArray(pumper.specializations) ? pumper.specializations : [],
      baseSalary: pumper.baseSalary || 0,
      holidayAllowance: pumper.holidayAllowance || 4500
    })
    setDialogOpen(true)
  }

  const handleDelete = async (pumper: Pumper) => {
    if (!confirm(`Are you sure you want to delete pumper "${pumper.name}"?`)) return

    // Prevent double deletion
    if (deletingPumperId === pumper.id) {
      console.log('⚠️  Already deleting this pumper, ignoring duplicate request')
      return
    }

    setDeletingPumperId(pumper.id)

    try {
      console.log('🔄 Deleting pumper:', { id: pumper.id, name: pumper.name })

      const response = await fetch(`/api/pumpers/${pumper.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        interface ErrorResponse {
          error?: string
          details?: string
          [key: string]: unknown
        }
        let errorData: ErrorResponse = {}
        try {
          const text = await response.text()
          console.log('📥 Raw error response text:', text)

          if (text && text.trim()) {
            try {
              errorData = JSON.parse(text)
              console.log('✅ Parsed error data:', errorData)
            } catch (jsonError) {
              console.error('❌ Failed to parse JSON:', jsonError)
              // If not JSON, treat as plain text error
              errorData = {
                error: text || `HTTP ${response.status} ${response.statusText}`,
                details: text || `Server returned status ${response.status}`
              }
            }
          } else {
            // Empty response body
            errorData = {
              error: `HTTP ${response.status} ${response.statusText}`,
              details: `Server returned status ${response.status} with no error details`
            }
            console.warn('⚠️  Empty response body from server')
          }
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
          errorData = {
            error: `HTTP ${response.status} ${response.statusText}`,
            details: 'Failed to parse error response from server'
          }
        }

        console.error('❌ Delete error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          headers: Object.fromEntries(response.headers.entries())
        })

        const errorMessage = errorData.details || errorData.error || `Failed to delete pumper (${response.status})`

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
        setDeletingPumperId(null)
        return
      }

      const result = await response.json()
      console.log('✅ Delete success:', result)

      // Optimistically remove from UI immediately
      setPumpers(prevPumpers => prevPumpers.filter(p => p.id !== pumper.id))

      toast({
        title: "Success",
        description: result.message || "Pumper deleted successfully"
      })

      // Refresh the list to ensure we have latest data
      setTimeout(() => {
        fetchPumpers()
        setDeletingPumperId(null)
      }, 300)
    } catch (error) {
      console.error('❌ Error deleting pumper:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to delete pumper'

      // Restore the pumper in UI if deletion failed
      fetchPumpers()

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
      setDeletingPumperId(null)
    }
  }


  const resetForm = () => {
    setEditingPumper(null)
    setFormData({
      name: '',
      employeeId: '',
      stationId: !isAllStations && selectedStation ? selectedStation : '',
      status: 'ACTIVE',
      shift: 'MORNING',
      phoneNumber: '',
      hireDate: new Date().toISOString().split('T')[0],
      experience: 0,
      rating: 5,
      specializations: [],
      baseSalary: 0,
      holidayAllowance: 4500
    })
  }

  const getStatusColor = (status: Pumper['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'INACTIVE': return 'bg-muted text-foreground'
      case 'ON_LEAVE': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getShiftColor = (shift: Pumper['shift']) => {
    switch (shift) {
      case 'MORNING': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'EVENING': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'NIGHT': return 'bg-purple-500/20 text-purple-400 dark:bg-purple-600/30 dark:text-purple-300'
      case 'ANY': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
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
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'name' as keyof Pumper,
      title: 'Name',
      render: (value: unknown, row: Pumper) => (
        <div>
          <div className="font-medium">{value as string}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {row.phoneNumber || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'stationName' as keyof Pumper,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm">
          <Building2 className="h-3 w-3 text-muted-foreground" />
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
          <span className="text-sm text-muted-foreground ml-1">{value as number}</span>
        </div>
      )
    },
    {
      key: 'specializations' as keyof Pumper,
      title: 'Specializations',
      render: (value: unknown) => {
        // Ensure value is an array before mapping
        const specializations = Array.isArray(value) ? value : (value ? [value] : [])

        if (specializations.length === 0) {
          return <span className="text-muted-foreground text-sm">None</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {specializations.map((spec, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        )
      }
    },
    {
      key: 'status' as keyof Pumper,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-muted text-foreground">Unknown</Badge>
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
            disabled={deletingPumperId === row.id}
            className="text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
          >
            {deletingPumperId === row.id ? (
              <span className="text-xs">Deleting...</span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
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
      icon: <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    },
    {
      title: 'Active',
      value: pumpers.filter(p => p.status === 'ACTIVE').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'On Leave',
      value: pumpers.filter(p => p.status === 'ON_LEAVE').length.toString(),
      description: 'Currently on leave',
      icon: <div className="h-5 w-5 bg-yellow-500/10 dark:bg-yellow-500/200 rounded-full" />
    },
    {
      title: 'Avg Rating',
      value: pumpers.length > 0
        ? (pumpers.reduce((acc, p) => acc + p.rating, 0) / pumpers.length).toFixed(1)
        : '0.0',
      description: 'Average performance',
      icon: <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
    }
  ]

  const specializationOptions = ['PETROL', 'DIESEL', 'MAINTENANCE', 'CUSTOMER_SERVICE', 'CASHIER']

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pumper Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage pumper employees, their shifts, and specializations
            </p>
          </div>
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
              <DialogDescription>
                {editingPumper ? 'Update pumper information and details' : 'Add a new pumper to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Silva"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="employeeId">
                    Employee ID
                    <span className="text-xs text-muted-foreground ml-2">(Auto-generated)</span>
                  </Label>
                  <Input
                    id="employeeId"
                    value={editingPumper ? (formData.employeeId || '') : 'Auto-generated on save'}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder={editingPumper ? "Employee ID (read-only)" : "Will be auto-generated (e.g., EMP001)"}
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
                    value={formData.phoneNumber || ''}
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
                    value={formData.hireDate || new Date().toISOString().split('T')[0]}
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
                    value={formData.experience || 0}
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
                    value={formData.rating || 5}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 5 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baseSalary">Base Monthly Salary (LKR)</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.baseSalary || 0}
                    onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) || 0 })}
                    placeholder="27000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Base monthly salary (default: 27000)
                  </p>
                </div>
                <div>
                  <Label htmlFor="holidayAllowance">Holiday Allowance (LKR)</Label>
                  <Input
                    id="holidayAllowance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.holidayAllowance || 4500}
                    onChange={(e) => setFormData({ ...formData, holidayAllowance: parseFloat(e.target.value) || 4500 })}
                    placeholder="4500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Monthly holiday allowance (default: 4500). Deduct 900rs per rest day taken (up to 5 rest days)
                  </p>
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
                        className="rounded border-border"
                      />
                      <Label htmlFor={spec} className="text-sm font-normal">
                        {spec.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingPumper ? 'Update Pumper' : 'Create Pumper')}
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

