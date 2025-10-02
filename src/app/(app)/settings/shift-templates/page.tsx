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
import { Clock, Plus, Edit, Trash2, Coffee, Moon, Sun } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  breakDuration: number // minutes
  breakStartTime: string
  description: string
  isDefault: boolean
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export default function ShiftTemplatesPage() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    startTime: '06:00',
    endTime: '14:00',
    breakDuration: 30,
    breakStartTime: '10:00',
    description: '',
    isDefault: false,
    status: 'active' as ShiftTemplate['status']
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/shift-templates')
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch shift templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingTemplate ? `/api/shift-templates/${editingTemplate.id}` : '/api/shift-templates'
      const method = editingTemplate ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save shift template')

      toast({
        title: "Success",
        description: `Shift template ${editingTemplate ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingTemplate ? 'update' : 'create'} shift template`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      breakDuration: template.breakDuration,
      breakStartTime: template.breakStartTime,
      description: template.description,
      isDefault: template.isDefault,
      status: template.status
    })
    setDialogOpen(true)
  }

  const handleDelete = async (template: ShiftTemplate) => {
    if (!confirm(`Are you sure you want to delete shift template "${template.name}"?`)) return

    try {
      const response = await fetch(`/api/shift-templates/${template.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete shift template')

      toast({
        title: "Success",
        description: "Shift template deleted successfully"
      })

      fetchTemplates()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete shift template",
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
      breakStartTime: '10:00',
      description: '',
      isDefault: false,
      status: 'active'
    })
  }

  const getStatusColor = (status: ShiftTemplate['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getShiftIcon = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0])
    if (hour >= 6 && hour < 14) return <Sun className="h-4 w-4 text-yellow-500" />
    if (hour >= 14 && hour < 22) return <Coffee className="h-4 w-4 text-orange-500" />
    return <Moon className="h-4 w-4 text-blue-500" />
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
          {getShiftIcon(row.startTime)}
          <div>
            <div className="font-medium">{value as string}</div>
            {row.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'startTime' as keyof ShiftTemplate,
      title: 'Shift Hours',
      render: (value: unknown, row: ShiftTemplate) => (
        <div className="text-sm">
          <div className="font-mono">{value as string} - {row.endTime}</div>
          <div className="text-gray-500">
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
            <Coffee className="h-3 w-3 text-gray-400" />
            {value as number} minutes
          </div>
          <div className="text-gray-500 font-mono text-xs">
            @ {row.breakStartTime}
          </div>
        </div>
      )
    },
    {
      key: 'description' as keyof ShiftTemplate,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">
          {(value as string) || 'No description'}
        </span>
      )
    },
    {
      key: 'status' as keyof ShiftTemplate,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
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
            className="text-red-600 hover:text-red-700"
            disabled={row.isDefault}
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
      icon: <Clock className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: templates.filter(t => t.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'Default',
      value: templates.filter(t => t.isDefault).length.toString(),
      description: 'Default template',
      icon: <Sun className="h-5 w-5 text-yellow-500" />
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
      icon: <Coffee className="h-5 w-5 text-purple-500" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Templates</h1>
          <p className="text-gray-600 mt-2">
            Manage shift patterns and working hour templates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="breakStartTime">Break Start Time</Label>
                  <Input
                    id="breakStartTime"
                    type="time"
                    value={formData.breakStartTime}
                    onChange={(e) => setFormData({ ...formData, breakStartTime: e.target.value })}
                    required
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

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isDefault">Set as default template</Label>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ShiftTemplate['status'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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
