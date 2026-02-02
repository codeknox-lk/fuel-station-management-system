'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
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
import { Card } from '@/components/ui/card'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import {
  Phone,
  CreditCard,
  Plus,
  Edit,
  DollarSign,
  IdCard,
  UserCheck,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Filter,
  Minus
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

interface CreditTransaction {
  id: string
  type: 'SALE' | 'PAYMENT'
  customerId: string
  customerName: string
  customerPhone: string
  amount: number
  timestamp: string
  description: string
  shiftId?: string
  paymentType?: string
  chequeNumber?: string
  bankName?: string
}

export default function CreditCustomersPage() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string>('')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CreditCustomer | null>(null)

  // Transaction history state
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [filterCustomer, setFilterCustomer] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

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
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true)

      // Fetch both sales and payments in parallel
      const [salesRes, paymentsRes] = await Promise.all([
        fetch('/api/credit/sales'),
        fetch('/api/credit/payments')
      ])

      if (!salesRes.ok || !paymentsRes.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const sales = await salesRes.json()
      const payments = await paymentsRes.json()

      interface ApiCreditSale {
        id: string
        customerId: string
        customer?: { name: string; phone?: string }
        amount: number
        timestamp: string
        liters?: number
        price?: number
        shiftId?: string
      }

      interface ApiCreditPayment {
        id: string
        customerId: string
        customer?: { name: string; phone?: string }
        amount: number
        paymentDate: string
        paymentType?: string
        chequeNumber?: string
        bank?: { name: string }
      }

      // Transform sales
      const salesTransactions: CreditTransaction[] = sales.map((sale: ApiCreditSale) => ({
        id: sale.id,
        type: 'SALE' as const,
        customerId: sale.customerId,
        customerName: sale.customer?.name || 'Unknown',
        customerPhone: sale.customer?.phone || '',
        amount: sale.amount,
        timestamp: sale.timestamp,
        description: `Credit sale - ${sale.liters?.toFixed(2) || 'N/A'}L @ Rs. ${sale.price?.toLocaleString() || 'N/A'}/L`,
        shiftId: sale.shiftId
      }))

      // Transform payments
      const paymentsTransactions: CreditTransaction[] = payments.map((payment: ApiCreditPayment) => ({
        id: payment.id,
        type: 'PAYMENT' as const,
        customerId: payment.customerId,
        customerName: payment.customer?.name || 'Unknown',
        customerPhone: payment.customer?.phone || '',
        amount: payment.amount,
        timestamp: payment.paymentDate,
        description: `Payment received - ${payment.paymentType || 'Cash'}${payment.chequeNumber ? ` (Cheque: ${payment.chequeNumber})` : ''}${payment.bank ? ` - ${payment.bank.name}` : ''}`,
        paymentType: payment.paymentType,
        chequeNumber: payment.chequeNumber,
        bankName: payment.bank?.name
      }))

      // Combine and sort by timestamp (newest first)
      const allTransactions = [...salesTransactions, ...paymentsTransactions].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setTransactions(allTransactions)
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/credit/customers')
      const data = await response.json()

      interface ApiCreditCustomer {
        id: string
        name: string
        company?: string
        phone: string
        email?: string
        address?: string
        creditLimit: number
        currentBalance: number
        isActive: boolean
        approvedBy?: string
        approvedAt?: string
        createdAt: string
        updatedAt: string
      }

      // Transform the data to include calculated fields and map company to nicOrBrn
      const transformedCustomers = data.map((customer: ApiCreditCustomer) => ({
        ...customer,
        nicOrBrn: customer.company || '', // Map company to nicOrBrn for frontend
        availableCredit: customer.creditLimit - customer.currentBalance,
        status: (customer.isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
        approvedBy: customer.approvedBy || 'System',
        approvedAt: customer.approvedAt || customer.createdAt || new Date().toISOString()
      }))

      setCustomers(transformedCustomers)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast({
        title: "Error",
        description: "Failed to load customers data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.nicOrBrn || !formData.phone || formData.creditLimit <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const url = editingCustomer
        ? `/api/credit/customers/${editingCustomer.id}`
        : '/api/credit/customers'

      const method = editingCustomer ? 'PUT' : 'POST'

      // Map nicOrBrn to company for API
      const requestBody = {
        name: formData.name,
        company: formData.nicOrBrn || null, // Map nicOrBrn to company
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || '',
        creditLimit: formData.creditLimit,
        status: formData.status
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Failed to ${editingCustomer ? 'update' : 'create'} customer`)
      }

      const savedCustomer = await response.json()

      // Transform saved customer to match frontend format (map company to nicOrBrn)
      const transformedCustomer = {
        ...savedCustomer,
        nicOrBrn: savedCustomer.company || '',
        availableCredit: savedCustomer.creditLimit - savedCustomer.currentBalance,
        status: savedCustomer.isActive ? 'ACTIVE' : 'INACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
        approvedBy: savedCustomer.approvedBy || 'System',
        approvedAt: savedCustomer.approvedAt || savedCustomer.createdAt || new Date().toISOString()
      }

      if (editingCustomer) {
        // Update existing customer in list
        setCustomers(prev => prev.map(c =>
          c.id === editingCustomer.id
            ? transformedCustomer
            : c
        ))
      } else {
        // Add new customer to list
        setCustomers(prev => [
          transformedCustomer,
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

      toast({
        title: "Success",
        description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully!`
      })

      // Refresh transactions in case balance changed
      fetchTransactions()

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingCustomer ? 'update' : 'create'} customer`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer: CreditCustomer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      nicOrBrn: customer.nicOrBrn || '', // Ensure it's always a string
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit || 0,
      status: customer.status || 'ACTIVE'
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
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'SUSPENDED': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'INACTIVE': return 'bg-muted text-foreground'
      default: return 'bg-muted text-foreground'
    }
  }

  const getBalanceColor = (balance: number, limit: number) => {
    const percentage = (balance / limit) * 100
    if (percentage >= 90) return 'text-red-600 dark:text-red-400'
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const customerColumns: Column<CreditCustomer>[] = [
    {
      key: 'name' as keyof CreditCustomer,
      title: 'Customer Name',
      render: (value: unknown, row: CreditCustomer) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{value as string}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'nicOrBrn' as keyof CreditCustomer,
      title: 'NIC/BRN',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <IdCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'phone' as keyof CreditCustomer,
      title: 'Phone',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'creditLimit' as keyof CreditCustomer,
      title: 'Credit Limit',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
          <DollarSign className="h-4 w-4 text-muted-foreground" />
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
          <span className={`font-mono font-semibold ${numValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )
    }] : [])
  ]

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter(tx => {
    if (filterCustomer !== 'all' && tx.customerId !== filterCustomer) return false
    if (filterType !== 'all' && tx.type !== filterType) return false
    return true
  })

  const transactionColumns: Column<CreditTransaction>[] = [
    {
      key: 'timestamp' as keyof CreditTransaction,
      title: 'Date & Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{new Date(value as string).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'type' as keyof CreditTransaction,
      title: 'Type',
      render: (value: unknown, row: CreditTransaction) => {
        const isSale = row.type === 'SALE'
        return (
          <div className="flex items-center gap-2">
            {isSale ? (
              <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
            )}
            <Badge className={isSale
              ? 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
              : 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
            }>
              {row.type}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'customerName' as keyof CreditTransaction,
      title: 'Customer',
      render: (value: unknown, row: CreditTransaction) => (
        <div className="flex flex-col">
          <span className="font-medium">{value as string}</span>
          <span className="text-xs text-muted-foreground">{row.customerPhone}</span>
        </div>
      )
    },
    {
      key: 'amount' as keyof CreditTransaction,
      title: 'Amount',
      render: (value: unknown, row: CreditTransaction) => {
        const isSale = row.type === 'SALE'
        return (
          <div className={`flex items-center gap-2 font-mono font-semibold ${isSale ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {isSale ? (
              <>
                <Plus className="h-4 w-4" />
                <span>Rs. {(value as number).toLocaleString()}</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4" />
                <span>Rs. {(value as number).toLocaleString()}</span>
              </>
            )}
          </div>
        )
      }
    },
    {
      key: 'description' as keyof CreditTransaction,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Credit Customers</h1>
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Customers</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{customers.length}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Active Customers</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {customers.filter(c => c.status === 'ACTIVE').length}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Credit Limit</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            Rs. {customers.reduce((sum, c) => sum + c.creditLimit, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
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

      {/* Transaction History Section */}
      <FormCard title="Transaction History" className="p-6">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="filterCustomer" className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" />
                Filter by Customer
              </Label>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="filterType" className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4" />
                Filter by Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SALE">Sales Only</SelectItem>
                  <SelectItem value="PAYMENT">Payments Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchTransactions}
                disabled={loadingTransactions}
              >
                <History className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{filteredTransactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                Rs. {filteredTransactions
                  .filter(tx => tx.type === 'SALE')
                  .reduce((sum, tx) => sum + tx.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                Rs. {filteredTransactions
                  .filter(tx => tx.type === 'PAYMENT')
                  .reduce((sum, tx) => sum + tx.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
            </div>
          ) : (
            <DataTable
              data={filteredTransactions}
              columns={transactionColumns}
              searchPlaceholder="Search transactions..."
              emptyMessage="No transactions found."
            />
          )}
        </div>
      </FormCard>
    </div>
  )
}
