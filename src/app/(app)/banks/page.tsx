'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  RefreshCw,
  Calendar,
  Plus,
  Eye,
  Landmark
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DataTable } from '@/components/ui/DataTable'
import { Textarea } from '@/components/ui/textarea'

interface BankAccount {
  id: string
  name: string
  branch: string | null
  accountNumber: string | null
  isActive: boolean
  currentBalance: number
  totalDeposits: number
  totalCheques: number
  clearedCheques: number
  pendingCheques: number
  bouncedCheques: number
  totalCreditPayments: number
  manualDeposits: number
  manualWithdrawals: number
  transactionCount: number
  recentTransactions: Transaction[]
  posTerminals: Array<{ id: string; name: string }>
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'CHEQUE' | 'CREDIT_PAYMENT' | 'MANUAL'
  amount: number
  date: string
  status?: string
  description: string
  station?: string
  chequeNumber?: string
  depositSlip?: string
  customer?: string
}

interface TransactionSummary {
  totalDeposits: number
  totalCheques: number
  clearedCheques: number
  pendingCheques: number
  bouncedCheques: number
  totalCreditPayments: number
  transactionCount: number
}

export default function BankAccountsPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const { toast } = useToast()
  
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [selectedBankForTransaction, setSelectedBankForTransaction] = useState<BankAccount | null>(null)
  
  // Manual transaction form
  const [manualTransactionForm, setManualTransactionForm] = useState({
    type: 'DEPOSIT',
    amount: '',
    description: '',
    referenceNumber: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  
  // Filters
  const [transactionType, setTransactionType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchBankAccounts()
  }, [selectedStation])

  const fetchBankAccounts = async () => {
    try {
      setLoading(true)
      const url = selectedStation 
        ? `/api/banks/accounts?stationId=${selectedStation}`
        : '/api/banks/accounts'
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch bank accounts')
      
      const data = await response.json()
      setBankAccounts(data.bankAccounts || [])
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBankTransactions = async (bankId: string) => {
    try {
      setLoadingTransactions(true)
      
      const params = new URLSearchParams()
      if (selectedStation) params.append('stationId', selectedStation)
      if (transactionType !== 'all') params.append('type', transactionType)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`/api/banks/${bankId}/transactions?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch transactions')
      
      const data = await response.json()
      setTransactions(data.transactions || [])
      setTransactionSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive"
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleViewDetails = (bank: BankAccount) => {
    setSelectedBank(bank)
    setDialogOpen(true)
    fetchBankTransactions(bank.id)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedBank(null)
    setTransactions([])
    setTransactionSummary(null)
    setTransactionType('all')
    setStartDate('')
    setEndDate('')
  }

  const handleOpenTransaction = (bank: BankAccount) => {
    setSelectedBankForTransaction(bank)
    setManualTransactionForm({
      type: 'DEPOSIT',
      amount: '',
      description: '',
      referenceNumber: '',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setTransactionDialogOpen(true)
  }

  const handleSubmitManualTransaction = async () => {
    if (!selectedBankForTransaction) return

    if (!manualTransactionForm.amount || !manualTransactionForm.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/banks/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: selectedBankForTransaction.id,
          stationId: selectedStation || null,
          ...manualTransactionForm,
          createdBy: 'User'
        })
      })

      if (!response.ok) throw new Error('Failed to create transaction')

      const isDeposit = ['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(manualTransactionForm.type)
      
      toast({
        title: "Success",
        description: `Successfully ${isDeposit ? 'added' : 'removed'} Rs. ${parseFloat(manualTransactionForm.amount).toLocaleString()} ${isDeposit ? 'to' : 'from'} ${selectedBankForTransaction.name}`
      })

      fetchBankAccounts()
      setTransactionDialogOpen(false)
      setManualTransactionForm({
        type: 'DEPOSIT',
        amount: '',
        description: '',
        referenceNumber: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (error) {
      console.error('Error creating manual transaction:', error)
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive"
      })
    }
  }

  const handleApplyFilters = () => {
    if (selectedBank) {
      fetchBankTransactions(selectedBank.id)
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'CHEQUE': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      case 'CREDIT_PAYMENT': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'WITHDRAWAL': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
      case 'TRANSFER_IN': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      case 'TRANSFER_OUT': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
      case 'FEE': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
      case 'INTEREST': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'ADJUSTMENT': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    switch (status) {
      case 'CLEARED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Cleared</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'BOUNCED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Bounced</Badge>
      default:
        return null
    }
  }

  const transactionColumns = [
    {
      key: 'date' as keyof Transaction,
      title: 'Date',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(value as string).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'type' as keyof Transaction,
      title: 'Type',
      render: (value: unknown) => {
        const type = value as string
        return (
          <Badge variant="outline" className={getTransactionTypeColor(type)}>
            {type.replace('_', ' ')}
          </Badge>
        )
      }
    },
    {
      key: 'description' as keyof Transaction,
      title: 'Description',
      render: (value: unknown) => (
        <div className="max-w-md truncate" title={value as string}>
          {value as string}
        </div>
      )
    },
    {
      key: 'status' as keyof Transaction,
      title: 'Status',
      render: (value: unknown) => getStatusBadge(value as string) || <span className="text-muted-foreground">-</span>
    },
    {
      key: 'amount' as keyof Transaction,
      title: 'Amount',
      render: (value: unknown, row: Transaction) => (
        <div className="flex items-center gap-1 justify-end">
          <span className="font-mono font-semibold">
            Rs. {(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )
    }
  ]

  // Calculate overall totals
  const overallBalance = bankAccounts.reduce((sum, bank) => sum + bank.currentBalance, 0)
  const overallDeposits = bankAccounts.reduce((sum, bank) => sum + bank.totalDeposits, 0)
  const overallPendingCheques = bankAccounts.reduce((sum, bank) => sum + bank.pendingCheques, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Bank Accounts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all bank accounts, balances, and transactions
          </p>
        </div>
        <Button onClick={fetchBankAccounts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rs. {overallBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Across all accounts</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {overallDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground mt-1">All time</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              Rs. {overallPendingCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Awaiting clearance</div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bankAccounts.map((bank) => (
          <Card key={bank.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    {bank.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {bank.branch && <div>Branch: {bank.branch}</div>}
                    {bank.accountNumber && <div>A/C: {bank.accountNumber}</div>}
                  </CardDescription>
                </div>
                <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                  {bank.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Balance */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
                <div className="text-2xl font-bold text-green-600">
                  Rs. {bank.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Deposits</div>
                  <div className="font-mono font-semibold">
                    Rs. {bank.totalDeposits.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cheques</div>
                  <div className="font-mono font-semibold">
                    Rs. {bank.totalCheques.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Credit Payments</div>
                  <div className="font-mono font-semibold text-green-600">
                    Rs. {bank.totalCreditPayments.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pending</div>
                  <div className="font-mono font-semibold text-yellow-600">
                    Rs. {bank.pendingCheques.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* POS Terminals */}
              {bank.posTerminals.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    POS Terminals
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bank.posTerminals.map(terminal => (
                      <Badge key={terminal.id} variant="outline" className="text-xs">
                        {terminal.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  onClick={() => handleOpenTransaction(bank)}
                  variant="default"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Transaction
                </Button>
                <Button 
                  onClick={() => handleViewDetails(bank)} 
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All ({bank.transactionCount})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No bank accounts found</p>
          </CardContent>
        </Card>
      )}

      {/* Manual Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Transaction - {selectedBankForTransaction?.name}</DialogTitle>
            <DialogDescription>
              Add or remove money from this bank account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Current Balance</div>
              <div className="text-xl font-bold text-green-600">
                Rs. {selectedBankForTransaction?.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transactionType">Transaction Type *</Label>
                <Select
                  value={manualTransactionForm.type}
                  onValueChange={(value) => setManualTransactionForm({ ...manualTransactionForm, type: value })}
                >
                  <SelectTrigger id="transactionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Deposit (Add Money)</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal (Remove Money)</SelectItem>
                    <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                    <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                    <SelectItem value="FEE">Bank Fee/Charge</SelectItem>
                    <SelectItem value="INTEREST">Interest Earned</SelectItem>
                    <SelectItem value="ADJUSTMENT">Manual Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount (Rs.) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualTransactionForm.amount}
                  onChange={(e) => setManualTransactionForm({ ...manualTransactionForm, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={manualTransactionForm.description}
                onChange={(e) => setManualTransactionForm({ ...manualTransactionForm, description: e.target.value })}
                placeholder="e.g., Salary payment, Utility bill, Cash deposit"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={manualTransactionForm.referenceNumber}
                  onChange={(e) => setManualTransactionForm({ ...manualTransactionForm, referenceNumber: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="transactionDate">Transaction Date *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={manualTransactionForm.transactionDate}
                  onChange={(e) => setManualTransactionForm({ ...manualTransactionForm, transactionDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={manualTransactionForm.notes}
                onChange={(e) => setManualTransactionForm({ ...manualTransactionForm, notes: e.target.value })}
                placeholder="Optional additional notes"
                rows={3}
              />
            </div>

            {/* New Balance Preview */}
            {manualTransactionForm.amount && selectedBankForTransaction && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">New Balance (After Transaction)</div>
                  <div className="text-lg font-bold text-blue-600">
                    Rs. {(
                      selectedBankForTransaction.currentBalance + 
                      (['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(manualTransactionForm.type) ? 1 : -1) * 
                      parseFloat(manualTransactionForm.amount || '0')
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setTransactionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitManualTransaction}
                disabled={!manualTransactionForm.amount || !manualTransactionForm.description}
              >
                {['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(manualTransactionForm.type) ? (
                  <><TrendingUp className="h-4 w-4 mr-2" /> Add Money</>
                ) : (
                  <><TrendingDown className="h-4 w-4 mr-2" /> Remove Money</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History - {selectedBank?.name}</DialogTitle>
            <DialogDescription>
              {selectedBank?.branch && `${selectedBank.branch} • `}
              {selectedBank?.accountNumber && `A/C: ${selectedBank.accountNumber}`}
            </DialogDescription>
          </DialogHeader>

          {selectedBank && (
            <div className="space-y-6">
              {/* Transaction Summary */}
              {transactionSummary && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Deposits</div>
                      <div className="font-mono font-semibold text-sm">
                        Rs. {transactionSummary.totalDeposits.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Cleared</div>
                      <div className="font-mono font-semibold text-sm text-green-600">
                        Rs. {transactionSummary.clearedCheques.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Pending</div>
                      <div className="font-mono font-semibold text-sm text-yellow-600">
                        Rs. {transactionSummary.pendingCheques.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Bounced</div>
                      <div className="font-mono font-semibold text-sm text-red-600">
                        Rs. {transactionSummary.bouncedCheques.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Credit</div>
                      <div className="font-mono font-semibold text-sm">
                        Rs. {transactionSummary.totalCreditPayments.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-mono font-semibold text-sm">
                        {transactionSummary.transactionCount}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="transactionType">Transaction Type</Label>
                      <Select value={transactionType} onValueChange={setTransactionType}>
                        <SelectTrigger id="transactionType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="deposit">Deposits</SelectItem>
                          <SelectItem value="cheque">Cheques</SelectItem>
                          <SelectItem value="credit_payment">Credit Payments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleApplyFilters} className="w-full">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table */}
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <DataTable
                  data={transactions}
                  columns={transactionColumns}
                  searchable={true}
                  searchPlaceholder="Search transactions..."
                  pagination={true}
                  pageSize={20}
                />
              )}

              {!loadingTransactions && transactions.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
