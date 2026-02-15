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
import { CreditCard, Plus, Edit, Trash2, Building, Phone, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Bank {
  id: string
  code: string
  name: string
  accountNumber: string
  accountName: string
  branch: string
  swiftCode: string
  contactPerson: string
  phone: string
  email: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export default function BanksPage() {
  const router = useRouter()


  const [banks, setBanks] = useState<Bank[]>([])
  // const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<Bank | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    accountNumber: '',
    accountName: '',
    branch: '',
    swiftCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    status: 'active' as Bank['status']
  })
  const { toast } = useToast()

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      console.log('Fetched banks data:', data)
      interface ApiBank {
        id: string
        code: string
        name: string
        accountNumber: string
        accountName: string
        branch: string
        swiftCode: string
        contactPerson: string
        phone: string
        email: string
        isActive: boolean
        createdAt: string
        updatedAt: string
      }

      // Map isActive to status for the UI
      const mappedData = data.map((bank: ApiBank) => ({
        ...bank,
        status: (bank.isActive ? 'active' : 'inactive') as 'active' | 'inactive'
      }))
      console.log('Mapped banks data:', mappedData)
      setBanks(mappedData)
    } catch (error) {
      console.error('Failed to fetch banks:', error)
      toast({
        title: "Error",
        description: "Failed to fetch banks",
        variant: "destructive"
      })
    }
  }, [toast])

  useEffect(() => {
    fetchBanks()
  }, [fetchBanks])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingBank ? `/api/banks/${editingBank.id}` : '/api/banks'
      const method = editingBank ? 'PUT' : 'POST'

      console.log('Submitting bank data:', formData)
      console.log('URL:', url, 'Method:', method)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const responseData = await response.json()
      console.log('Response:', responseData)

      if (!response.ok) throw new Error('Failed to save bank')

      toast({
        title: "Success",
        description: `Bank ${editingBank ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchBanks()
    } catch (error) {
      console.error('Error saving bank:', error)
      toast({
        title: "Error",
        description: `Failed to ${editingBank ? 'update' : 'create'} bank`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (bank: Bank) => {
    console.log('Editing bank:', bank)
    setEditingBank(bank)
    const formDataToSet = {
      code: bank.code || '',
      name: bank.name || '',
      accountNumber: bank.accountNumber || '',
      accountName: bank.accountName || '',
      branch: bank.branch || '',
      swiftCode: bank.swiftCode || '',
      contactPerson: bank.contactPerson || '',
      phone: bank.phone || '',
      email: bank.email || '',
      status: bank.status
    }
    console.log('Setting form data:', formDataToSet)
    setFormData(formDataToSet)
    setDialogOpen(true)
  }

  const handleDelete = async (bank: Bank) => {
    if (!confirm(`Are you sure you want to delete bank "${bank.name}"?`)) return

    try {
      const response = await fetch(`/api/banks/${bank.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete bank')

      toast({
        title: "Success",
        description: "Bank deleted successfully"
      })

      fetchBanks()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete bank",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingBank(null)
    setFormData({
      code: '',
      name: '',
      accountNumber: '',
      accountName: '',
      branch: '',
      swiftCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      status: 'active'
    })
  }

  const getStatusColor = (status: Bank['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'inactive': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const columns = [
    {
      key: 'code' as keyof Bank,
      title: 'Code',
      render: (value: unknown) => (
        <span className="font-medium">{value ? (value as string) : '-'}</span>
      )
    },
    {
      key: 'name' as keyof Bank,
      title: 'Bank Name',
      render: (value: unknown) => (
        <div className="font-medium">{value as string}</div>
      )
    },
    {
      key: 'accountNumber' as keyof Bank,
      title: 'Account Number',
      render: (value: unknown) => (
        <span className="text-sm">{value ? (value as string) : '-'}</span>
      )
    },
    {
      key: 'accountName' as keyof Bank,
      title: 'Account Name',
      render: (value: unknown) => (
        <span className="text-sm">{value ? (value as string) : '-'}</span>
      )
    },
    {
      key: 'branch' as keyof Bank,
      title: 'Branch',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Building className="h-3 w-3" />
          {value as string}
        </div>
      )
    },
    {
      key: 'contactPerson' as keyof Bank,
      title: 'Contact',
      render: (value: unknown, row: Bank) => (
        <div className="text-sm">
          {value || row.phone ? (
            <>
              <div className="font-medium">{value ? (value as string) : '-'}</div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {row.phone || '-'}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )
    },
    {
      key: 'status' as keyof Bank,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-muted text-foreground">Unknown</Badge>
        return (
          <Badge className={getStatusColor(status as Bank['status'])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      }
    },
    {
      key: 'id' as keyof Bank,
      title: 'Actions',
      render: (value: unknown, row: Bank) => (
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
      title: 'Total Banks',
      value: banks.length.toString(),
      description: 'Registered banks',
      icon: <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    },
    {
      title: 'Active',
      value: banks.filter(b => b.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'Inactive',
      value: banks.filter(b => b.status === 'inactive').length.toString(),
      description: 'Not in use',
      icon: <div className="h-5 w-5 bg-muted0 rounded-full" />
    },
    {
      title: 'Accounts',
      value: banks.filter(b => b.accountNumber).length.toString(),
      description: 'With account details',
      icon: <Building className="h-5 w-5 text-orange-600 dark:text-orange-400" />
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
            <h1 className="text-3xl font-bold text-foreground">Bank Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage bank accounts and payment processing configurations
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bank
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Edit Bank' : 'Add New Bank'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Bank Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., BOC, COM, HNB"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Bank Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Bank of Ceylon"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Bank account number"
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Account holder name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Branch name/location"
                  />
                </div>
                <div>
                  <Label htmlFor="swiftCode">SWIFT Code</Label>
                  <Input
                    id="swiftCode"
                    value={formData.swiftCode}
                    onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    placeholder="International transfer code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Bank contact person"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contact number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Contact email"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    aria-label="Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Bank['status'] })}
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
                  {editingBank ? 'Update Bank' : 'Create Bank'}
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

      {/* Banks Table */}
      <FormCard title="Banks" description="Manage bank accounts and payment processing settings">
        <DataTable
          data={banks}
          columns={columns}
          searchPlaceholder="Search banks..."
          enableExport={true}
          exportFileName="banks-list"
        />
      </FormCard>
    </div>
  )
}
