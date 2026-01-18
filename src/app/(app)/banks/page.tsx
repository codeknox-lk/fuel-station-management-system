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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DataTable } from '@/components/ui/DataTable'

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
  transactionCount: number
  recentTransactions: Transaction[]
  posTerminals: Array<{ id: string; name: string }>
  createdAt: string
  updatedAt: string
}

interface Transaction {
  id: string
  type: 'DEPOSIT' | 'CHEQUE' | 'CREDIT_PAYMENT'
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

  const handleApplyFilters = () => {
    if (selectedBank) {
      fetchBankTransactions(selectedBank.id)
    }
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      case 'CHEQUE': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      case 'CREDIT_PAYMENT': return 'bg-green-500/10 text-green-600 dark:text-green-400'
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    switch (status) {
      case 'CLEARED':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Cleared</Badge>
      case 'PENDING':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'BOUNCED':
        return <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Bounced</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>
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
        <div className="flex items-center gap-2 justify-end">
          {row.type === 'DEPOSIT' || (row.type === 'CHEQUE' && row.status === 'CLEARED') || row.type === 'CREDIT_PAYMENT' ? (
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}
          <span className="font-mono font-semibold text-lg">
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Bank Accounts
          </h1>
          <p className="text-muted-foreground mt-1">
            View all bank accounts, balances, and transactions
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              Rs. {overallBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all bank accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              Rs. {overallDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time deposits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Cheques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              Rs. {overallPendingCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting clearance</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bankAccounts.map((bank) => (
          <Card key={bank.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {bank.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {bank.branch && `${bank.branch} • `}
                    {bank.accountNumber && `A/C: ${bank.accountNumber}`}
                  </CardDescription>
                </div>
                <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                  {bank.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Balance */}
              <div className="flex items-center justify-between p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    Rs. {bank.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>

              {/* Transaction Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Deposits
                  </p>
                  <p className="font-mono font-semibold text-blue-600">
                    Rs. {bank.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Cleared Cheques
                  </p>
                  <p className="font-mono font-semibold text-green-600">
                    Rs. {bank.clearedCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending Cheques
                  </p>
                  <p className="font-mono font-semibold text-yellow-600">
                    Rs. {bank.pendingCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Credit Payments
                  </p>
                  <p className="font-mono font-semibold text-purple-600">
                    Rs. {bank.totalCreditPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* POS Terminals */}
              {bank.posTerminals.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">POS Terminals:</p>
                  <div className="flex flex-wrap gap-2">
                    {bank.posTerminals.map(terminal => (
                      <Badge key={terminal.id} variant="outline" className="text-xs">
                        {terminal.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* View Details Button */}
              <Button 
                onClick={() => handleViewDetails(bank)} 
                className="w-full"
                variant="outline"
              >
                <Eye className="h-4 w-4 mr-2" />
                View All Transactions ({bank.transactionCount})
              </Button>
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

      {/* Transaction Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              {selectedBank?.name} - Transactions
            </DialogTitle>
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
                  <Card className="bg-blue-500/5">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Deposits</p>
                      <p className="font-mono font-bold text-blue-600">
                        Rs. {transactionSummary.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/5">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Cleared</p>
                      <p className="font-mono font-bold text-green-600">
                        Rs. {transactionSummary.clearedCheques.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-500/5">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-mono font-bold text-yellow-600">
                        Rs. {transactionSummary.pendingCheques.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/5">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Bounced</p>
                      <p className="font-mono font-bold text-red-600">
                        Rs. {transactionSummary.bouncedCheques.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-500/5">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Credit</p>
                      <p className="font-mono font-bold text-purple-600">
                        Rs. {transactionSummary.totalCreditPayments.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-mono font-bold">
                        {transactionSummary.transactionCount}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
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
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
