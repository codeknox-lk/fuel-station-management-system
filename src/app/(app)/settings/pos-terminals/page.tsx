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
import { Monitor, Plus, Edit, Trash2, Building2, Wifi, CreditCard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useStation } from '@/contexts/StationContext'

interface POSTerminal {
  id: string
  terminalNumber: string
  name: string
  stationId: string
  station?: {
    id: string
    name: string
  }
  bankId?: string
  bank?: {
    id: string
    name: string
  }
  isActive: boolean
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
  accountNumber?: string | null
}

export default function POSTerminalsPage() {
  const router = useRouter()
  const { selectedStation, isAllStations } = useStation()
  const [terminals, setTerminals] = useState<POSTerminal[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState<POSTerminal | null>(null)
  const [formData, setFormData] = useState({
    terminalNumber: '',
    name: '',
    stationId: '',
    bankId: '',
    isActive: true
  })
  const { toast } = useToast()

  const fetchTerminals = useCallback(async () => {
    try {
      // Build URL with stationId filter
      const url = isAllStations
        ? '/api/pos/terminals'
        : `/api/pos/terminals?stationId=${selectedStation}`

      const response = await fetch(url)
      const data = await response.json()
      setTerminals(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch POS terminals",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [isAllStations, selectedStation, toast])

  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch('/api/stations')
      const data = await response.json()
      setStations(data)
    } catch (error) {
      console.error('Failed to fetch stations:', error)
    }
  }, [])

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      setBanks(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch banks:', error)
      setBanks([])
    }
  }, [])

  useEffect(() => {
    fetchTerminals()
    fetchStations()
    fetchBanks()
  }, [selectedStation, fetchTerminals, fetchStations, fetchBanks])

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
      console.error('Failed to save terminal:', error)
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
      terminalNumber: terminal.terminalNumber || '',
      name: terminal.name || '',
      stationId: terminal.stationId || '',
      bankId: terminal.bankId || '',
      isActive: terminal.isActive
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
      console.error('Failed to delete terminal:', error)
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
      terminalNumber: '',
      name: '',
      stationId: !isAllStations && selectedStation ? selectedStation : '',
      bankId: '',
      isActive: true
    })
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300' : 'bg-muted text-foreground'
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" /> : <Monitor className="h-3 w-3 text-muted-foreground" />
  }

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive'
  }

  const columns = [
    {
      key: 'terminalNumber' as keyof POSTerminal,
      title: 'Terminal Number',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
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
      key: 'station' as keyof POSTerminal,
      title: 'Station',
      render: (value: unknown) => {
        const station = value as { name: string } | undefined
        return (
          <div className="flex items-center gap-1 text-sm">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {station?.name || 'Unknown'}
          </div>
        )
      }
    },
    {
      key: 'bank' as keyof POSTerminal,
      title: 'Bank',
      render: (value: unknown) => {
        const bank = value as { name: string } | undefined
        return (
          <div className="flex items-center gap-1 text-sm">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            {bank?.name || '-'}
          </div>
        )
      }
    },
    {
      key: 'isActive' as keyof POSTerminal,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as boolean)}>
          <div className="flex items-center gap-1">
            {getStatusIcon(value as boolean)}
            {getStatusText(value as boolean)}
          </div>
        </Badge>
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
            className="text-red-600 dark:text-red-400 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const safeTerminals = Array.isArray(terminals) ? terminals : []

  const stats = [
    {
      title: 'Total Terminals',
      value: safeTerminals.length.toString(),
      description: 'Registered terminals',
      icon: <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    },
    {
      title: 'Active',
      value: safeTerminals.filter(t => t.isActive).length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'Inactive',
      value: safeTerminals.filter(t => !t.isActive).length.toString(),
      description: 'Not active',
      icon: <div className="h-5 w-5 bg-muted0 rounded-full" />
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
            <h1 className="text-3xl font-bold text-foreground">POS Terminal Management</h1>
            <p className="text-muted-foreground mt-2">
              Configure point-of-sale terminals and payment processing devices
            </p>
          </div>
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
              <div>
                <Label htmlFor="terminalNumber">Terminal Number</Label>
                <Input
                  id="terminalNumber"
                  value={formData.terminalNumber}
                  onChange={(e) => setFormData({ ...formData, terminalNumber: e.target.value })}
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

              <div>
                <Label htmlFor="stationId">Station</Label>
                <select
                  id="stationId"
                  aria-label="Station"
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
                  aria-label="Bank"
                  value={formData.bankId}
                  onChange={(e) => setFormData({ ...formData, bankId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Bank (Optional)</option>
                  {banks && banks.length > 0 ? (
                    banks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}{bank.accountNumber ? ` - ${bank.accountNumber}` : ''}
                      </option>
                    ))
                  ) : (
                    <option disabled>Loading banks...</option>
                  )}
                </select>
              </div>

              {editingTerminal && (
                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    aria-label="Status"
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Terminals Table */}
      <FormCard title="POS Terminals" description="Manage point-of-sale terminals and payment processing devices">
        <DataTable
          data={safeTerminals}
          columns={columns}
          searchPlaceholder="Search terminals..."
          loading={loading}
          enableExport={true}
          exportFileName="pos-terminals-list"
        />
      </FormCard>
    </div>
  )
}
