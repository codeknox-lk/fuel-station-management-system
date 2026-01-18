'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet,
  Plus,
  Minus,
  DollarSign, 
  CreditCard,
  FileText,
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  AlertCircle, 
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  AlertTriangle
} from 'lucide-react'

interface Safe {
  id: string
  stationId: string
  openingBalance: number
  currentBalance: number
  lastCounted?: string
  countedBy?: string
}

interface SafeTransaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  performedBy: string
  timestamp: string
  shiftId?: string
  batchId?: string
  expenseId?: string
  loanId?: string
  shift?: {
  id: string
    template?: {
      name: string
    }
    assignments?: Array<{
      pumper?: {
        name: string
      }
      pumperName?: string
    }>
    declaredAmounts?: {
      cash?: number
      card?: number
      credit?: number
      cheque?: number
      total?: number
      pumperBreakdown?: Array<{
  pumperName: string
        calculatedSales: number
        declaredAmount: number
        declaredCash: number
        declaredCardAmounts: Record<string, number>
        declaredCreditAmounts: Record<string, number>
        declaredCheque: number
        cheques: Array<{
          chequeNumber: string
          amount: number
          receivedFrom: string
          bankName?: string
        }>
        advanceTaken: number
        expenses: Array<{
          type: string
          amount: number
          description?: string
          bankName?: string
          loanGivenToName?: string
        }>
        variance: number
        varianceStatus: string
      }>
    }
  }
  batch?: {
  id: string
  totalAmount: number
  terminalEntries?: Array<{
    id: string
    terminal: {
      id: string
      name: string
        terminalNumber: string
      bank?: {
        name: string
      }
    }
    startNumber: string
    endNumber: string
    transactionCount: number
    visaAmount: number
    masterAmount: number
    amexAmount: number
    qrAmount: number
  }>
  }
  cheque?: {
  id: string
    chequeNumber: string
    amount: number
  bank?: {
    name: string
  }
  }
}


const INCOME_TYPES = [
  'CASH_FUEL_SALES',
  'POS_CARD_PAYMENT',
  'CREDIT_PAYMENT',
  'CHEQUE_RECEIVED',
  'LOAN_REPAID',
  'OPENING_BALANCE'
]

const EXPENSE_TYPES = [
  'EXPENSE',
  'LOAN_GIVEN',
  'BANK_DEPOSIT',
  'CASH_TRANSFER'
]

// Group transactions by shift closure
function groupTransactionsByShift(transactions: SafeTransaction[]): any[] {
  const shiftGroups = new Map<string, SafeTransaction[]>()
  const standalone: SafeTransaction[] = []

  // Separate shift transactions from standalone transactions
  transactions.forEach(tx => {
    if (tx.shiftId) {
      if (!shiftGroups.has(tx.shiftId)) {
        shiftGroups.set(tx.shiftId, [])
      }
      shiftGroups.get(tx.shiftId)!.push(tx)
    } else {
      standalone.push(tx)
    }
  })

  // Create grouped entries for shift closures
  const grouped: any[] = []
  
  shiftGroups.forEach((shiftTxs, shiftId) => {
    // Sort by timestamp to get the first transaction (for display)
    shiftTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const firstTx = shiftTxs[0]
    
    // Get shift info from first transaction
    const shift = firstTx.shift
    const declaredAmounts = shift?.declaredAmounts as any
    
    // Use shift's declaredAmounts if available (more reliable), otherwise calculate from transactions
    let cashAmount = 0
    let cardAmount = 0
    let creditAmount = 0
    let chequeAmount = 0
    let totalAmount = 0
    
    if (declaredAmounts) {
      // Use declared amounts from shift (most accurate)
      cashAmount = declaredAmounts.cash || 0
      cardAmount = declaredAmounts.card || 0
      creditAmount = declaredAmounts.credit || 0
      chequeAmount = declaredAmounts.cheque || 0
      totalAmount = declaredAmounts.total || (cashAmount + cardAmount + creditAmount + chequeAmount)
    } else {
      // Fallback: Calculate from transactions
      totalAmount = shiftTxs.reduce((sum, tx) => sum + tx.amount, 0)
      cashAmount = shiftTxs.find(tx => tx.type === 'CASH_FUEL_SALES')?.amount || 0
      cardAmount = shiftTxs.find(tx => tx.type === 'POS_CARD_PAYMENT')?.amount || 0
      creditAmount = shiftTxs.find(tx => tx.type === 'CREDIT_PAYMENT')?.amount || 0
      chequeAmount = shiftTxs.filter(tx => tx.type === 'CHEQUE_RECEIVED').reduce((sum, tx) => sum + tx.amount, 0)
    }
    
    const shiftName = shift?.template?.name || 'Shift'
    const pumpers = shift?.assignments
      ?.map(a => a.pumper?.name || a.pumperName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index)
      .join(', ') || 'Unknown'

    grouped.push({
      id: `shift-${shiftId}`,
      type: 'SHIFT_CLOSURE',
      timestamp: firstTx.timestamp,
      amount: totalAmount, // Total amount from shift closure
      balanceBefore: firstTx.balanceBefore,
      balanceAfter: shiftTxs[shiftTxs.length - 1].balanceAfter, // Last transaction's balance
      performedBy: firstTx.performedBy,
      description: `Shift Closure: ${shiftName}`,
      shiftId,
      shift,
      breakdown: {
        cash: cashAmount,
        card: cardAmount,
        credit: creditAmount,
        cheque: chequeAmount,
        total: totalAmount
      },
      transactions: shiftTxs, // Keep reference to all transactions
      isGrouped: true
    })
  })

  // Add standalone transactions
  standalone.forEach(tx => {
    grouped.push({
      ...tx,
      isGrouped: false
    })
  })

  // Sort by timestamp (newest first)
  grouped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return grouped
}

export default function SafePage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const [safe, setSafe] = useState<Safe | null>(null)
  const [transactions, setTransactions] = useState<SafeTransaction[]>([])
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([])
  const [outstandingCredit, setOutstandingCredit] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [loanDialogOpen, setLoanDialogOpen] = useState(false)
  const [bankDepositDialogOpen, setBankDepositDialogOpen] = useState(false)

  // Form states
  const [transactionType, setTransactionType] = useState('CASH_FUEL_SALES')
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [openingBalance, setOpeningBalance] = useState<number | undefined>(undefined)
  
  // Loan form states
  const [loanPumperId, setLoanPumperId] = useState('')
  const [loanAmount, setLoanAmount] = useState<number | undefined>(undefined)
  const [loanMonthlyRental, setLoanMonthlyRental] = useState<number | undefined>(undefined)
  const [loanNotes, setLoanNotes] = useState('')
  
  // Bank deposit form states
  const [depositAmount, setDepositAmount] = useState<number | undefined>(undefined)
  const [depositBankId, setDepositBankId] = useState('')
  const [depositPerformedBy, setDepositPerformedBy] = useState('')
  const [depositNotes, setDepositNotes] = useState('')
  
  // Data states
  const [pumpers, setPumpers] = useState<Array<{ id: string; name: string; employeeId?: string }>>([])
  const [banks, setBanks] = useState<Array<{ id: string; name: string; branch?: string; accountNumber?: string }>>([])

  useEffect(() => {
    if (selectedStation && selectedStation !== 'all') {
      fetchSafe()
      fetchPumpersAndBanks()
    }
  }, [selectedStation])
  
  const fetchPumpersAndBanks = async () => {
    if (!selectedStation || selectedStation === 'all') return
    
    try {
      const [pumpersRes, banksRes] = await Promise.all([
        fetch(`/api/pumpers?active=true`),
        fetch(`/api/banks?active=true`)
      ])
      
      if (pumpersRes.ok) {
        const pumpersData = await pumpersRes.json()
        setPumpers(Array.isArray(pumpersData) ? pumpersData : [])
      }
      
      if (banksRes.ok) {
        const banksData = await banksRes.json()
        setBanks(Array.isArray(banksData) ? banksData : [])
      }
    } catch (err) {
      console.error('Failed to fetch pumpers/banks:', err)
    }
  }

  // Refresh when page is focused (e.g., when navigating from close shift)
  useEffect(() => {
    const handleFocus = () => {
      if (selectedStation && selectedStation !== 'all') {
        fetchSafe()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedStation])

  const fetchSafe = async () => {
    if (!selectedStation || selectedStation === 'all') return

    try {
      setLoading(true)
      const [safeRes, transactionsRes, creditRes] = await Promise.all([
        fetch(`/api/safe?stationId=${selectedStation}`),
        fetch(`/api/safe/transactions?stationId=${selectedStation}&limit=50`),
        fetch(`/api/safe/outstanding-credit?stationId=${selectedStation}`)
      ])

      if (!safeRes.ok || !transactionsRes.ok) {
        throw new Error('Failed to fetch safe data')
      }

      const safeData = await safeRes.json()
      const transactionsData = await transactionsRes.json()

      // Outstanding credit endpoint
      let creditData = { totalOutstanding: 0 }
      if (creditRes.ok) {
        creditData = await creditRes.json()
      }

      setSafe(safeData)
      setTransactions(transactionsData)
      setOutstandingCredit(creditData.totalOutstanding || 0)

      // Group transactions by shift closure for better display
      const grouped = groupTransactionsByShift(transactionsData)
      setGroupedTransactions(grouped)
    } catch (err) {
      console.error('Failed to fetch safe:', err)
      setError('Failed to load safe data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || amount === undefined || !description) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'

      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          type: transactionType,
          amount: amount || 0,
          description,
          performedBy: username,
          timestamp: transactionDate.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      setAddDialogOpen(false)
      setAmount(undefined)
      setDescription('')
      setTransactionDate(new Date())
      setSuccess('Transaction added successfully!')
      setTimeout(() => setSuccess(''), 3000)

      fetchSafe()
    } catch (err) {
      setError('Failed to add transaction')
    }
  }

  const handleRemoveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || amount === undefined || !description) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'

      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          type: transactionType,
          amount: amount || 0,
          description,
          performedBy: username,
          timestamp: transactionDate.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      setRemoveDialogOpen(false)
      setAmount(undefined)
      setDescription('')
      setTransactionDate(new Date())
      setSuccess('Transaction recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)

      fetchSafe()
    } catch (err) {
      setError('Failed to record transaction')
    }
  }

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || openingBalance === undefined) {
      setError('Please enter opening balance')
      return
    }

    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'

      const response = await fetch('/api/safe/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          openingBalance: openingBalance || 0,
          countedBy: username
        })
      })

      if (!response.ok) {
        throw new Error('Failed to set opening balance')
      }

      setBalanceDialogOpen(false)
      setOpeningBalance(undefined)
      setSuccess('Opening balance set successfully!')
      setTimeout(() => setSuccess(''), 3000)

      fetchSafe()
    } catch (err) {
      setError('Failed to set opening balance')
    }
  }


  const handleGiveLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || !loanPumperId || loanAmount === undefined) {
      setError('Please select a pumper and enter loan amount')
      return
    }

    try {
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'
      const selectedPumper = pumpers.find(p => p.id === loanPumperId)
      const pumperName = selectedPumper?.name || 'Unknown Pumper'

      // Create LoanPumper record with monthly rental
      const loanResponse = await fetch('/api/loans/pumper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          pumperName: pumperName,
          amount: loanAmount || 0,
          monthlyRental: loanMonthlyRental || 0,
          reason: loanNotes || 'Loan given from safe',
          givenBy: username,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          fromSafe: true
        })
      })

      if (!loanResponse.ok) {
        throw new Error('Failed to record loan')
      }

      setLoanDialogOpen(false)
      setLoanPumperId('')
      setLoanAmount(undefined)
      setLoanMonthlyRental(undefined)
      setLoanNotes('')
      setSuccess('Loan recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)
      fetchSafe()
    } catch (err) {
      setError('Failed to record loan')
    }
  }
  
  const handleBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || !depositBankId || depositAmount === undefined || !depositPerformedBy) {
      setError('Please fill in all required fields')
      return
    }

    // Validate deposit amount doesn't exceed safe balance
    const currentBalance = safe?.currentBalance || 0
    if (depositAmount > currentBalance) {
      setError(`Cannot deposit more than available cash. Current balance: Rs. ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      return
    }

    if (depositAmount <= 0) {
      setError('Deposit amount must be greater than zero')
      return
    }

    try {
      const selectedBank = banks.find(b => b.id === depositBankId)
      const bankName = selectedBank?.name || 'Unknown Bank'
      const bankAccount = selectedBank?.accountNumber ? ` (${selectedBank.accountNumber})` : ''

      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          type: 'BANK_DEPOSIT',
          amount: depositAmount || 0,
          description: `Bank deposit to ${bankName}${bankAccount}${depositNotes ? `: ${depositNotes}` : ''}`,
          performedBy: depositPerformedBy,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record bank deposit')
      }

      setBankDepositDialogOpen(false)
      setDepositBankId('')
      setDepositAmount(undefined)
      setDepositPerformedBy('')
      setDepositNotes('')
      setError('') // Clear any previous errors
      setSuccess('Bank deposit recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)
      fetchSafe()
    } catch (err) {
      setError('Failed to record bank deposit')
    }
  }


  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CASH_FUEL_SALES: 'Cash from Sales',
      POS_CARD_PAYMENT: 'POS Card Payment',
      CREDIT_PAYMENT: 'Credit Payment',
      CHEQUE_RECEIVED: 'Cheque Received',
      LOAN_REPAID: 'Loan Repaid',
      OPENING_BALANCE: 'Opening Balance',
      EXPENSE: 'Expense',
      LOAN_GIVEN: 'Loan Given',
      BANK_DEPOSIT: 'Bank Deposit',
      CASH_TRANSFER: 'Cash Transfer',
      COUNT_ADJUSTMENT: 'Count Adjustment'
    }
    return labels[type] || type
  }

  const getTypeIcon = (type: string) => {
    if (INCOME_TYPES.includes(type)) {
      return <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
  }

  const getTypeColor = (type: string) => {
    if (INCOME_TYPES.includes(type)) {
        return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
    }
        return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
  }

  const transactionColumns: Column<any>[] = [
    {
      key: 'timestamp',
      title: 'Date & Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{new Date(value as string).toLocaleString()}</span>
        </div>
      )
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: unknown, row: any) => {
        const type = value as string
        if (type === 'SHIFT_CLOSURE') {
          return (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300">
                Shift Closure
              </Badge>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            {getTypeIcon(type)}
            <Badge className={getTypeColor(type)}>
              {getTypeLabel(type)}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'description',
      title: 'Details',
      render: (value: unknown, row: any) => {
        const description = value as string
        
        // Show shift closure breakdown
        if (row.isGrouped && row.type === 'SHIFT_CLOSURE') {
          const shiftName = row.shift?.template?.name || 'Shift'
          const pumpers = row.shift?.assignments
            ?.map((a: any) => a.pumper?.name || a.pumperName)
            .filter((name: string, index: number, arr: string[]) => name && arr.indexOf(name) === index)
            .join(', ') || 'Unknown'
          
          const breakdown = row.breakdown
          const parts: string[] = []
          if (breakdown.cash > 0) parts.push(`Cash: Rs. ${breakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown.card > 0) parts.push(`Card: Rs. ${breakdown.card.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown.credit > 0) parts.push(`Credit: Rs. ${breakdown.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown.cheque > 0) parts.push(`Cheque: Rs. ${breakdown.cheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{description}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{pumpers}</span>
              </div>
              {parts.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {parts.join(' • ')}
                  {breakdown.total > 0 && (
                    <span className="ml-2 font-semibold text-foreground">
                      • Total: Rs. {breakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        }
        
        // Show shift info for individual shift transactions (shouldn't happen in grouped view, but fallback)
        if (row.shift) {
          const shiftName = row.shift.template?.name || 'Shift'
          const pumpers = row.shift.assignments
            ?.map((a: any) => a.pumper?.name || a.pumperName)
            .filter((name: string, index: number, arr: string[]) => name && arr.indexOf(name) === index)
            .join(', ') || 'Unknown'
          
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{description}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="h-3 w-3" />
                <span>{shiftName} • {pumpers}</span>
              </div>
            </div>
          )
        }
        
        // Show POS batch details
        if (row.batch && row.type === 'POS_CARD_PAYMENT') {
          const terminals = row.batch.terminalEntries?.map((entry: any) => 
            `${entry.terminal.terminalNumber} (${entry.terminal.name})`
          ).join(', ') || 'Unknown Terminal'
          
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{description}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-3 w-3" />
                <span>{terminals}</span>
              </div>
            </div>
          )
        }
        
        // Show cheque details
        if (row.cheque) {
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{description}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>Cheque #{row.cheque.chequeNumber}{row.cheque.bank ? ` • ${row.cheque.bank.name}` : ''}</span>
              </div>
            </div>
          )
        }
        
        return <span className="text-sm">{description}</span>
      }
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (value: unknown, row: any) => {
        const isIncome = row.type === 'SHIFT_CLOSURE' || INCOME_TYPES.includes(row.type)
        return (
          <div className={`flex items-center gap-2 font-mono ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
            {isIncome ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            <span className="font-semibold">
              Rs. {Math.abs(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )
      }
    },
    {
      key: 'balanceAfter',
      title: 'Balance',
      render: (value: unknown) => (
        <div className="flex items-center gap-2 font-mono">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Rs. {(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )
    },
    {
      key: 'performedBy',
      title: 'By',
      render: (value: unknown) => <span className="text-sm text-muted-foreground">{value as string}</span>
    }
  ]

  if (!selectedStation || selectedStation === 'all') {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Safe Management</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Station Selected</AlertTitle>
          <AlertDescription>Please select a station to view safe details.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Safe Management</h1>
          <p className="text-muted-foreground mt-2">Track all cash in and out of the safe</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Set Opening Balance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Opening Balance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSetOpeningBalance} className="space-y-4">
                <div>
                  <Label htmlFor="openingBalance">Opening Balance (Rs.)</Label>
                  <MoneyInput
                    id="openingBalance"
                    value={openingBalance}
                    onChange={setOpeningBalance}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setBalanceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Set Balance</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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

      {/* Safe Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground">Opening Balance</h3>
              <p className="text-2xl font-bold text-foreground mt-1">
                Rs. {safe?.openingBalance.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Starting cash at beginning of period
              </p>
            </div>
            <Wallet className="h-8 w-8 text-muted-foreground ml-2" />
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground">Physical Cash</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                Rs. {safe?.currentBalance.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Actual cash in safe
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 ml-2" />
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground">Outstanding Credit</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                Rs. {outstandingCredit.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Credit slips (not cash)
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-orange-600 dark:text-orange-400 ml-2" />
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-card border-purple-500/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground">Total Assets</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                Rs. {((safe?.currentBalance || 0) + outstandingCredit).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cash + Outstanding Credit
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400 ml-2" />
          </div>
        </div>
      </div>

      {/* Info Alert about Credit */}
      <Alert className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Understanding Credit in Safe</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-1 text-sm">
            <p><strong>Credit Sales:</strong> When fuel is sold on credit, a credit slip is stored in the safe (not cash). This increases "Outstanding Credit" but does NOT increase physical cash.</p>
            <p><strong>Credit Payments:</strong> When a credit customer pays their debt, that actual cash is added to the safe and their outstanding balance decreases.</p>
            <p><strong>Total Assets:</strong> Shows the combined value of physical cash + money owed to you (outstanding credit).</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setTransactionType('CASH_FUEL_SALES')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Money
        </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Money to Safe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <Label htmlFor="addType">Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger id="addType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_FUEL_SALES">Cash from Fuel Sales</SelectItem>
                    <SelectItem value="POS_CARD_PAYMENT">POS Card Payment</SelectItem>
                    <SelectItem value="CHEQUE_RECEIVED">Cheque Received</SelectItem>
                    <SelectItem value="LOAN_REPAID">Loan Repaid</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Credit payments should be recorded through the Credit Customers page to update customer balances.
                </p>
              </div>
              <div>
                <Label htmlFor="addAmount">Amount (Rs.)</Label>
                <MoneyInput
                  id="addAmount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="addDescription">Description</Label>
                <Input
                  id="addDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Transaction description"
                />
              </div>
              <div>
                <Label htmlFor="addDate">Date & Time</Label>
                <DateTimePicker
                  value={transactionDate}
                  onChange={(date) => setTransactionDate(date || new Date())}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
        </Button>
                <Button type="submit">Add to Safe</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setTransactionType('EXPENSE')}>
              <Minus className="mr-2 h-4 w-4" />
              Remove Money
        </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Money from Safe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRemoveTransaction} className="space-y-4">
              <div>
                <Label htmlFor="removeType">Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger id="removeType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="LOAN_GIVEN">Loan Given</SelectItem>
                    <SelectItem value="CASH_TRANSFER">Cash Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="removeAmount">Amount (Rs.)</Label>
                <MoneyInput
                  id="removeAmount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="removeDescription">Description</Label>
                <Input
                  id="removeDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Transaction description"
                />
              </div>
              <div>
                <Label htmlFor="removeDate">Date & Time</Label>
                <DateTimePicker
                  value={transactionDate}
                  onChange={(date) => setTransactionDate(date || new Date())}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                  Cancel
        </Button>
                <Button type="submit" variant="destructive">Remove from Safe</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Give Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Give Loan from Safe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGiveLoan} className="space-y-4">
              <div>
                <Label htmlFor="loanPumper">Pumper</Label>
                <Select value={loanPumperId} onValueChange={setLoanPumperId}>
                  <SelectTrigger id="loanPumper">
                    <SelectValue placeholder="Select a pumper" />
                  </SelectTrigger>
                  <SelectContent>
                    {pumpers.length === 0 ? (
                      <SelectItem value="" disabled>No pumpers available</SelectItem>
                    ) : (
                      pumpers.map((pumper) => (
                        <SelectItem key={pumper.id} value={pumper.id}>
                          {pumper.name}{pumper.employeeId ? ` (${pumper.employeeId})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="loanAmount">Loan Amount (Rs.)</Label>
                <MoneyInput
                  id="loanAmount"
                  value={loanAmount}
                  onChange={setLoanAmount}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="loanMonthlyRental">Monthly Rental (Rs.)</Label>
                <MoneyInput
                  id="loanMonthlyRental"
                  value={loanMonthlyRental}
                  onChange={setLoanMonthlyRental}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount to deduct monthly from pumper's salary (default: 0)
                </p>
              </div>
              <div>
                <Label htmlFor="loanNotes">Notes (Optional)</Label>
                <Input
                  id="loanNotes"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  placeholder="Additional details"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setLoanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">Give Loan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={bankDepositDialogOpen} onOpenChange={(open) => {
          setBankDepositDialogOpen(open)
          if (!open) {
            // Reset when dialog closes
            setDepositPerformedBy('')
            setDepositBankId('')
            setDepositAmount(undefined)
            setDepositNotes('')
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Bank Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Bank Deposit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleBankDeposit} className="space-y-4">
              <div>
                <Label htmlFor="depositPerformedBy">Deposited By</Label>
                <Input
                  id="depositPerformedBy"
                  value={depositPerformedBy}
                  onChange={(e) => setDepositPerformedBy(e.target.value)}
                  placeholder="Enter name (e.g., Manager, Owner)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="depositBankId">Bank Account</Label>
                <Select value={depositBankId} onValueChange={setDepositBankId}>
                  <SelectTrigger id="depositBankId">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No bank accounts available</div>
                    ) : (
                      banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{bank.name}{bank.branch && ` - ${bank.branch}`}</span>
                            {bank.accountNumber && (
                              <span className="text-xs text-muted-foreground">Account: {bank.accountNumber}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="depositAmount">Deposit Amount (Rs.)</Label>
                <MoneyInput
                  id="depositAmount"
                  value={depositAmount}
                  onChange={setDepositAmount}
                  placeholder="0.00"
                />
                {safe && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available cash: Rs. {safe.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="depositNotes">Notes (Optional)</Label>
                <Input
                  id="depositNotes"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Additional details"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setBankDepositDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Record Deposit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Removed: All POS verification/reconciliation - Now handled in Close Shift page */}
                    </div>

      {/* Removed: Unprocessed Shifts section - All verification now happens in Close Shift page */}

      {/* Transactions Table */}
      <FormCard title="Recent Transactions" className="p-6">
        <DataTable
          data={groupedTransactions}
          columns={transactionColumns}
          searchPlaceholder="Search transactions..."
          emptyMessage="No transactions found."
          onRowClick={(row) => {
            // For shift closures, navigate to the first transaction's details page
            // The details page will show all related transactions
            if (row.isGrouped && row.transactions && row.transactions.length > 0) {
              router.push(`/safe/transactions/${row.transactions[0].id}`)
            } else {
              router.push(`/safe/transactions/${row.id}`)
            }
          }}
        />
      </FormCard>

    </div>
  )
}

