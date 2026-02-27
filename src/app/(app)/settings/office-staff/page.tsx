'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { Briefcase, Plus, Edit, Trash2, Phone, Mail, Building2, DollarSign, ArrowLeft, Users, LayoutGrid, List } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface OfficeStaff {
  id: string
  name: string
  employeeId: string | null
  stationId: string
  role: 'MANAGER' | 'SUPERVISOR' | 'OFFICE_STAFF' | 'ACCOUNTANT' | 'CASHIER'
  phone: string | null
  email: string | null
  baseSalary: number
  specialAllowance?: number
  otherAllowances?: number
  medicalAllowance?: number
  holidayAllowance?: number
  fuelAllowance?: number
  hireDate: string | null
  isActive: boolean
  useStationSalaryDefaults?: boolean
  epfRate?: number | null
  createdAt: string
  updatedAt: string
  station?: {
    id: string
    name: string
    defaultHolidayAllowance?: number
  }
}

export default function OfficeStaffPage() {
  const router = useRouter()

  const { selectedStation, stations } = useStation()
  const [officeStaff, setOfficeStaff] = useState<OfficeStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<OfficeStaff | null>(null)
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    stationId: selectedStation || '',
    role: 'OFFICE_STAFF' as OfficeStaff['role'],
    phone: '',
    email: '',
    baseSalary: 0,
    specialAllowance: 0,
    otherAllowances: 0,
    medicalAllowance: 0,
    holidayAllowance: 0,
    fuelAllowance: 0,
    useStationSalaryDefaults: true,
    epfRate: '' as string | number,
    hireDate: new Date().toISOString().split('T')[0],
    isActive: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { toast } = useToast()

  const fetchOfficeStaff = useCallback(async () => {
    if (!selectedStation) return

    try {
      setLoading(true)
      const response = await fetch(`/api/office-staff?stationId=${selectedStation}`)
      if (!response.ok) throw new Error('Failed to fetch office staff')
      const data = await response.json()
      setOfficeStaff(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch office staff",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [selectedStation, toast])

  useEffect(() => {
    if (selectedStation) {
      fetchOfficeStaff()
      // Update formData stationId when selectedStation changes
      setFormData(prev => ({
        ...prev,
        stationId: selectedStation
      }))
    }
  }, [selectedStation, fetchOfficeStaff])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    // Ensure stationId is set from selectedStation
    if (!selectedStation) {
      toast({
        title: "Error",
        description: "Please select a station first",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingStaff ? `/api/office-staff/${editingStaff.id}` : '/api/office-staff'
      const method = editingStaff ? 'PUT' : 'POST'

      // Always use current selectedStation for stationId
      const submitData = {
        ...formData,
        stationId: selectedStation, // Always use current selectedStation
        ...(editingStaff ? {} : { employeeId: undefined }) // Remove employeeId when creating (auto-generated)
      }

      console.log('📤 Submitting office staff data:', submitData)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      console.log('📥 Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.details || errorData.error || `Failed to ${editingStaff ? 'update' : 'create'} office staff`
        throw new Error(errorMessage)
      }

      await fetchOfficeStaff()
      handleCloseDialog()

      toast({
        title: "Success",
        description: `Office staff ${editingStaff ? 'updated' : 'created'} successfully`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingStaff ? 'update' : 'create'} office staff`,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office staff member?')) return

    try {
      const response = await fetch(`/api/office-staff/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete office staff')
      }

      await fetchOfficeStaff()
      setDeletingStaffId(null)

      toast({
        title: "Success",
        description: "Office staff deleted successfully"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete office staff",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (staff: OfficeStaff) => {
    setEditingStaff(staff)
    setFormData({
      name: staff.name || '',
      employeeId: staff.employeeId || '',
      stationId: staff.stationId || '',
      role: staff.role,
      phone: staff.phone || '',
      email: staff.email || '',
      baseSalary: staff.baseSalary || 0,
      specialAllowance: staff.specialAllowance || 0,
      otherAllowances: staff.otherAllowances || 0,
      medicalAllowance: staff.medicalAllowance || 0,
      holidayAllowance: staff.holidayAllowance || 0,
      fuelAllowance: staff.fuelAllowance || 0,
      useStationSalaryDefaults: staff.useStationSalaryDefaults ?? true,
      epfRate: staff.epfRate ?? '',
      hireDate: staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : '',
      isActive: staff.isActive
    })
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingStaff(null)

    // Find selected station to use its defaults
    let defaultHolidayAllowance = 0
    if (selectedStation) {
      const currentStation = stations.find(s => s.id === selectedStation)
      if (currentStation) {
        defaultHolidayAllowance = currentStation.defaultHolidayAllowance ?? 0
      }
    }

    setFormData({
      name: '',
      employeeId: '',
      stationId: selectedStation || '',
      role: 'OFFICE_STAFF',
      phone: '',
      email: '',
      baseSalary: 0,
      specialAllowance: 0,
      otherAllowances: 0,
      medicalAllowance: 0,
      holidayAllowance: defaultHolidayAllowance,
      fuelAllowance: 0,
      useStationSalaryDefaults: true,
      epfRate: '',
      hireDate: new Date().toISOString().split('T')[0],
      isActive: true
    })
  }

  const columns = [
    {
      key: 'name' as keyof OfficeStaff,
      title: 'Name',
      render: (value: unknown, row: OfficeStaff) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            {row.employeeId && (
              <div className="text-xs text-muted-foreground">ID: {row.employeeId}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role' as keyof OfficeStaff,
      title: 'Role',
      render: (value: unknown) => (
        <Badge variant="outline">{String(value).replace('_', ' ')}</Badge>
      )
    },
    {
      key: 'phone' as keyof OfficeStaff,
      title: 'Phone',
      render: (value: unknown) => value ? (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{value as string}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
    {
      key: 'email' as keyof OfficeStaff,
      title: 'Email',
      render: (value: unknown) => value ? (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span>{value as string}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
    {
      key: 'baseSalary' as keyof OfficeStaff,
      title: 'Base Salary',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span>Rs. {(value as (number) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )
    },
    {
      key: 'isActive' as keyof OfficeStaff,
      title: 'Status',
      render: (value: unknown) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'id' as keyof OfficeStaff,
      title: 'Actions',
      render: (value: unknown, row: OfficeStaff) => (
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
            onClick={() => handleDelete(row.id)}
            disabled={deletingStaffId === row.id}
            className="text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
          >
            {deletingStaffId === row.id ? (
              <span className="text-xs">Deleting...</span>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )
    }
  ]

  if (!selectedStation) {
    return (
      <div className="space-y-6 p-6">
        <FormCard title="Office Staff Management" description="Manage office staff members">
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>Please select a station to manage office staff</p>
          </div>
        </FormCard>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
            className="hidden md:flex"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/settings')}
            className="md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary" />
              Office Staff Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage office employees (Managers, Supervisors, Office Staff, Accountants, Cashiers).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-background mr-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCloseDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Office Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStaff ? 'Edit Office Staff' : 'Add New Office Staff'}</DialogTitle>
                <DialogDescription>
                  {editingStaff ? 'Update office staff information' : 'Enter details for the new office staff member'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder={editingStaff ? formData.employeeId : "Auto-generated (OFC001)"}
                      disabled={!editingStaff}
                    />
                    {!editingStaff && (
                      <p className="text-xs text-muted-foreground mt-1">Auto-generated on creation</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => {
                        const newRole = value as OfficeStaff['role']
                        // Reset fuel allowance if role changes from MANAGER
                        setFormData({
                          ...formData,
                          role: newRole,
                          fuelAllowance: newRole === 'MANAGER' ? formData.fuelAllowance : 0
                        })
                      }}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        <SelectItem value="OFFICE_STAFF">Office Staff</SelectItem>
                        <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                        <SelectItem value="CASHIER">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="baseSalary">Base Salary (Rs.) *</Label>
                    <MoneyInput
                      value={formData.baseSalary}
                      onChange={(value) => setFormData({ ...formData, baseSalary: value || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-semibold">Allowances (Rs.)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="specialAllowance">Special Allowance</Label>
                      <MoneyInput
                        value={formData.specialAllowance}
                        onChange={(value) => setFormData({ ...formData, specialAllowance: value || 0 })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Different for each staff member</p>
                    </div>
                    <div>
                      <Label htmlFor="otherAllowances">Other Allowances</Label>
                      <MoneyInput
                        value={formData.otherAllowances}
                        onChange={(value) => setFormData({ ...formData, otherAllowances: value || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="medicalAllowance">Medical Allowance</Label>
                      <MoneyInput
                        value={formData.medicalAllowance}
                        onChange={(value) => setFormData({ ...formData, medicalAllowance: value || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="holidayAllowance">Holiday Allowance</Label>
                      <MoneyInput
                        value={formData.holidayAllowance}
                        onChange={(value) => setFormData({ ...formData, holidayAllowance: value || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuelAllowance">Fuel Allowance</Label>
                      <MoneyInput
                        value={formData.fuelAllowance}
                        onChange={(value) => setFormData({ ...formData, fuelAllowance: value || 0 })}
                        placeholder="0.00"
                        disabled={formData.role !== 'MANAGER'}
                      />
                      {formData.role === 'MANAGER' ? (
                        <p className="text-xs text-muted-foreground mt-1">Only for managers</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 text-orange-600">Only available for Manager role</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-border/50 rounded-lg p-4 bg-muted/20 space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useStationSalaryDefaults"
                      checked={formData.useStationSalaryDefaults}
                      onChange={(e) => setFormData({ ...formData, useStationSalaryDefaults: e.target.checked })}
                      className="rounded border-border"
                      aria-label="Use Station Default Salary Settings"
                      title="Use Station Default Salary Settings"
                    />
                    <Label htmlFor="useStationSalaryDefaults" className="font-semibold cursor-pointer">
                      Use Station Default Salary Settings
                    </Label>
                  </div>

                  {!formData.useStationSalaryDefaults && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <Label htmlFor="epfRate">Custom EPF Rate (%)</Label>
                        <Input
                          id="epfRate"
                          type="number"
                          step="0.01"
                          value={formData.epfRate}
                          onChange={(e) => setFormData({ ...formData, epfRate: e.target.value })}
                          placeholder="e.g. 8"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0712345678"
                      type="tel"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hireDate">Hire Date</Label>
                    <Input
                      id="hireDate"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      type="date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="isActive">Status</Label>
                    <Select
                      value={formData.isActive ? 'true' : 'false'}
                      onValueChange={(value) => setFormData({ ...formData, isActive: value === 'true' })}
                    >
                      <SelectTrigger id="isActive">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingStaff ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Staff',
            value: officeStaff.length.toString(),
            description: 'Registered employees',
            icon: <Users className="h-5 w-5 text-primary" />
          },
          {
            title: 'Active',
            value: officeStaff.filter(s => s.isActive).length.toString(),
            description: 'Currently active',
            icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/20 rounded-full" />
          },
          {
            title: 'Managers',
            value: officeStaff.filter(s => s.role === 'MANAGER').length.toString(),
            description: 'Management roles',
            icon: <Briefcase className="h-5 w-5 text-primary" />
          },
          {
            title: 'Total Salary',
            value: `Rs. ${officeStaff.reduce((acc, curr) => acc + (curr.baseSalary || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            description: 'Monthly base payroll',
            icon: <DollarSign className="h-5 w-5 text-primary" />
          }
        ].map((stat, index) => (
          <Card key={index} className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className="p-2 bg-muted rounded-full">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormCard
        title="Office Staff List"
        description={`Office staff members for ${stations.find(s => s.id === selectedStation)?.name || 'selected station'}`}
        className="bg-card border"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : officeStaff.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No office staff found</p>
            <p className="text-sm">Click &quot;Add Office Staff&quot; to create a new office staff member</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {officeStaff.map((staff) => (
              <Card key={staff.id} className="group hover:shadow-lg transition-all duration-200">
                <CardContent className="p-0">
                  {/* Staff Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {staff.name.charAt(0)}
                      </div>
                      <Badge variant={staff.isActive ? 'default' : 'secondary'}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                        {staff.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {staff.role.replace('_', ' ')}
                        </Badge>
                        {staff.employeeId && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            ID: {staff.employeeId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-6 py-4 space-y-3 bg-muted/30 border-y border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-4 w-4" />
                        Phone
                      </span>
                      <span className="font-medium text-xs">{staff.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        Email
                      </span>
                      <span className="font-medium text-xs truncate max-w-[120px]" title={staff.email || ''}>
                        {staff.email || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        Base Salary
                      </span>
                      <span className="font-medium text-xs">Rs. {staff.baseSalary.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 pt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(staff)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(staff.id)}
                      disabled={deletingStaffId === staff.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <DataTable
            data={officeStaff}
            columns={columns}
            searchPlaceholder="Search office staff..."
          />
        )}
      </FormCard>
    </div>
  )
}
