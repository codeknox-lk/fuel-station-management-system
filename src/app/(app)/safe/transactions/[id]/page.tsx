'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  Users,
  DollarSign,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

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
        declaredCardAmountsWithNames?: Record<string, { amount: number; terminalName: string }>
        declaredCreditAmountsWithNames?: Record<string, { amount: number; customerName: string }>
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
      dialogTouchAmount?: number
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

export default function TransactionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  // Extract id immediately using useMemo to avoid Next.js 15 enumeration issues
  const transactionId = useMemo(() => (params?.id as string) || '', [params])

  const [transaction, setTransaction] = useState<SafeTransaction | null>(null)
  const [relatedTransactions, setRelatedTransactions] = useState<SafeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true)

        // Fetch transaction details
        const response = await fetch(`/api/safe/transactions?id=${transactionId}`)
        if (!response.ok) {
          throw new Error('Failed to load transaction')
        }

        const transactions = await response.json()
        if (!transactions || transactions.length === 0) {
          throw new Error('Transaction not found')
        }

        const currentTransaction = transactions[0]
        setTransaction(currentTransaction)

        // If this transaction is part of a shift closure, fetch all related transactions
        if (currentTransaction.shiftId) {
          try {
            // Fetch all transactions for this shift
            const relatedResponse = await fetch(`/api/safe/transactions?shiftId=${currentTransaction.shiftId}`)
            if (relatedResponse.ok) {
              const allShiftTransactions = await relatedResponse.json()
              // Exclude the current transaction from the list
              const related = allShiftTransactions.filter((tx: SafeTransaction) =>
                tx.id !== currentTransaction.id
              )
              setRelatedTransactions(related)
            }
          } catch (err) {
            console.warn('Failed to fetch related transactions:', err)
          }
        }
      } catch (err) {
        console.error('Error fetching transaction:', err)
        setError(err instanceof Error ? err.message : 'Failed to load transaction')
      } finally {
        setLoading(false)
      }
    }

    if (transactionId) {
      fetchTransaction()
    }
  }, [transactionId])

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
      return <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
    }
    return <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
  }

  const getTypeColor = (type: string) => {
    if (INCOME_TYPES.includes(type)) {
      return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
    }
    return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Transaction Details</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Transaction not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // For shift closures, show a completely redesigned layout
  if (transaction.shiftId && transaction.shift) {
    interface BreakdownExpense {
      type: string
      amount: number
      description?: string
      bankName?: string
      loanGivenToName?: string
    }

    interface BreakdownCheque {
      chequeNumber: string
      amount: number
      receivedFrom: string
      bankName?: string
    }

    interface PumperBreakdown {
      pumperName: string
      calculatedSales: number
      declaredCash: number
      declaredAmount: number
      variance: number
      varianceStatus: 'ADD_TO_SALARY' | 'DEDUCT_FROM_SALARY' | 'NORMAL'
      declaredCardAmounts: Record<string, number>
      declaredCreditAmounts: Record<string, number>
      declaredCardAmountsWithNames?: Record<string, { terminalName: string }>
      declaredCreditAmountsWithNames?: Record<string, { customerName: string }>
      cheques: BreakdownCheque[]
      expenses: BreakdownExpense[]
      advanceTaken: number
    }

    interface DeclaredAmounts {
      cash: number
      card: number
      credit: number
      cheque: number
      pumperBreakdown: PumperBreakdown[]
    }

    const declaredAmounts = transaction.shift.declaredAmounts as unknown as DeclaredAmounts
    const pumperBreakdowns = declaredAmounts?.pumperBreakdown || []

    // Calculate totals
    let totalCash = 0
    let totalCard = 0
    let totalCredit = 0
    let totalCheque = 0
    let totalCalculatedSales = 0
    let totalDeclared = 0
    let totalVariance = 0

    if (declaredAmounts) {
      totalCash = declaredAmounts.cash || 0
      totalCard = declaredAmounts.card || 0
      totalCredit = declaredAmounts.credit || 0
      totalCheque = declaredAmounts.cheque || 0
    }

    pumperBreakdowns.forEach((bd) => {
      totalCalculatedSales += bd.calculatedSales || 0
      totalDeclared += bd.declaredAmount || 0
      totalVariance += bd.variance || 0
    })

    const shiftName = transaction.shift.template?.name || 'Shift'
    const pumpers = transaction.shift.assignments
      ?.map(a => a.pumper?.name || a.pumperName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index)
      .join(', ') || 'Unknown'

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Shift Closure Report</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {shiftName} • Closed on {new Date(transaction.timestamp).toLocaleDateString()} at {new Date(transaction.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Shift Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Shift Name</Label>
                <div className="text-sm font-medium mt-1">{shiftName}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pumpers</Label>
                <div className="text-sm font-medium mt-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pumpers}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Closed By</Label>
                <div className="text-sm font-medium mt-1">{transaction.performedBy}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date & Time</Label>
                <div className="text-sm font-medium mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(transaction.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Money Collected */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              Total Money Collected
            </CardTitle>
            <CardDescription>All money collected during this shift and added to safe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/30">
                <div className="text-xs text-muted-foreground mb-1">Cash</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                  Rs. {totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border border-orange-500/30">
                <div className="text-xs text-muted-foreground mb-1">Card (POS)</div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                  Rs. {totalCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border border-orange-500/30">
                <div className="text-xs text-muted-foreground mb-1">Credit</div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                  Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border border-orange-500/30">
                <div className="text-xs text-muted-foreground mb-1">Cheques</div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400 font-mono">
                  Rs. {totalCheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/10 dark:bg-primary/20 border-2 border-primary/30 rounded-lg">
              <span className="text-lg font-bold">Total Added to Safe:</span>
              <span className="font-mono text-2xl font-bold text-primary">
                Rs. {(totalCash + totalCard + totalCredit + totalCheque).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pumper-wise Breakdown */}
        {pumperBreakdowns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pumper-wise Breakdown
              </CardTitle>
              <CardDescription>Detailed breakdown of sales and collections by each pumper</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pumperBreakdowns.map((breakdown, idx) => {
                const totalCard = Object.values(breakdown.declaredCardAmounts || {}).reduce((sum: number, amt) => sum + (amt || 0), 0)
                const totalCredit = Object.values(breakdown.declaredCreditAmounts || {}).reduce((sum: number, amt) => sum + (amt || 0), 0)
                const totalCheques = (breakdown.cheques || []).reduce((sum, chq) => sum + (chq.amount || 0), 0)
                const bankDeposits = (breakdown.expenses || []).filter(exp => exp.type === 'BANK_DEPOSIT')
                const loans = (breakdown.expenses || []).filter(exp => exp.type === 'LOAN_GIVEN')
                const otherExpenses = (breakdown.expenses || []).filter(exp => exp.type !== 'BANK_DEPOSIT' && exp.type !== 'LOAN_GIVEN')

                return (
                  <div key={idx} className="border rounded-lg p-5 space-y-4 bg-card">
                    {/* Pumper Header */}
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-lg font-bold">{breakdown.pumperName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Pumper Performance Summary</p>
                      </div>
                      <Badge variant={breakdown.varianceStatus === 'ADD_TO_SALARY' ? 'default' : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY' ? 'destructive' : 'outline'}>
                        {breakdown.varianceStatus === 'ADD_TO_SALARY' ? 'Add to Salary' :
                          breakdown.varianceStatus === 'DEDUCT_FROM_SALARY' ? 'Deduct from Salary' :
                            'Normal'}
                      </Badge>
                    </div>

                    {/* Sales and Collections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column - Sales */}
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-muted-foreground uppercase border-b pb-2">Sales</div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Calculated Sales (from meters):</span>
                            <span className="font-mono font-semibold">Rs. {breakdown.calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Collections */}
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-muted-foreground uppercase border-b pb-2">Money Collected</div>

                        <div className="space-y-2">
                          {breakdown.declaredCash > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Cash:</span>
                              <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                                Rs. {breakdown.declaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {totalCard > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Card (POS):</span>
                              <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                                Rs. {totalCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {totalCredit > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Credit:</span>
                              <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                                Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {totalCheques > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Cheques:</span>
                              <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                                Rs. {totalCheques.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Details by Terminal */}
                    {totalCard > 0 && Object.keys(breakdown.declaredCardAmounts || {}).length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground">Card Payments by Terminal</div>
                        <div className="bg-muted/50 rounded p-3 space-y-1">
                          {Object.entries(breakdown.declaredCardAmounts || {}).map(([terminalId, amount]) => {
                            const terminalInfo = breakdown.declaredCardAmountsWithNames?.[terminalId]
                            const terminalName = terminalInfo?.terminalName || `Terminal ${terminalId}`
                            return (
                              <div key={terminalId} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{terminalName}:</span>
                                <span className="font-mono">Rs. {(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Credit Details by Customer */}
                    {totalCredit > 0 && Object.keys(breakdown.declaredCreditAmounts || {}).length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground">Credit Sales by Customer</div>
                        <div className="bg-muted/50 rounded p-3 space-y-1">
                          {Object.entries(breakdown.declaredCreditAmounts || {}).map(([customerId, amount]) => {
                            const customerInfo = breakdown.declaredCreditAmountsWithNames?.[customerId]
                            const customerName = customerInfo?.customerName || `Customer ${customerId}`
                            return (
                              <div key={customerId} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{customerName}:</span>
                                <span className="font-mono">Rs. {(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Cheque Details */}
                    {totalCheques > 0 && breakdown.cheques && breakdown.cheques.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground">Cheques Received</div>
                        <div className="bg-muted/50 rounded p-3 space-y-1">
                          {breakdown.cheques.map((cheque, chqIdx) => (
                            <div key={chqIdx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Cheque #{cheque.chequeNumber} from {cheque.receivedFrom}{cheque.bankName ? ` (${cheque.bankName})` : ''}:
                              </span>
                              <span className="font-mono">Rs. {(cheque.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deductions */}
                    {(breakdown.advanceTaken > 0 || loans.length > 0 || bankDeposits.length > 0 || otherExpenses.length > 0) && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground text-orange-600 dark:text-orange-400">Deductions</div>
                        <div className="bg-orange-500/10 dark:bg-orange-500/20 rounded p-3 space-y-1">
                          {breakdown.advanceTaken > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Advance Taken:</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400">
                                - Rs. {breakdown.advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {loans.map((loan, loanIdx) => (
                            <div key={loanIdx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Loan to {loan.loanGivenToName || 'Pumper'}:</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400">
                                - Rs. {(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}

                          {otherExpenses.map((expense, expIdx) => (
                            <div key={expIdx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{expense.description || 'Other Expense'}:</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400">
                                - Rs. {(expense.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bank Deposits (Additions) */}
                    {bankDeposits.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-sm font-semibold text-muted-foreground text-orange-600 dark:text-orange-400">Bank Deposits</div>
                        <div className="bg-orange-500/10 dark:bg-orange-500/20 rounded p-3 space-y-1">
                          {bankDeposits.map((deposit, depIdx) => (
                            <div key={depIdx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Bank Deposit ({deposit.bankName || 'Bank'}):</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400">
                                + Rs. {(deposit.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="border-t pt-3 bg-muted/50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="font-semibold">Total Declared:</div>
                        <div className="font-mono text-right font-semibold">
                          Rs. {breakdown.declaredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="font-semibold">Variance:</div>
                        <div className={`font-mono text-right font-semibold ${breakdown.variance > 20 ? 'text-red-600 dark:text-red-400' :
                          breakdown.variance < -20 ? 'text-green-600 dark:text-green-400' :
                            'text-foreground'
                          }`}>
                          {breakdown.variance >= 0 ? '+' : ''}Rs. {breakdown.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Overall Summary */}
              <div className="border-2 border-primary/30 rounded-lg p-5 bg-primary/10 dark:bg-primary/20">
                <div className="text-base font-bold uppercase text-primary mb-4">Overall Shift Summary</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="font-semibold">Total Calculated Sales:</div>
                  <div className="font-mono text-right font-semibold">
                    Rs. {totalCalculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-semibold">Total Cash Collected:</div>
                  <div className="font-mono text-right text-green-600 dark:text-green-400">
                    Rs. {totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-semibold">Total Card Collected:</div>
                  <div className="font-mono text-right text-orange-600 dark:text-orange-400">
                    Rs. {totalCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-semibold">Total Credit:</div>
                  <div className="font-mono text-right text-orange-600 dark:text-orange-400">
                    Rs. {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-semibold">Total Cheques:</div>
                  <div className="font-mono text-right text-orange-600 dark:text-orange-400">
                    Rs. {totalCheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-bold text-base pt-2 border-t">Total Declared:</div>
                  <div className="font-mono text-right font-bold text-base pt-2 border-t">
                    Rs. {totalDeclared.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div className="font-bold text-base">Total Variance:</div>
                  <div className={`font-mono text-right font-bold text-base ${totalVariance > 20 ? 'text-red-600 dark:text-red-400' :
                    totalVariance < -20 ? 'text-green-600 dark:text-green-400' :
                      'text-foreground'
                    }`}>
                    {totalVariance >= 0 ? '+' : ''}Rs. {totalVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* POS Batch Details */}
        {transaction.batch && transaction.type === 'POS_CARD_PAYMENT' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                POS Terminal Details
              </CardTitle>
              <CardDescription>Card payment breakdown by terminal and card type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border">
                  <div className="text-base font-bold mb-3">Total POS Amount: Rs. {transaction.batch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {transaction.batch.terminalEntries && transaction.batch.terminalEntries.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {transaction.batch.terminalEntries.map((entry, idx) => {
                        const terminalTotal = entry.visaAmount + entry.masterAmount + entry.amexAmount + entry.qrAmount + (entry.dialogTouchAmount || 0)
                        return (
                          <div key={entry.id} className="bg-card p-3 rounded border space-y-2">
                            <div className="font-semibold text-sm border-b pb-2">
                              {idx + 1}. {entry.terminal.name} ({entry.terminal.terminalNumber})
                              {entry.terminal.bank && ` • ${entry.terminal.bank.name}`}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-muted-foreground">Slip Numbers:</div>
                              <div className="font-mono text-right">{entry.startNumber} - {entry.endNumber}</div>

                              <div className="text-muted-foreground">Transaction Count:</div>
                              <div className="font-mono text-right">{entry.transactionCount}</div>
                            </div>

                            <div className="pt-2 border-t space-y-1">
                              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Card Types</div>
                              {entry.visaAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Visa:</span>
                                  <span className="font-mono">Rs. {entry.visaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {entry.masterAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Master:</span>
                                  <span className="font-mono">Rs. {entry.masterAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {entry.amexAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Amex:</span>
                                  <span className="font-mono">Rs. {entry.amexAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                              {entry.qrAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">QR:</span>
                                  <span className="font-mono">Rs. {entry.qrAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                              <span>Terminal Total:</span>
                              <span className="font-mono">Rs. {terminalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safe Balance Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Safe Balance Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Balance Before</Label>
                <div className="text-lg font-mono font-semibold mt-1">
                  Rs. {transaction.balanceBefore.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount Added</Label>
                <div className="text-lg font-mono font-semibold text-green-600 dark:text-green-400 mt-1">
                  + Rs. {(totalCash + totalCard + totalCredit + totalCheque).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Balance After</Label>
                <div className="text-lg font-mono font-semibold mt-1">
                  Rs. {transaction.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For non-shift transactions, show simple transaction details
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Transaction Details</h1>
      </div>

      {/* Transaction Info */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Information</CardTitle>
          <CardDescription>Basic transaction details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Transaction Type</Label>
              <div className="flex items-center gap-2 mt-1">
                {getTypeIcon(transaction.type)}
                <Badge className={getTypeColor(transaction.type)}>
                  {getTypeLabel(transaction.type)}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date & Time</Label>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(transaction.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <div className={`text-lg font-bold mt-1 ${INCOME_TYPES.includes(transaction.type) ? 'text-green-700' : 'text-red-700'}`}>
                {INCOME_TYPES.includes(transaction.type) ? '+' : '-'} Rs. {Math.abs(transaction.amount).toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Performed By</Label>
              <div className="text-sm font-medium mt-1">{transaction.performedBy}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Balance Before</Label>
              <div className="text-sm font-mono mt-1">
                Rs. {transaction.balanceBefore.toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Balance After</Label>
              <div className="text-sm font-mono mt-1">
                Rs. {transaction.balanceAfter.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <div className="text-sm mt-1 p-3 bg-muted rounded-lg">
              {transaction.description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POS Batch Details */}
      {transaction.batch && transaction.type === 'POS_CARD_PAYMENT' && (
        <Card>
          <CardHeader>
            <CardTitle>POS Batch Details</CardTitle>
            <CardDescription>POS terminal entries and card type breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-orange-500/10 dark:bg-orange-500/20 p-4 rounded-lg border">
              <div className="text-base font-bold mb-3">Total Batch Amount: Rs. {transaction.batch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              {transaction.batch.terminalEntries && transaction.batch.terminalEntries.length > 0 && (
                <div className="space-y-3 mt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Terminal Breakdown</div>
                  {transaction.batch.terminalEntries.map((entry, idx) => {
                    const terminalTotal = entry.visaAmount + entry.masterAmount + entry.amexAmount + entry.qrAmount + (entry.dialogTouchAmount || 0)
                    return (
                      <div key={entry.id} className="bg-card p-3 rounded border space-y-2">
                        <div className="font-semibold text-sm border-b pb-2">
                          {idx + 1}. {entry.terminal.name} ({entry.terminal.terminalNumber})
                          {entry.terminal.bank && ` • ${entry.terminal.bank.name}`}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-muted-foreground">Slip Numbers:</div>
                          <div className="font-mono text-right">{entry.startNumber} - {entry.endNumber}</div>

                          <div className="text-muted-foreground">Transaction Count:</div>
                          <div className="font-mono text-right">{entry.transactionCount}</div>
                        </div>

                        <div className="pt-2 border-t space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Card Types</div>
                          {entry.visaAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Visa:</span>
                              <span className="font-mono">Rs. {entry.visaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {entry.masterAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Master:</span>
                              <span className="font-mono">Rs. {entry.masterAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {entry.amexAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Amex:</span>
                              <span className="font-mono">Rs. {entry.amexAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {entry.qrAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">QR:</span>
                              <span className="font-mono">Rs. {entry.qrAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {(entry.dialogTouchAmount || 0) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Dialog Touch:</span>
                              <span className="font-mono">Rs. {(entry.dialogTouchAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                          <span>Terminal Total:</span>
                          <span className="font-mono">Rs. {terminalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cheque Details */}
      {transaction.cheque && (
        <Card>
          <CardHeader>
            <CardTitle>Cheque Details</CardTitle>
            <CardDescription>Cheque information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-orange-500/10 dark:bg-orange-500/20 p-3 rounded-lg space-y-1 text-sm">
              <div><span className="font-medium">Cheque Number:</span> {transaction.cheque.chequeNumber}</div>
              <div><span className="font-medium">Amount:</span> Rs. {transaction.cheque.amount.toLocaleString()}</div>
              {transaction.cheque.bank && (
                <div><span className="font-medium">Bank:</span> {transaction.cheque.bank.name}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

