'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, Edit, Trash2, Coffee, Moon, Sun, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'

interface ShiftTemplate {
  id: string
  stationId: string
  name: string
  startTime: string
  endTime: string
  breakDuration: number // minutes
  breakStartTime: string
  description: string
  icon?: string // "sun", "coffee", or "moon"
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export default function ShiftTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  // const [loading, setLoading] = useState(true) // Removed unused loading
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    startTime: '06:00',
    endTime: '14:00',
    breakDuration: 30,
    breakStartTime: '',
    description: '',
    icon: 'sun',
    status: 'active' as ShiftTemplate['status']
  })
  const { toast } = useToast()
  const { selectedStation, isAllStations } = useStation()

  const fetchTemplates = useCallback(async () => {
    try {
      console.log('Fetching templates for station:', selectedStation)

      // Build URL with stationId filter
      const url = isAllStations
        ? '/api/shift-templates?t=' + Date.now()
        : `/api/shift-templates?stationId=${selectedStation}&t=${Date.now()}`

      const response = await fetch(url)
      const data = await response.json()
      console.log('Fetched templates:', data)
      console.log('Is array?', Array.isArray(data))

      // Handle error response or non-array data
      if (!Array.isArray(data)) {
        console.error('API returned non-array:', data)
        setTemplates([])
        return
      }

      interface ApiShiftTemplate extends Omit<ShiftTemplate, 'status'> {
        isActive: boolean
      }

      // Map isActive to status for the UI
      const mappedData = data.map((template: ApiShiftTemplate) => ({
        ...template,
        status: (template.isActive ? 'active' : 'inactive') as 'active' | 'inactive'
      }))
      console.log('Mapped templates:', mappedData)
      setTemplates(mappedData)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast({
        title: "Error",
        description: "Failed to fetch shift templates",
        variant: "destructive"
      })
    }
  }, [selectedStation, isAllStations, toast])

  useEffect(() => {
    fetchTemplates()
  }, [selectedStation, fetchTemplates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Only validate station selection for new templates
    // For editing, use the template's existing stationId
    if (!editingTemplate && (isAllStations || !selectedStation)) {
      toast({
        title: "Error",
        description: "Please select a specific station to create a shift template",
        variant: "destructive"
      })
      return
    }

    try {
      const url = editingTemplate ? `/api/shift-templates/${editingTemplate.id}` : '/api/shift-templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      // Include stationId in the request body
      // For editing, preserve the original stationId from the template
      const requestBody = {
        ...formData,
        stationId: editingTemplate ? editingTemplate.stationId : selectedStation
      }

      console.log('Submitting shift template:', { url, method, requestBody })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const responseData = await response.json()
      console.log('Response:', response.status, responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to save shift template')
      }

      toast({
        title: "Success",
        description: `Shift template ${editingTemplate ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchTemplates()
    } catch (error) {
      console.error('Error saving shift template:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingTemplate ? 'update' : 'create'} shift template`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name || '',
      startTime: template.startTime || '',
      endTime: template.endTime || '',
      breakDuration: template.breakDuration || 0,
      breakStartTime: template.breakStartTime || '',
      description: template.description || '',
      icon: template.icon || 'sun',
      status: template.status
    })
    setDialogOpen(true)
  }

  const handleDelete = async (template: ShiftTemplate) => {
    if (!confirm(`Are you sure you want to delete shift template "${template.name}"?`)) return

    try {
      console.log('Deleting shift template:', template.id)

      const response = await fetch(`/api/shift-templates/${template.id}`, {
        method: 'DELETE'
      })

      const responseData = await response.json()
      console.log('Delete response:', response.status, responseData)

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete shift template')
      }

      toast({
        title: "Success",
        description: "Shift template deleted successfully"
      })

      fetchTemplates()
    } catch (error) {
      console.error('Error deleting shift template:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete shift template",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      startTime: '06:00',
      endTime: '14:00',
      breakDuration: 30,
      breakStartTime: '',
      description: '',
      icon: 'sun',
      status: 'active'
    })
  }

  const getStatusColor = (status: ShiftTemplate['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'inactive': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getShiftIcon = (icon?: string, startTime?: string) => {
    // Use provided icon, or fall back to time-based logic
    const iconType = icon || (() => {
      if (!startTime) return 'sun'
      const hour = parseInt(startTime.split(':')[0])
      if (hour >= 6 && hour < 14) return 'sun'
      if (hour >= 14 && hour < 22) return 'coffee'
      return 'moon'
    })()

    switch (iconType) {
      case 'sun':
        return <Sun className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'coffee':
        return <Coffee className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'moon':
        return <Moon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      default:
        return <Sun className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    }
  }

  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }

    const duration = endMinutes - startMinutes
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60

    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
  }

  const columns = [
    {
      key: 'name' as keyof ShiftTemplate,
      title: 'Template Name',
      render: (value: unknown, row: ShiftTemplate) => (
        <div className="flex items-center gap-2">
          {getShiftIcon(row.icon, row.startTime)}
          <div>
            <div className="font-medium">{value as string}</div>
          </div>
        </div>
      )
    },
    {
      key: 'startTime' as keyof ShiftTemplate,
      title: 'Shift Hours',
      render: (value: unknown, row: ShiftTemplate) => (
        <div className="text-sm">
          <div className="">{value as string} - {row.endTime}</div>
          <div className="text-muted-foreground">
            {calculateDuration(value as string, row.endTime)}
          </div>
        </div>
      )
    },
    {
      key: 'breakDuration' as keyof ShiftTemplate,
      title: 'Break',
      render: (value: unknown, row: ShiftTemplate) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Coffee className="h-3 w-3 text-muted-foreground" />
            {value as number} minutes
          </div>
          <div className="text-muted-foreground text-xs">
            {row.breakStartTime ? `@ ${row.breakStartTime}` : ''}
          </div>
        </div>
      )
    },
    {
      key: 'description' as keyof ShiftTemplate,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {(value as string) || 'No description'}
        </span>
      )
    },
    {
      key: 'status' as keyof ShiftTemplate,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-muted text-foreground">Unknown</Badge>
        return (
          <Badge className={getStatusColor(status as ShiftTemplate['status'])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      }
    },
    {
      key: 'id' as keyof ShiftTemplate,
      title: 'Actions',
      render: (value: unknown, row: ShiftTemplate) => (
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
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const stats = [
    {
      title: 'Total Templates',
      value: templates.length.toString(),
      description: 'Shift templates',
      icon: <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    },
    {
      title: 'Active',
      value: templates.filter(t => t.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'Avg Duration',
      value: templates.length > 0
        ? `${Math.round(templates.reduce((acc, t) => {
          const [startHour, startMin] = t.startTime.split(':').map(Number)
          const [endHour, endMin] = t.endTime.split(':').map(Number)
          let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin)
          if (duration < 0) duration += 24 * 60
          return acc + duration
        }, 0) / templates.length / 60)}h`
        : '0h',
      description: 'Average shift length',
      icon: <Coffee className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
            <h1 className="text-3xl font-bold text-foreground">Shift Templates</h1>
            <p className="text-muted-foreground mt-2">
              Manage shift patterns and working hour templates
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-white text-teal-900 hover:bg-teal-100 border-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Shift Template' : 'Add New Shift Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Shift, Night Shift"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    min="0"
                    max="120"
                    value={formData.breakDuration}
                    onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="breakStartTime">Break Start Time (Optional)</Label>
                  <Input
                    id="breakStartTime"
                    type="time"
                    value={formData.breakStartTime}
                    onChange={(e) => setFormData({ ...formData, breakStartTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <Label>Shift Icon</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: 'sun' })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.icon === 'sun'
                      ? 'border-yellow-600 bg-yellow-600/10 dark:border-yellow-400 dark:bg-yellow-400/10'
                      : 'border-border hover:border-yellow-600/50 dark:hover:border-yellow-400/50'
                      }`}
                  >
                    <Sun className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-xs font-medium">Morning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: 'coffee' })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.icon === 'coffee'
                      ? 'border-orange-600 bg-orange-600/10 dark:border-orange-400 dark:bg-orange-400/10'
                      : 'border-border hover:border-orange-600/50 dark:hover:border-orange-400/50'
                      }`}
                  >
                    <Coffee className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium">Evening</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: 'moon' })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.icon === 'moon'
                      ? 'border-orange-600 bg-orange-600/10 dark:border-orange-400 dark:bg-orange-400/10'
                      : 'border-border hover:border-orange-600/50 dark:hover:border-orange-400/50'
                      }`}
                  >
                    <Moon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-medium">Night</span>
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  title="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ShiftTemplate['status'] })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
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

      {/* Templates Table */}
      <FormCard title="Shift Templates" description="Manage shift patterns and working hour configurations">
        <DataTable
          data={templates}
          columns={columns}
          searchPlaceholder="Search templates..."
        />
      </FormCard>
    </div>
  )
}
