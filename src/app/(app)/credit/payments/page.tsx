'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Users, 
  DollarSign, 
  Calendar, 
  CreditCard,
  Banknote,
  Building,
  FileText,
  AlertCircle, 
  CheckCircle, 
  Plus,
  Clock
} from 'lucide-react'

interface CreditCustomer {
  id: string
  name: string
  nicOrBrn: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
}

interface CreditPayment {
  id: string
  customerId: string
  customerName?: string
  amount: number
  paymentDate: string
  paymentMethod: 'CASH' | 'CARD' | 'CHEQUE' | 'BANK_TRANSFER'
  referenceNumber?: string
  chequeNumber?: string
  bankName?: string
  notes?: string
  recordedBy: string
  status: 'PENDING' | 'CLEARED' | 'BOUNCED'
  clearedAt?: string
  createdAt: string
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: Banknote, requiresRef: false },
  { value: 'CARD', label: 'Card Payment', icon: CreditCard, requiresRef: true },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText, requiresRef: true },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building, requiresRef: true }
]

export default function CreditPaymentsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [recentPayments, setRecentPayments] = useState<CreditPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [amount, setAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [notes, setNotes] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, paymentsRes] = await Promise.all([
          fetch('/api/credit/customers?status=ACTIVE'),
          fetch('/api/credit/payments?limit=10')
        ])

        const customersData = await customersRes.json()
        const paymentsData = await paymentsRes.json()

        setCustomers(customersData.map((customer: { id: string; name: string; creditLimit: number; currentBalance: number }) => ({
          ...customer,
          availableCredit: customer.creditLimit - customer.currentBalance
        })))
        setRecentPayments(paymentsData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedCustomer || amount <= 0) {
      setError('Please fill in all required fields')
      return
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    // Check if customer has outstanding balance
    const customer = customers.find(c => c.id === selectedCustomer)
    if (customer && amount > customer.currentBalance) {
      setError(`Payment amount exceeds outstanding balance of Rs. ${customer.currentBalance.toLocaleString()}`)
      return
    }

    // Validate reference number for non-cash payments
    const selectedMethod = paymentMethods.find(m => m.value === paymentMethod)
    if (selectedMethod?.requiresRef && !referenceNumber) {
      setError(`Reference number is required for ${selectedMethod.label}`)
      return
    }

    // Validate cheque number for cheque payments
    if (paymentMethod === 'CHEQUE' && !chequeNumber) {
      setError('Cheque number is required for cheque payments')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/credit/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          amount: amount,
          paymentDate: paymentDate.toISOString(),
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          chequeNumber: chequeNumber || undefined,
          bankName: bankName || undefined,
          notes: notes || undefined,
          recordedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record payment')
      }

      const newPayment = await response.json()
      
      // Add to recent payments list
      setRecentPayments(prev => [newPayment, ...prev.slice(0, 9)])
      
      // Update customer balance
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomer 
          ? { 
              ...c, 
              currentBalance: c.currentBalance - amount, 
              availableCredit: c.availableCredit + amount 
            }
          : c
      ))
      
      // Reset form
      setSelectedCustomer('')
      setAmount(0)
      setPaymentDate(new Date())
      setPaymentMethod('CASH')
      setReferenceNumber('')
      setChequeNumber('')
      setBankName('')
      setNotes('')
      
      setSuccess('Payment recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLEARED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'BOUNCED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getMethodIcon = (method: string) => {
    const methodConfig = paymentMethods.find(m => m.value === method)
    if (methodConfig) {
      const Icon = methodConfig.icon
      return <Icon className="h-4 w-4 text-muted-foreground" />
    }
    return <DollarSign className="h-4 w-4 text-muted-foreground" />
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)
  const selectedMethodConfig = paymentMethods.find(m => m.value === paymentMethod)

  const paymentColumns: Column<CreditPayment>[] = [
    {
      key: 'paymentDate' as keyof CreditPayment,
      title: 'Date',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(value as string).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'customerName' as keyof CreditPayment,
      title: 'Customer',
      render: (value: unknown, row: CreditPayment) => {
        const customer = customers.find(c => c.id === row.customerId)
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{customer?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'amount' as keyof CreditPayment,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-mono font-semibold text-green-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'paymentMethod' as keyof CreditPayment,
      title: 'Method',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          {getMethodIcon(value as string)}
          <Badge variant="outline">{value as string}</Badge>
        </div>
      )
    },
    {
      key: 'referenceNumber' as keyof CreditPayment,
      title: 'Reference',
      render: (value: unknown, row: CreditPayment) => (
        <div className="flex flex-col">
          {value ? (
            <span className="font-mono text-sm">{value as string}</span>
          ) : null}
          {row.chequeNumber ? (
            <span className="text-xs text-muted-foreground">
              Cheque: {row.chequeNumber}
            </span>
          ) : null}
          {row.bankName ? (
            <span className="text-xs text-muted-foreground">
              {row.bankName}
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: 'status' as keyof CreditPayment,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'recordedBy' as keyof CreditPayment,
      title: 'Recorded By',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Credit Payments</h1>

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

      <FormCard title="Record New Payment">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <Label htmlFor="customer">Customer *</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={loading}>
              <SelectTrigger id="customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.filter(c => c.currentBalance > 0).map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Outstanding: Rs. {customer.currentBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCustomerData && (
              <div className="mt-2 p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-md">
                <div className="text-xs text-blue-700">
                  <div>Credit Limit: Rs. {selectedCustomerData.creditLimit.toLocaleString()}</div>
                  <div className="font-semibold">Outstanding Balance: Rs. {selectedCustomerData.currentBalance.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Payment Amount (Rs.) *</Label>
              <MoneyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <DateTimePicker
                value={paymentDate}
                onChange={(date) => setPaymentDate(date || new Date())}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select 
                value={paymentMethod} 
                onValueChange={(value: 'CASH' | 'CARD' | 'CHEQUE' | 'BANK_TRANSFER') => setPaymentMethod(value)}
                disabled={loading}
              >
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    return (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Method-specific fields */}
          {selectedMethodConfig?.requiresRef && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referenceNumber">
                  Reference Number *
                  {paymentMethod === 'CARD' && ' (Transaction ID)'}
                  {paymentMethod === 'BANK_TRANSFER' && ' (Transfer ID)'}
                </Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={
                    paymentMethod === 'CARD' ? 'TXN123456789' :
                    paymentMethod === 'BANK_TRANSFER' ? 'TRF123456789' :
                    'REF123456789'
                  }
                  disabled={loading}
                  required
                />
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank of Ceylon"
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'CHEQUE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chequeNumber">Cheque Number *</Label>
                <Input
                  id="chequeNumber"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="123456"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank of Ceylon"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the payment..."
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/credit')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Payments" className="p-6">
        <DataTable
          data={recentPayments}
          columns={paymentColumns}
          searchPlaceholder="Search payments..."
          emptyMessage="No payments recorded yet."
        />
      </FormCard>
    </div>
  )
}
