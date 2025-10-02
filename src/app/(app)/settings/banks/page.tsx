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
import { CreditCard, Plus, Edit, Trash2, Building, Phone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks')
      const data = await response.json()
      setBanks(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch banks",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingBank ? `/api/banks/${editingBank.id}` : '/api/banks'
      const method = editingBank ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save bank')

      toast({
        title: "Success",
        description: `Bank ${editingBank ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchBanks()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingBank ? 'update' : 'create'} bank`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank)
    setFormData({
      code: bank.code,
      name: bank.name,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      branch: bank.branch,
      swiftCode: bank.swiftCode,
      contactPerson: bank.contactPerson,
      phone: bank.phone,
      email: bank.email,
      status: bank.status
    })
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
    } catch (error) {
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
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const columns = [
    {
      key: 'code' as keyof Bank,
      title: 'Code',
      render: (value: unknown) => (
        <span className="font-mono font-medium">{value as string}</span>
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
        <span className="font-mono text-sm">{value as string}</span>
      )
    },
    {
      key: 'accountName' as keyof Bank,
      title: 'Account Name',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'branch' as keyof Bank,
      title: 'Branch',
      render: (value: unknown) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
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
          <div className="font-medium">{value as string}</div>
          <div className="flex items-center gap-1 text-gray-500">
            <Phone className="h-3 w-3" />
            {row.phone}
          </div>
        </div>
      )
    },
    {
      key: 'status' as keyof Bank,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
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
      title: 'Total Banks',
      value: banks.length.toString(),
      description: 'Registered banks',
      icon: <CreditCard className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: banks.filter(b => b.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'Inactive',
      value: banks.filter(b => b.status === 'inactive').length.toString(),
      description: 'Not in use',
      icon: <div className="h-5 w-5 bg-gray-500 rounded-full" />
    },
    {
      title: 'Accounts',
      value: banks.filter(b => b.accountNumber).length.toString(),
      description: 'With account details',
      icon: <Building className="h-5 w-5 text-purple-500" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Management</h1>
          <p className="text-gray-600 mt-2">
            Manage bank accounts and payment processing configurations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bank
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
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
                    required
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="Account holder name"
                    required
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
                    required
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

      {/* Banks Table */}
      <FormCard title="Banks" description="Manage bank accounts and payment processing settings">
        <DataTable
          data={banks}
          columns={columns}
          searchPlaceholder="Search banks..."
        />
      </FormCard>
    </div>
  )
}
