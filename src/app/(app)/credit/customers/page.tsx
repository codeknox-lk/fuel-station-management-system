'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { 
  Phone, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  Edit,
  DollarSign,
  IdCard,
  UserCheck
} from 'lucide-react'

interface CreditCustomer {
  id: string
  name: string
  nicOrBrn: string
  phone: string
  email?: string
  address?: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  approvedBy: string
  approvedAt: string
  createdAt: string
  updatedAt: string
}

export default function CreditCustomersPage() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userRole, setUserRole] = useState<string>('')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nicOrBrn: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  })

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole')
    setUserRole(role || '')
    
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/credit/customers')
      const data = await response.json()

      // Transform the data to include calculated fields
      const transformedCustomers = data.map((customer: CreditCustomer) => ({
        ...customer,
        availableCredit: customer.creditLimit - customer.currentBalance
      }))

      setCustomers(transformedCustomers)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
      setError('Failed to load customers data.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.nicOrBrn || !formData.phone || formData.creditLimit <= 0) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const url = editingCustomer 
        ? `/api/credit/customers/${editingCustomer.id}`
        : '/api/credit/customers'
      
      const method = editingCustomer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          creditLimit: formData.creditLimit,
          approvedBy: editingCustomer ? editingCustomer.approvedBy : 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${editingCustomer ? 'update' : 'create'} customer`)
      }

      const savedCustomer = await response.json()
      
      if (editingCustomer) {
        // Update existing customer in list
        setCustomers(prev => prev.map(c => 
          c.id === editingCustomer.id 
            ? { ...savedCustomer, availableCredit: savedCustomer.creditLimit - savedCustomer.currentBalance }
            : c
        ))
      } else {
        // Add new customer to list
        setCustomers(prev => [
          { ...savedCustomer, availableCredit: savedCustomer.creditLimit - savedCustomer.currentBalance },
          ...prev
        ])
      }
      
      // Reset form and close dialog
      setFormData({
        name: '',
        nicOrBrn: '',
        phone: '',
        email: '',
        address: '',
        creditLimit: 0,
        status: 'ACTIVE'
      })
      setEditingCustomer(null)
      setIsDialogOpen(false)
      
      setSuccess(`Customer ${editingCustomer ? 'updated' : 'created'} successfully!`)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError(`Failed to ${editingCustomer ? 'update' : 'create'} customer`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer: CreditCustomer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      nicOrBrn: customer.nicOrBrn,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit,
      status: customer.status
    })
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
    setFormData({
      name: '',
      nicOrBrn: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: 0,
      status: 'ACTIVE'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getBalanceColor = (balance: number, limit: number) => {
    const percentage = (balance / limit) * 100
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const customerColumns: Column<CreditCustomer>[] = [
    {
      key: 'name' as keyof CreditCustomer,
      title: 'Customer Name',
      render: (value: unknown, row: CreditCustomer) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-500" />
          <div className="flex flex-col">
            <span className="font-medium">{value as string}</span>
            <span className="text-xs text-gray-500">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'nicOrBrn' as keyof CreditCustomer,
      title: 'NIC/BRN',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-gray-500" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'phone' as keyof CreditCustomer,
      title: 'Phone',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-500" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'creditLimit' as keyof CreditCustomer,
      title: 'Credit Limit',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500" />
          <span className="font-mono font-semibold text-blue-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'currentBalance' as keyof CreditCustomer,
      title: 'Current Balance',
      render: (value: unknown, row: CreditCustomer) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <span className={`font-mono font-semibold ${getBalanceColor(value as number, row.creditLimit)}`}>
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'availableCredit' as keyof CreditCustomer,
      title: 'Available Credit',
      render: (value: unknown) => {
        const numValue = value as number
        return (
          <span className={`font-mono font-semibold ${numValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rs. {numValue?.toLocaleString() || 0}
          </span>
        )
      }
    },
    {
      key: 'status' as keyof CreditCustomer,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    ...(userRole === 'OWNER' ? [{
      key: 'actions' as keyof CreditCustomer,
      title: 'Actions',
      render: (_value: unknown, row: CreditCustomer) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(row)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )
    }] : [])
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Credit Customers</h1>
        {userRole === 'OWNER' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCustomer(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer 
                    ? 'Update customer information and credit settings.'
                    : 'Create a new credit customer account. All fields marked with * are required.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Customer Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="nicOrBrn">NIC/BRN *</Label>
                      <Input
                        id="nicOrBrn"
                        value={formData.nicOrBrn}
                        onChange={(e) => setFormData(prev => ({ ...prev, nicOrBrn: e.target.value }))}
                        placeholder="123456789V or PV12345"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+94771234567"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main Street, Colombo"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="creditLimit">Credit Limit (Rs.) *</Label>
                      <MoneyInput
                        id="creditLimit"
                        value={formData.creditLimit}
                        onChange={(value) => setFormData(prev => ({ ...prev, creditLimit: value }))}
                        placeholder="50000"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') => 
                          setFormData(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Customers</h3>
          <p className="text-3xl font-bold text-purple-600">{customers.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Active Customers</h3>
          <p className="text-3xl font-bold text-green-600">
            {customers.filter(c => c.status === 'ACTIVE').length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Credit Limit</h3>
          <p className="text-3xl font-bold text-blue-600">
            Rs. {customers.reduce((sum, c) => sum + c.creditLimit, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-red-600">
            Rs. {customers.reduce((sum, c) => sum + c.currentBalance, 0).toLocaleString()}
          </p>
        </Card>
      </div>

      <FormCard title="Credit Customers" className="p-6">
        <DataTable
          data={customers}
          columns={customerColumns}
          searchPlaceholder="Search customers..."
          emptyMessage="No credit customers found."
        />
      </FormCard>
    </div>
  )
}
