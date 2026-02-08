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
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
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
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  TrendingUp,
  Building2,
  Calendar,
  AlertCircle,
  ArrowUpCircle
} from 'lucide-react'

interface Cheque {
  id: string
  chequeNumber: string
  amount: number
  receivedFrom: string
  receivedDate: string
  chequeDate?: string
  status: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'RETURNED' | 'BOUNCED' | 'CANCELLED'
  bank?: {
    id: string
    name: string
  }
  creditPayment?: {
    customer: {
      name: string
    }
  }
}

interface Bank {
  id: string
  name: string
  branch?: string | null
  accountNumber?: string | null
}

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
      dialogTouchAmount: number
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

interface GroupedTransaction extends SafeTransaction {
  isGrouped: boolean
  breakdown?: {
    cash: number
    card: number
    credit: number
    cheque: number
    total: number
  }
  transactions?: SafeTransaction[]
}


const INCOME_TYPES = [
  'CASH_FUEL_SALES',
  'POS_CARD_PAYMENT',
  'CREDIT_PAYMENT',
  'LOAN_REPAID',
  'OPENING_BALANCE'
]

// Group transactions by shift closure
function groupTransactionsByShift(transactions: SafeTransaction[]): (SafeTransaction | GroupedTransaction)[] {
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
  const grouped: (SafeTransaction | GroupedTransaction)[] = []

  shiftGroups.forEach((shiftTxs, shiftId) => {
    // Sort by timestamp to get the first transaction (for display)
    shiftTxs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const firstTx = shiftTxs[0]

    // Get shift info from first transaction
    const shift = firstTx.shift
    const declaredAmounts = shift?.declaredAmounts

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
  const { selectedStation, setSelectedStation, stations } = useStation()
  const [safe, setSafe] = useState<Safe | null>(null)
  const [groupedTransactions, setGroupedTransactions] = useState<(SafeTransaction | GroupedTransaction)[]>([])
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [outstandingCredit, setOutstandingCredit] = useState(0)
  const { toast } = useToast()


  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false)
  const [loanDialogOpen, setLoanDialogOpen] = useState(false)
  const [bankDepositDialogOpen, setBankDepositDialogOpen] = useState(false)
  const [chequeActionDialogOpen, setChequeActionDialogOpen] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null)
  const [chequeAction, setChequeAction] = useState<'DEPOSIT' | 'CLEAR' | 'RETURN'>('DEPOSIT')
  const [actionDate, setActionDate] = useState<Date>(new Date())
  const [actionNote, setActionNote] = useState('')

  // Form states
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [sourceOfIncome, setSourceOfIncome] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('EXPENSE')

  // Add Cheque States
  const [addChequeDialogOpen, setAddChequeDialogOpen] = useState(false)

  const [newCheque, setNewCheque] = useState<{
    chequeNumber: string
    amount: number | undefined
    bankId: string
    receivedFrom: string
    chequeDate: Date
    receivedDate: Date
    notes: string
  }>({
    chequeNumber: '',
    amount: undefined,
    bankId: '',
    receivedFrom: '',
    chequeDate: new Date(),
    receivedDate: new Date(),
    notes: ''
  })
  const [customExpense, setCustomExpense] = useState('')
  const [transactionDate, setTransactionDate] = useState<Date>(new Date())
  const [openingBalance, setOpeningBalance] = useState<number | undefined>(undefined)

  // Loan form states
  const [loanCategory, setLoanCategory] = useState<'PUMPER' | 'EXTERNAL' | 'OFFICE'>('PUMPER')
  const [loanPumperId, setLoanPumperId] = useState('')
  const [loanRecipientName, setLoanRecipientName] = useState('')
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
  const [banks, setBanks] = useState<Bank[]>([])

  useEffect(() => {
    if (selectedStation && selectedStation !== 'all') {
      fetchSafe()
      fetchPumpersAndBanks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error) {
      console.error('Failed to fetch pumpers/banks:', error)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation])

  const fetchSafe = async () => {
    if (!selectedStation) return

    try {
      // Build API URLs with station filter
      const stationParam = selectedStation === 'all' ? '' : `stationId=${selectedStation}`
      const stationQuery = stationParam ? `?${stationParam}` : ''
      const stationQueryAmp = stationParam ? `${stationParam}&` : ''

      const [safeRes, transactionsRes, creditRes, chequesRes] = await Promise.all([
        fetch(`/api/safe${stationQuery}`),
        fetch(`/api/safe/transactions?${stationQueryAmp}limit=50`),
        fetch(`/api/safe/outstanding-credit${stationQuery}`),
        fetch(`/api/cheques${stationQuery}`)
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

      let chequesData: Cheque[] = []
      if (chequesRes.ok) {
        chequesData = await chequesRes.json()
      }

      setSafe(safeData)
      setOutstandingCredit(creditData.totalOutstanding || 0)
      setCheques(Array.isArray(chequesData) ? chequesData : [])

      // Group transactions by shift closure for better display
      const grouped = groupTransactionsByShift(transactionsData)
      setGroupedTransactions(grouped)
    } catch (err) {
      console.error('Failed to fetch safe:', err)
      toast({
        title: "Error",
        description: "Failed to load safe data",
        variant: "destructive"
      })
    } finally {

    }
  }

  const handleAddCheque = async () => {
    if (!selectedStation) {
      toast({
        title: "Error",
        description: "No station selected",
        variant: "destructive"
      })
      return
    }

    if (!newCheque.chequeNumber || !newCheque.amount || !newCheque.bankId || !newCheque.receivedFrom) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Cheque No, Amount, Bank, Received From)",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/cheques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stationId: selectedStation,
          chequeNumber: newCheque.chequeNumber,
          amount: newCheque.amount,
          bankId: newCheque.bankId,
          receivedFrom: newCheque.receivedFrom,
          receivedDate: newCheque.receivedDate,
          notes: newCheque.notes
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add cheque')
      }

      toast({
        title: "Success",
        description: "Cheque added successfully",
      })

      setAddChequeDialogOpen(false)
      setNewCheque({
        chequeNumber: '',
        amount: undefined,
        bankId: '',
        receivedFrom: '',
        chequeDate: new Date(),
        receivedDate: new Date(),
        notes: ''
      })
      fetchSafe() // Refresh list
    } catch (error) {
      console.error('Error adding cheque:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add cheque",
        variant: "destructive"
      })
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || amount === undefined || !sourceOfIncome || !responsiblePerson) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      const finalDescription = description
        ? `${sourceOfIncome} - ${description}`
        : sourceOfIncome

      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          type: 'CASH_FUEL_SALES', // Default income type for API
          amount: amount || 0,
          description: finalDescription,
          performedBy: responsiblePerson,
          timestamp: transactionDate.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      setAddDialogOpen(false)
      setAmount(undefined)
      setSourceOfIncome('')
      setResponsiblePerson('')
      setDescription('')
      setTransactionDate(new Date())

      toast({
        title: "Success",
        description: "Transaction added successfully!"
      })

      fetchSafe()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      })
    }
  }

  const handleRemoveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || amount === undefined || !responsiblePerson) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (expenseCategory === 'OTHER' && !customExpense) {
      toast({
        title: "Error",
        description: "Please specify the expense type",
        variant: "destructive"
      })
      return
    }

    try {
      const expenseType = expenseCategory === 'OTHER' ? customExpense : 'General Expense'
      const finalDescription = description
        ? `${expenseType} - ${description}`
        : expenseType

      const response = await fetch('/api/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          type: 'EXPENSE',
          amount: amount || 0,
          description: finalDescription,
          performedBy: responsiblePerson,
          timestamp: transactionDate.toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create transaction')
      }

      setRemoveDialogOpen(false)
      setAmount(undefined)
      setExpenseCategory('EXPENSE')
      setCustomExpense('')
      setResponsiblePerson('')
      setDescription('')
      setTransactionDate(new Date())

      toast({
        title: "Success",
        description: "Transaction recorded successfully!"
      })

      fetchSafe()
    } catch {
      toast({
        title: "Error",
        description: "Failed to record transaction",
        variant: "destructive"
      })
    }
  }

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || openingBalance === undefined) {
      toast({
        title: "Error",
        description: "Please enter opening balance",
        variant: "destructive"
      })
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

      toast({
        title: "Success",
        description: "Opening balance set successfully!"
      })

      fetchSafe()
    } catch {
      toast({
        title: "Error",
        description: "Failed to set opening balance",
        variant: "destructive"
      })
    }
  }


  const handleGiveLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || loanAmount === undefined) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (loanCategory === 'PUMPER' && !loanPumperId) {
      toast({
        title: "Error",
        description: "Please select a pumper",
        variant: "destructive"
      })
      return
    }

    if ((loanCategory === 'EXTERNAL' || loanCategory === 'OFFICE') && !loanRecipientName) {
      toast({
        title: "Error",
        description: "Please enter recipient name",
        variant: "destructive"
      })
      return
    }

    try {
      let apiUrl = ''
      let bodyData: {
        stationId: string
        amount: number
        monthlyRental: number

        dueDate: string
        fromSafe: boolean
        pumperName?: string
        staffName?: string
        borrowerName?: string
        borrowerPhone?: string
        reason?: string
        notes?: string
      } = {
        stationId: selectedStation,
        amount: loanAmount || 0,
        monthlyRental: loanMonthlyRental || 0,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        fromSafe: true
      }

      if (loanCategory === 'PUMPER') {
        const selectedPumper = pumpers.find(p => p.id === loanPumperId)
        const pumperName = selectedPumper?.name || 'Unknown Pumper'
        apiUrl = '/api/loans/pumper'
        bodyData = {
          ...bodyData,
          pumperName: pumperName,
          reason: loanNotes || 'Loan given from safe'
        }
      } else if (loanCategory === 'OFFICE') {
        apiUrl = '/api/loans/office'
        bodyData = {
          ...bodyData,
          staffName: loanRecipientName,
          reason: loanNotes || 'Loan given from safe'
        }
      } else if (loanCategory === 'EXTERNAL') {
        apiUrl = '/api/loans/external'
        bodyData = {
          ...bodyData,
          borrowerName: loanRecipientName,
          borrowerPhone: 'N/A',
          notes: loanNotes || 'Loan given from safe'
        }
      }

      const loanResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      })

      if (!loanResponse.ok) {
        throw new Error('Failed to record loan')
      }

      setLoanDialogOpen(false)
      setLoanCategory('PUMPER')
      setLoanPumperId('')
      setLoanRecipientName('')
      setLoanAmount(undefined)
      setLoanMonthlyRental(undefined)
      setLoanNotes('')

      toast({
        title: "Success",
        description: "Loan recorded successfully!"
      })

      fetchSafe()
    } catch {
      toast({
        title: "Error",
        description: "Failed to record loan",
        variant: "destructive"
      })
    }
  }

  const handleBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all' || !depositBankId || depositAmount === undefined || !depositPerformedBy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    // Validate deposit amount doesn't exceed safe balance
    const currentBalance = safe?.currentBalance || 0
    if (depositAmount > currentBalance) {
      toast({
        title: "Error",
        description: `Cannot deposit more than available cash. Current: Rs. ${currentBalance.toLocaleString()}`,
        variant: "destructive"
      })
      return
    }

    if (depositAmount <= 0) {
      toast({
        title: "Error",
        description: "Deposit amount must be greater than zero",
        variant: "destructive"
      })
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
          timestamp: new Date().toISOString(),
          bankId: depositBankId, // Pass bank ID for bank transaction tracking
          bankDepositNotes: depositNotes
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

      toast({
        title: "Success",
        description: "Bank deposit recorded successfully!"
      })

      fetchSafe()
    } catch {
      toast({
        title: "Error",
        description: "Failed to record bank deposit",
        variant: "destructive"
      })
    }
  }

  const handleChequeAction = async () => {
    if (!selectedCheque || !selectedStation) return

    if (chequeAction === 'DEPOSIT' && !depositBankId) {
      toast({
        title: "Error",
        description: "Please select a bank for deposit",
        variant: "destructive"
      })
      return
    }

    if (chequeAction === 'CLEAR' && !depositBankId) {
      toast({
        title: "Error",
        description: "Please select the target bank for clearance",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/cheques/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chequeIds: [selectedCheque.id],
          action: chequeAction,
          stationId: selectedStation,
          targetBankId: (chequeAction === 'DEPOSIT' || chequeAction === 'CLEAR') ? depositBankId : undefined,
          clearedDate: chequeAction === 'CLEAR' ? actionDate : undefined,
          returnDate: chequeAction === 'RETURN' ? actionDate : undefined,
          reason: chequeAction === 'RETURN' ? actionNote : undefined,
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update cheque status')
      }

      setChequeActionDialogOpen(false)
      setSelectedCheque(null)
      setDepositBankId('')

      toast({
        title: "Success",
        description: `Cheque ${chequeAction.toLowerCase()}ed successfully`
      })

      fetchSafe()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update cheque status",
        variant: "destructive"
      })
    }
  }

  const getChequeStatusColor = (status: string) => {
    switch (status) {
      case 'CLEARED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'DEPOSITED': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'RETURNED':
      case 'BOUNCED':
        return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
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

  const transactionColumns: Column<SafeTransaction | GroupedTransaction>[] = [
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
      render: (value: unknown) => {
        const type = value as string
        if (type === 'SHIFT_CLOSURE') {
          return (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <Badge className="bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300">
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
      render: (value: unknown, row: SafeTransaction | GroupedTransaction) => {
        const description = value as string

        // Show shift closure breakdown
        if ('isGrouped' in row && row.isGrouped && row.type === 'SHIFT_CLOSURE') {
          const pumpers = row.shift?.assignments
            ?.map((a) => a.pumper?.name || a.pumperName)
            .filter((name, index, arr) => name && arr.indexOf(name) === index)
            .join(', ') || 'Unknown'

          const breakdown = row.breakdown
          const parts: string[] = []
          if (breakdown && breakdown.cash > 0) parts.push(`Cash: Rs. ${breakdown.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown && breakdown.card > 0) parts.push(`Card: Rs. ${breakdown.card.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown && breakdown.credit > 0) parts.push(`Credit: Rs. ${breakdown.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
          if (breakdown && breakdown.cheque > 0) parts.push(`Cheque: Rs. ${breakdown.cheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

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
                  {breakdown && breakdown.total > 0 && (
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
            ?.map((a) => a.pumper?.name || a.pumperName)
            .filter((name, index, arr) => name && arr.indexOf(name) === index)
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
          const terminals = row.batch.terminalEntries?.map((entry) =>
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
      render: (value: unknown, row: SafeTransaction | GroupedTransaction) => {
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
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          Safe Management
        </h1>
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
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            Safe Management
          </h1>
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

      {/* Station Selector */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <Label htmlFor="station-select" className="sr-only">Select Station</Label>
            <Select
              value={selectedStation || ''}
              onValueChange={setSelectedStation}
            >
              <SelectTrigger id="station-select" className="w-[300px]">
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={fetchSafe}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>

      {/* Safe Balance Cards */},
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

        <div className="p-4 border rounded-lg bg-card border-orange-500/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-muted-foreground">Total Assets</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                Rs. {((safe?.currentBalance || 0) + outstandingCredit).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cash + Outstanding Credit
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400 ml-2" />
          </div>
        </div>
      </div>

      {/* Key Metrics - More Valuable Stats */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cheques">Cheques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Outstanding Loans */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Outstanding Loans</h3>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    Rs. {(() => {
                      const loanGiven = groupedTransactions
                        .filter(t => !('isGrouped' in t && t.isGrouped) && t.type === 'LOAN_GIVEN')
                        .reduce((sum, t) => sum + t.amount, 0)
                      const loanRepaid = groupedTransactions
                        .filter(t => !('isGrouped' in t && t.isGrouped) && t.type === 'LOAN_REPAID')
                        .reduce((sum, t) => sum + t.amount, 0)
                      return (loanGiven - loanRepaid).toLocaleString()
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Money to be collected
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-amber-600 dark:text-amber-400 ml-2" />
              </div>
            </div>

            {/* Today's Collections */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Today&apos;s Collections</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    Rs. {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const todayCollections = groupedTransactions
                        .filter(t => {
                          const txDate = new Date(t.timestamp)
                          txDate.setHours(0, 0, 0, 0)
                          return txDate.getTime() === today.getTime() &&
                            ['CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'CHEQUE_RECEIVED', 'LOAN_REPAID'].includes(t.type)
                        })
                        .reduce((sum, t) => sum + t.amount, 0)
                      return todayCollections.toLocaleString()
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {groupedTransactions.filter(t => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const txDate = new Date(t.timestamp)
                      txDate.setHours(0, 0, 0, 0)
                      return txDate.getTime() === today.getTime()
                    }).length} transactions today
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400 ml-2" />
              </div>
            </div>

            {/* Bank Deposits This Week */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Bank Deposits (7d)</h3>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    Rs. {(() => {
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      const deposits = groupedTransactions
                        .filter(t => !('isGrouped' in t && t.isGrouped) && t.type === 'BANK_DEPOSIT' && new Date(t.timestamp) >= weekAgo)
                        .reduce((sum, t) => sum + t.amount, 0)
                      return deposits.toLocaleString()
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Banked last 7 days
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400 ml-2" />
              </div>
            </div>

            {/* Largest Transaction Today */}
            <div className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Largest Transaction</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                    Rs. {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const todayTx = groupedTransactions.filter(t => {
                        const txDate = new Date(t.timestamp)
                        txDate.setHours(0, 0, 0, 0)
                        return txDate.getTime() === today.getTime()
                      })
                      const largest = todayTx.length > 0
                        ? Math.max(...todayTx.map(t => t.amount))
                        : 0
                      return largest.toLocaleString()
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Today&apos;s peak transaction
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-red-600 dark:text-red-400 ml-2" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <ArrowDownRight className="h-5 w-5" />
                    Add Money to Safe
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">Record incoming cash to the safe</p>
                </DialogHeader>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-semibold text-green-900 dark:text-green-100">Incoming Transaction</span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      This will increase the safe balance
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="sourceOfIncome" className="text-base font-semibold">Source of Income *</Label>
                    <Input
                      id="sourceOfIncome"
                      value={sourceOfIncome}
                      onChange={(e) => setSourceOfIncome(e.target.value)}
                      placeholder="E.g., Fuel Sales, Card Payment, Loan Repayment, etc."
                      className="mt-1"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the source of this income
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="addAmount" className="text-base font-semibold">Amount (Rs.) *</Label>
                    <MoneyInput
                      id="addAmount"
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsiblePersonAdd" className="text-base font-semibold">Responsible Person *</Label>
                    <Input
                      id="responsiblePersonAdd"
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      placeholder="Name of person responsible"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="addDescription" className="text-base font-semibold">Additional Notes (Optional)</Label>
                    <Input
                      id="addDescription"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter additional details"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addDate" className="text-base font-semibold">Date & Time</Label>
                    <DateTimePicker
                      value={transactionDate}
                      onChange={(date) => setTransactionDate(date || new Date())}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => {
                      setAddDialogOpen(false)
                      setSourceOfIncome('')
                      setResponsiblePerson('')
                      setDescription('')
                      setAmount(undefined)
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">Add to Safe</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Continue with Remove Money, Give Loan, Bank Deposit buttons... */}
            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { }}>
                  <Minus className="mr-2 h-4 w-4" />
                  Remove Money
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <ArrowUpRight className="h-5 w-5" />
                    Remove Money from Safe
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">Record outgoing cash from the safe</p>
                </DialogHeader>
                <form onSubmit={handleRemoveTransaction} className="space-y-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-semibold text-red-900 dark:text-red-100">Outgoing Transaction</span>
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      This will decrease the safe balance
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="expenseCategory" className="text-base font-semibold">Expense Category *</Label>
                    <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                      <SelectTrigger id="expenseCategory" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">General Expense</SelectItem>
                        <SelectItem value="OTHER">Other (Specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {expenseCategory === 'OTHER' && (
                    <div>
                      <Label htmlFor="customExpense" className="text-base font-semibold">Specify Expense Type *</Label>
                      <Input
                        id="customExpense"
                        value={customExpense}
                        onChange={(e) => setCustomExpense(e.target.value)}
                        placeholder="Enter expense type"
                        className="mt-1"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="removeAmount" className="text-base font-semibold">Amount (Rs.) *</Label>
                    <MoneyInput
                      id="removeAmount"
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="responsiblePersonRemove" className="text-base font-semibold">Responsible Person *</Label>
                    <Input
                      id="responsiblePersonRemove"
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      placeholder="Name of person responsible"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="removeDescription" className="text-base font-semibold">Additional Notes (Optional)</Label>
                    <Input
                      id="removeDescription"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter additional details"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="removeDate" className="text-base font-semibold">Date & Time</Label>
                    <DateTimePicker
                      value={transactionDate}
                      onChange={(date) => setTransactionDate(date || new Date())}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => {
                      setRemoveDialogOpen(false)
                      setExpenseCategory('EXPENSE')
                      setCustomExpense('')
                      setResponsiblePerson('')
                      setDescription('')
                      setAmount(undefined)
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive">Remove from Safe</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Loan Dialog */}
            <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Give Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    Give Loan from Safe
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">Record a loan given from safe cash</p>
                </DialogHeader>
                <form onSubmit={handleGiveLoan} className="space-y-4">
                  <div>
                    <Label htmlFor="loanCategory" className="text-base font-semibold">Loan Category</Label>
                    <Select value={loanCategory} onValueChange={(value) => {
                      setLoanCategory(value as 'PUMPER' | 'EXTERNAL' | 'OFFICE')
                      setLoanPumperId('')
                      setLoanRecipientName('')
                    }}>
                      <SelectTrigger id="loanCategory" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUMPER">Pumper Loan</SelectItem>
                        <SelectItem value="EXTERNAL">External Loan (Customer/Supplier)</SelectItem>
                        <SelectItem value="OFFICE">Office/Staff Loan</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loanCategory === 'PUMPER' && 'Loan to a pumper employee'}
                      {loanCategory === 'EXTERNAL' && 'Loan to external party (customer, supplier, etc.)'}
                      {loanCategory === 'OFFICE' && 'Loan to office staff or management'}
                    </p>
                  </div>

                  {loanCategory === 'PUMPER' ? (
                    <div>
                      <Label htmlFor="loanPumper" className="text-base font-semibold">Select Pumper</Label>
                      <Select value={loanPumperId} onValueChange={setLoanPumperId}>
                        <SelectTrigger id="loanPumper" className="mt-1">
                          <SelectValue placeholder="Choose a pumper..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pumpers.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No pumpers available</div>
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
                  ) : (
                    <div>
                      <Label htmlFor="loanRecipient" className="text-base font-semibold">Recipient Name</Label>
                      <Input
                        id="loanRecipient"
                        value={loanRecipientName}
                        onChange={(e) => setLoanRecipientName(e.target.value)}
                        placeholder={loanCategory === 'EXTERNAL' ? 'E.g., Customer Name, Supplier Name' : 'E.g., Office Manager, Accountant'}
                        className="mt-1"
                      />
                    </div>
                  )}

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
                      Amount to deduct monthly (default: 0)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="loanNotes">Notes (Optional)</Label>
                    <Input
                      id="loanNotes"
                      value={loanNotes}
                      onChange={(e) => setLoanNotes(e.target.value)}
                      placeholder="Additional notes"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setLoanDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Give Loan</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={bankDepositDialogOpen} onOpenChange={setBankDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Bank Deposit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bank Deposit</DialogTitle>
                  <DialogDescription>
                    Record money deposited to bank from safe
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBankDeposit} className="space-y-4">
                  <div>
                    <Label htmlFor="depositBank" className="text-base font-semibold">Bank Account *</Label>
                    <Select value={depositBankId} onValueChange={setDepositBankId}>
                      <SelectTrigger id="depositBank" className="mt-1">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No bank accounts available</div>
                        ) : (
                          banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{bank.name}</span>
                                {bank.accountNumber && (
                                  <span className="text-xs text-muted-foreground">A/C: {bank.accountNumber}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {depositBankId && banks.find(b => b.id === depositBankId)?.accountNumber && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Account Number: <span className="font-mono font-medium">{banks.find(b => b.id === depositBankId)?.accountNumber}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="depositAmount" className="text-base font-semibold">Deposit Amount (Rs.) *</Label>
                    <MoneyInput
                      id="depositAmount"
                      value={depositAmount}
                      onChange={setDepositAmount}
                      placeholder="Enter amount"
                      className="mt-1"
                    />
                    {safe && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Available in safe: Rs. {(safe.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="depositPerformedBy" className="text-base font-semibold">Performed By *</Label>
                    <Input
                      id="depositPerformedBy"
                      value={depositPerformedBy}
                      onChange={(e) => setDepositPerformedBy(e.target.value)}
                      placeholder="Name of person making deposit"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="depositNotes" className="text-base font-semibold">Notes (Optional)</Label>
                    <Input
                      id="depositNotes"
                      value={depositNotes}
                      onChange={(e) => setDepositNotes(e.target.value)}
                      placeholder="Additional notes"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBankDepositDialogOpen(false)
                        setDepositBankId('')
                        setDepositAmount(undefined)
                        setDepositPerformedBy('')
                        setDepositNotes('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Record Deposit
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>


          {/* Removed: All POS verification/reconciliation - Now handled in Close Shift page */}
          {/* Removed: Unprocessed Shifts section - All verification now happens in Close Shift page */}

          {/* Transactions Table */}
          <FormCard title="Recent Transactions" className="p-6">
            <DataTable
              data={groupedTransactions}
              columns={transactionColumns}
              searchPlaceholder="Search transactions..."
              emptyMessage="No transactions found."
              enableExport={true}
              exportFileName="safe-transactions"
              onRowClick={(row) => {
                // For shift closures, navigate to the first transaction's details page
                // The details page will show all related transactions
                if ('isGrouped' in row && row.isGrouped && row.transactions && row.transactions.length > 0) {
                  router.push(`/safe/transactions/${row.transactions[0].id}`)
                } else {
                  router.push(`/safe/transactions/${row.id}`)
                }
              }}
            />
          </FormCard>
        </TabsContent>

        <TabsContent value="cheques" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending Cheques</p>
                    <p className="text-2xl font-bold">{cheques.filter(c => c.status === 'PENDING').length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Pending Value</p>
                    <p className="text-2xl font-bold">Rs. {cheques.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <FormCard title="Cheque Management" className="p-6" actions={
            <Button onClick={() => setAddChequeDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Cheque
            </Button>
          }>
            <DataTable
              data={cheques}
              columns={[
                { key: 'receivedDate', title: 'Received Date', render: (val) => new Date(val as string).toLocaleDateString() },
                { key: 'chequeDate', title: 'Cheque Date', render: (val) => val ? new Date(val as string).toLocaleDateString() : '-' },
                { key: 'chequeNumber', title: 'Cheque No.' },
                { key: 'bank', title: 'Bank', render: (_, row) => row.bank?.name || '-' },
                { key: 'amount', title: 'Amount', render: (val) => `Rs. ${Number(val).toLocaleString()}` },
                { key: 'receivedFrom', title: 'Received From', render: (val, row) => row.creditPayment?.customer?.name || (val as string) },
                {
                  key: 'status', title: 'Status', render: (val) => (
                    <Badge className={getChequeStatusColor(val as string)}>
                      {val as string}
                    </Badge>
                  )
                },
                {
                  key: 'id',
                  title: 'Actions',
                  render: (_, row) => {
                    const cheque = row

                    if (cheque.status === 'PENDING') {
                      return (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedCheque(cheque)
                            setChequeAction('DEPOSIT')
                            setChequeActionDialogOpen(true)
                          }}>Deposit</Button>
                        </div>
                      )
                    }

                    if (cheque.status === 'DEPOSITED') {
                      return (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => {
                            setSelectedCheque(cheque)
                            setChequeAction('CLEAR')
                            // Pre-fill bank if available
                            if (cheque.bank?.id) {
                              setDepositBankId(cheque.bank.id)
                            } else {
                              setDepositBankId('')
                            }
                            setChequeActionDialogOpen(true)
                          }}>Clear</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
                            setSelectedCheque(cheque)
                            setChequeAction('RETURN')
                            setChequeActionDialogOpen(true)
                          }}>Return</Button>
                        </div>
                      )
                    }

                    return null
                  }
                }
              ]}
              searchPlaceholder="Search cheques..."
            />
          </FormCard>
        </TabsContent>
      </Tabs>

      <Dialog open={chequeActionDialogOpen} onOpenChange={setChequeActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chequeAction === 'DEPOSIT' ? 'Deposit Cheque' : chequeAction === 'CLEAR' ? 'Clear Cheque' : 'Return Cheque'}</DialogTitle>
            <DialogDescription>
              {chequeAction === 'DEPOSIT' ? 'Select a bank to deposit this cheque into.' :
                chequeAction === 'CLEAR' ? 'Mark this cheque as cleared (money received in bank).' :
                  'Mark this cheque as returned/bounced.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Cheque No.</Label>
              <div className="col-span-3 font-medium">{selectedCheque?.chequeNumber}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount</Label>
              <div className="col-span-3 font-medium">Rs. {selectedCheque?.amount?.toLocaleString()}</div>
            </div>

            {chequeAction === 'DEPOSIT' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="chequeDepositBank" className="text-right">Bank</Label>
                <Select value={depositBankId} onValueChange={setDepositBankId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name} {bank.accountNumber ? `(${bank.accountNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {chequeAction === 'CLEAR' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Cleared Date</Label>
                  <div className="col-span-3">
                    <DateTimePicker value={actionDate} onChange={(date) => date && setActionDate(date)} />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="chequeClearBank" className="text-right">Target Bank</Label>
                  <Select value={depositBankId} onValueChange={setDepositBankId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select Target Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name} {bank.accountNumber ? `(${bank.accountNumber})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {chequeAction === 'RETURN' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Return Date</Label>
                  <div className="col-span-3">
                    <DateTimePicker value={actionDate} onChange={(date) => date && setActionDate(date)} />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Reason</Label>
                  <Input
                    className="col-span-3"
                    placeholder="Reason for return"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setChequeActionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChequeAction} disabled={(chequeAction === 'DEPOSIT' || chequeAction === 'CLEAR') && !depositBankId}>CONFIRM {chequeAction}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addChequeDialogOpen} onOpenChange={setAddChequeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Cheque</DialogTitle>
            <DialogDescription>
              Manually add a received cheque to the safe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Cheque Number *</Label>
              <Input
                value={newCheque.chequeNumber}
                onChange={(e) => setNewCheque({ ...newCheque, chequeNumber: e.target.value })}
                placeholder="Enter cheque number"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank *</Label>
              <Select
                value={newCheque.bankId}
                onValueChange={(value) => setNewCheque({ ...newCheque, bankId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name} {bank.branch ? `(${bank.branch})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <MoneyInput
                value={newCheque.amount || 0}
                onChange={(value) => setNewCheque({ ...newCheque, amount: value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Received From *</Label>
              <Input
                value={newCheque.receivedFrom}
                onChange={(e) => setNewCheque({ ...newCheque, receivedFrom: e.target.value })}
                placeholder="Customer Name / Payer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Received Date</Label>
                <DateTimePicker
                  value={newCheque.receivedDate}
                  onChange={(date) => date && setNewCheque({ ...newCheque, receivedDate: date })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cheque Date</Label>
                <DateTimePicker
                  value={newCheque.chequeDate}
                  onChange={(date) => date && setNewCheque({ ...newCheque, chequeDate: date })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newCheque.notes}
                onChange={(e) => setNewCheque({ ...newCheque, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddChequeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCheque}>Add Cheque</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

