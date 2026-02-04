'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
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
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  DollarSign,
  Calendar,
  Banknote,
  Building,
  FileText,
  Plus,
  Eye
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
  customer?: {
    name: string
    phone: string
    nicOrBrn?: string
  }
  amount: number
  paymentDate: string
  paymentMethod: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
  paymentType?: string
  referenceNumber?: string
  chequeNumber?: string
  bankName?: string
  bank?: {
    id: string
    name: string
    accountNumber?: string
  }
  notes?: string
  recordedBy: string
  receivedBy?: string
  status: 'PENDING' | 'CLEARED' | 'BOUNCED'
  clearedAt?: string
  createdAt: string
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: Banknote, requiresRef: false },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText, requiresRef: true },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building, requiresRef: true }
]

interface Bank {
  id: string
  name: string
  accountNumber: string
}

export default function CreditPaymentsPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [recentPayments, setRecentPayments] = useState<CreditPayment[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Payment details modal
  const [selectedPayment, setSelectedPayment] = useState<CreditPayment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [amount, setAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CHEQUE' | 'BANK_TRANSFER'>('CASH')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [selectedBank, setSelectedBank] = useState('')
  const [notes, setNotes] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersRes, paymentsRes, banksRes] = await Promise.all([
          fetch('/api/credit/customers?status=ACTIVE'),
          fetch('/api/credit/payments?limit=10'),
          fetch('/api/banks')
        ])

        const customersData = await customersRes.json()
        const paymentsData = await paymentsRes.json()
        const banksData = await banksRes.json()

        setCustomers(customersData.map((customer: { id: string; name: string; creditLimit: number; currentBalance: number }) => ({
          ...customer,
          availableCredit: customer.creditLimit - customer.currentBalance
        })))
        setRecentPayments(paymentsData)
        setBanks(Array.isArray(banksData) ? banksData : [])
      } catch {
        toast({
          title: "Error",
          description: "Failed to load initial data",
          variant: "destructive"
        })
      }
    }

    loadData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive"
      })
      return
    }

    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      })
      return
    }

    // Check if customer has outstanding balance
    const customer = customers.find(c => c.id === selectedCustomer)
    if (customer && amount > customer.currentBalance) {
      toast({
        title: "Error",
        description: `Payment amount exceeds outstanding balance of Rs. ${customer.currentBalance.toLocaleString()}`,
        variant: "destructive"
      })
      return
    }

    // Validate cheque number for cheque payments
    if (paymentMethod === 'CHEQUE' && !chequeNumber) {
      toast({
        title: "Error",
        description: "Cheque number is required for cheque payments",
        variant: "destructive"
      })
      return
    }

    // Validate reference number for bank transfer
    if (paymentMethod === 'BANK_TRANSFER' && !referenceNumber) {
      toast({
        title: "Error",
        description: "Reference number is required for bank transfers",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/credit/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          amount: amount,
          paymentDate: paymentDate.toISOString(),
          paymentType: paymentMethod,
          chequeNumber: chequeNumber || null,
          bankId: selectedBank || null,
          stationId: selectedStation !== 'all' ? selectedStation : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : (errorData.error || 'Failed to record payment')
        console.error('Payment API Error:', errorData)
        throw new Error(errorMsg)
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
      setSelectedBank('')
      setNotes('')

      toast({
        title: "Success",
        description: "Payment recorded successfully!"
      })

    } catch (err) {
      console.error('Payment error:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to record payment',
        variant: "destructive"
      })
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
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
          {row.chequeNumber && (
            <span className="text-xs text-muted-foreground">
              Cheque: {row.chequeNumber}
            </span>
          )}
          {(row.bank?.name || row.bankName) && (
            <span className="text-xs text-muted-foreground">
              {row.bank?.name || row.bankName}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'status' as keyof CreditPayment,
      title: 'Status',
      render: (value: unknown) => {
        const status = (value as string) || 'CLEARED'
        return (
          <Badge className={getStatusColor(status)}>
            {status}
          </Badge>
        )
      }
    },
    {
      key: 'recordedBy' as keyof CreditPayment,
      title: 'Recorded By',
      render: (value: unknown, row: CreditPayment) => (
        <span className="text-sm text-muted-foreground">{row.receivedBy || (value as string)}</span>
      )
    },
    {
      key: 'id' as keyof CreditPayment,
      title: 'Actions',
      render: (_value: unknown, row: CreditPayment) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedPayment(row)
            setIsDetailsOpen(true)
          }}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Credit Payments</h1>

      <h1 className="text-3xl font-bold text-foreground">Credit Payments</h1>

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
              <div className="mt-2 p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-md">
                <div className="text-xs text-orange-700">
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
                onValueChange={(value: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER') => setPaymentMethod(value)}
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
                  {paymentMethod === 'BANK_TRANSFER' && ' (Transfer ID)'}
                </Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={
                    paymentMethod === 'BANK_TRANSFER' ? 'TRF123456789' :
                      'REF123456789'
                  }
                  disabled={loading}
                  required
                />
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <Label htmlFor="bank">Bank Account</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank} disabled={loading}>
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span className="font-medium">{bank.name}</span>
                              <span className="text-xs text-muted-foreground">{bank.accountNumber}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="bank">Bank Account</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank} disabled={loading}>
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{bank.name}</span>
                            <span className="text-xs text-muted-foreground">{bank.accountNumber}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Payment Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Complete information about this payment transaction
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Name</p>
                    <p className="font-medium">{selectedPayment.customer?.name || selectedPayment.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-mono text-sm">{selectedPayment.customer?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Payment Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      Rs. {selectedPayment.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p className="font-medium">{new Date(selectedPayment.paymentDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <Badge variant="outline" className="mt-1">
                      {selectedPayment.paymentType || selectedPayment.paymentMethod}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`mt-1 ${getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              {(selectedPayment.chequeNumber || selectedPayment.referenceNumber || selectedPayment.bank) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Transaction Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPayment.chequeNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">Cheque Number</p>
                        <p className="font-mono text-sm">{selectedPayment.chequeNumber}</p>
                      </div>
                    )}
                    {selectedPayment.referenceNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">Reference Number</p>
                        <p className="font-mono text-sm">{selectedPayment.referenceNumber}</p>
                      </div>
                    )}
                    {selectedPayment.bank && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Bank Account</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{selectedPayment.bank.name}</p>
                            {selectedPayment.bank.accountNumber && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {selectedPayment.bank.accountNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* System Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">System Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Received By</p>
                    <p className="font-medium">{selectedPayment.receivedBy || selectedPayment.recordedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment ID</p>
                    <p className="font-mono text-xs text-muted-foreground">{selectedPayment.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(selectedPayment.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
