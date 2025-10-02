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
import { Monitor, Plus, Edit, Trash2, CreditCard, Building2, Wifi, WifiOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface POSTerminal {
  id: string
  terminalId: string
  name: string
  stationId: string
  stationName: string
  bankId: string
  bankName: string
  model: string
  serialNumber: string
  ipAddress: string
  location: string
  status: 'active' | 'inactive' | 'maintenance' | 'offline'
  lastSeen: string
  createdAt: string
  updatedAt: string
}

interface Station {
  id: string
  name: string
}

interface Bank {
  id: string
  name: string
}

export default function POSTerminalsPage() {
  const [terminals, setTerminals] = useState<POSTerminal[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<POSTerminal | null>(null)
  const [formData, setFormData] = useState({
    terminalId: '',
    name: '',
    stationId: '',
    bankId: '',
    model: '',
    serialNumber: '',
    ipAddress: '',
    location: '',
    status: 'active' as POSTerminal['status']
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchTerminals()
    fetchStations()
    fetchBanks()
  }, [])

  const fetchTerminals = async () => {
    try {
      const response = await fetch('/api/pos/terminals')
      const data = await response.json()
      setTerminals(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch POS terminals",
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

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      setBanks(data)
    } catch (error) {
      console.error('Failed to fetch banks:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingTerminal ? `/api/pos/terminals/${editingTerminal.id}` : '/api/pos/terminals'
      const method = editingTerminal ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save POS terminal')

      toast({
        title: "Success",
        description: `POS terminal ${editingTerminal ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchTerminals()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingTerminal ? 'update' : 'create'} POS terminal`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (terminal: POSTerminal) => {
    setEditingTerminal(terminal)
    setFormData({
      terminalId: terminal.terminalId,
      name: terminal.name,
      stationId: terminal.stationId,
      bankId: terminal.bankId,
      model: terminal.model,
      serialNumber: terminal.serialNumber,
      ipAddress: terminal.ipAddress,
      location: terminal.location,
      status: terminal.status
    })
    setDialogOpen(true)
  }

  const handleDelete = async (terminal: POSTerminal) => {
    if (!confirm(`Are you sure you want to delete POS terminal "${terminal.name}"?`)) return

    try {
      const response = await fetch(`/api/pos/terminals/${terminal.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete POS terminal')

      toast({
        title: "Success",
        description: "POS terminal deleted successfully"
      })

      fetchTerminals()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete POS terminal",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingTerminal(null)
    setFormData({
      terminalId: '',
      name: '',
      stationId: '',
      bankId: '',
      model: '',
      serialNumber: '',
      ipAddress: '',
      location: '',
      status: 'active'
    })
  }

  const getStatusColor = (status: POSTerminal['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'offline': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: POSTerminal['status']) => {
    switch (status) {
      case 'active': return <Wifi className="h-3 w-3 text-green-600" />
      case 'offline': return <WifiOff className="h-3 w-3 text-red-600" />
      default: return <Monitor className="h-3 w-3 text-gray-600" />
    }
  }

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const columns = [
    {
      key: 'terminalId' as keyof POSTerminal,
      title: 'Terminal ID',
      render: (value: unknown) => (
        <span className="font-mono font-medium">{value as string}</span>
      )
    },
    {
      key: 'name' as keyof POSTerminal,
      title: 'Terminal Name',
      render: (value: unknown) => (
        <div className="font-medium">{value as string}</div>
      )
    },
    {
      key: 'stationName' as keyof POSTerminal,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm">
          <Building2 className="h-3 w-3 text-gray-400" />
          {value as string}
        </div>
      )
    },
    {
      key: 'bankName' as keyof POSTerminal,
      title: 'Bank',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm">
          <CreditCard className="h-3 w-3 text-gray-400" />
          {value as string}
        </div>
      )
    },
    {
      key: 'model' as keyof POSTerminal,
      title: 'Model',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    },
    {
      key: 'location' as keyof POSTerminal,
      title: 'Location',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof POSTerminal,
      title: 'Status',
      render: (value: unknown, row: POSTerminal) => (
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(value as POSTerminal['status'])}>
            <div className="flex items-center gap-1">
              {getStatusIcon(value as POSTerminal['status'])}
              {value ? (value as string).charAt(0).toUpperCase() + (value as string).slice(1) : 'Unknown'}
            </div>
          </Badge>
          <div className="text-xs text-gray-500">
            {formatLastSeen(row.lastSeen)}
          </div>
        </div>
      )
    },
    {
      key: 'id' as keyof POSTerminal,
      title: 'Actions',
      render: (value: unknown, row: POSTerminal) => (
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
      title: 'Total Terminals',
      value: terminals.length.toString(),
      description: 'Registered terminals',
      icon: <Monitor className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: terminals.filter(t => t.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'Offline',
      value: terminals.filter(t => t.status === 'offline').length.toString(),
      description: 'Not responding',
      icon: <div className="h-5 w-5 bg-red-500 rounded-full" />
    },
    {
      title: 'Maintenance',
      value: terminals.filter(t => t.status === 'maintenance').length.toString(),
      description: 'Under maintenance',
      icon: <div className="h-5 w-5 bg-yellow-500 rounded-full" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POS Terminal Management</h1>
          <p className="text-gray-600 mt-2">
            Configure point-of-sale terminals and payment processing devices
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Terminal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTerminal ? 'Edit POS Terminal' : 'Add New POS Terminal'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="terminalId">Terminal ID</Label>
                  <Input
                    id="terminalId"
                    value={formData.terminalId}
                    onChange={(e) => setFormData({ ...formData, terminalId: e.target.value })}
                    placeholder="e.g., POS001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Terminal Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Counter POS"
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
                  <Label htmlFor="bankId">Bank</Label>
                  <select
                    id="bankId"
                    value={formData.bankId}
                    onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select Bank</option>
                    {banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Verifone VX520"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Device serial number"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Counter 1, Office"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as POSTerminal['status'] })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTerminal ? 'Update Terminal' : 'Create Terminal'}
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

      {/* Terminals Table */}
      <FormCard title="POS Terminals" description="Manage point-of-sale terminals and payment processing devices">
        <DataTable
          data={terminals}
          columns={columns}
          searchPlaceholder="Search terminals..."
        />
      </FormCard>
    </div>
  )
}
