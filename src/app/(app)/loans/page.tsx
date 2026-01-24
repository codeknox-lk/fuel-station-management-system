'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import {
  CreditCard,
  DollarSign,
  User,
  Building2,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react'

interface PumperLoan {
  id: string
  pumperName: string
  amount: number
  paidAmount?: number
  monthlyRental?: number
  reason: string
  givenBy?: string
  dueDate: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  createdAt: string
  station?: {
    id: string
    name: string
  }
}

interface ExternalLoan {
  id: string
  borrowerName: string
  amount: number
  dueDate: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  createdAt: string
  station?: {
    id: string
    name: string
  }
}

interface OfficeStaffLoan {
  id: string
  staffName: string
  amount: number
  paidAmount?: number
  monthlyRental?: number
  reason: string
  givenBy?: string
  dueDate: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  createdAt: string
  station?: {
    id: string
    name: string
  }
}

interface LoanPayment {
  id: string
  amount: number
  description: string
  performedBy: string
  timestamp: string
  balanceAfter: number
}

export default function LoansPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [pumperLoans, setPumperLoans] = useState<PumperLoan[]>([])
  const [externalLoans, setExternalLoans] = useState<ExternalLoan[]>([])
  const [officeStaffLoans, setOfficeStaffLoans] = useState<OfficeStaffLoan[]>([])
  const [selectedLoan, setSelectedLoan] = useState<{ id: string; type: 'PUMPER' | 'EXTERNAL' | 'OFFICE'; name: string } | null>(null)
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([])
  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<{ id: string; type: 'PUMPER' | 'EXTERNAL' | 'OFFICE'; name: string; amount: number; paidAmount?: number } | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    if (selectedStation) {
      fetchAllLoans()
    }
  }, [selectedStation])

  const fetchAllLoans = async () => {
    if (!selectedStation) return

    try {
      setLoading(true)


      const [pumperRes, externalRes, officeRes] = await Promise.all([
        fetch(`/api/loans/pumper?stationId=${selectedStation}`),
        fetch(`/api/loans/external?stationId=${selectedStation}`),
        fetch(`/api/loans/office?stationId=${selectedStation}`)
      ])

      if (pumperRes.ok) {
        const pumperData = await pumperRes.json()
        setPumperLoans(pumperData)
      }

      if (externalRes.ok) {
        const externalData = await externalRes.json()
        setExternalLoans(externalData)
      }

      if (officeRes.ok) {
        const officeData = await officeRes.json()
        setOfficeStaffLoans(officeData)
      }
    } catch (err) {
      console.error('Error fetching loans:', err)
      toast({
        title: "Error",
        description: "Failed to fetch loans",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchLoanPayments = async (loanId: string, loanType: 'PUMPER' | 'EXTERNAL' | 'OFFICE') => {
    try {
      const res = await fetch(`/api/loans/payments?stationId=${selectedStation}&loanId=${loanId}&loanType=${loanType}`)
      if (res.ok) {
        const data = await res.json()
        setLoanPayments(data)
      }
    } catch (err) {
      console.error('Error fetching loan payments:', err)
    }
  }

  const handleViewPayments = (loan: PumperLoan | ExternalLoan | OfficeStaffLoan, type: 'PUMPER' | 'EXTERNAL' | 'OFFICE') => {
    const loanName = type === 'PUMPER' ? (loan as PumperLoan).pumperName :
      type === 'OFFICE' ? (loan as OfficeStaffLoan).staffName :
        (loan as ExternalLoan).borrowerName
    setSelectedLoan({ id: loan.id, type, name: loanName })
    fetchLoanPayments(loan.id, type)
    setPaymentsDialogOpen(true)
  }

  const handlePayLoan = (loan: PumperLoan | ExternalLoan | OfficeStaffLoan, type: 'PUMPER' | 'EXTERNAL' | 'OFFICE') => {
    const loanName = type === 'PUMPER' ? (loan as PumperLoan).pumperName :
      type === 'OFFICE' ? (loan as OfficeStaffLoan).staffName :
        (loan as ExternalLoan).borrowerName
    const typedLoan = loan as (PumperLoan | OfficeStaffLoan)
    const paidAmount = (type === 'PUMPER' || type === 'OFFICE') ? (typedLoan.paidAmount || 0) : 0
    const remainingAmount = (type === 'PUMPER' || type === 'OFFICE') ? (typedLoan.amount - paidAmount) : loan.amount

    setSelectedLoanForPayment({
      id: loan.id,
      type,
      name: loanName,
      amount: loan.amount,
      paidAmount: paidAmount
    })
    // Default to remaining amount if there's a remaining balance, otherwise allow full amount
    setPaymentAmount(remainingAmount > 0 ? remainingAmount : undefined)
    setPaymentNotes('')
    setPaymentDialogOpen(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedLoanForPayment || paymentAmount === undefined || paymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      })
      return
    }

    if (!selectedStation) {
      toast({
        title: "Error",
        description: "Please select a station",
        variant: "destructive"
      })
      return
    }

    try {
      setProcessingPayment(true)


      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'

      let res
      if (selectedLoanForPayment.type === 'PUMPER') {
        res = await fetch(`/api/loans/pumper/${selectedLoanForPayment.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId: selectedStation,
            amount: paymentAmount,
            notes: paymentNotes || undefined,
            performedBy: username
          })
        })
      } else if (selectedLoanForPayment.type === 'OFFICE') {
        res = await fetch(`/api/loans/office/${selectedLoanForPayment.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationId: selectedStation,
            amount: paymentAmount,
            notes: paymentNotes || undefined,
            performedBy: username
          })
        })
      } else {
        // External loan payment - need to create endpoint
        toast({
          title: "Error",
          description: "External loan payment not yet implemented",
          variant: "destructive"
        })
        return
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to process loan payment')
      }

      await fetchAllLoans()

      setPaymentDialogOpen(false)
      setSelectedLoanForPayment(null)
      setPaymentAmount(undefined)
      setPaymentNotes('')
      toast({
        title: "Success",
        description: "Loan payment processed successfully! Money has been added to safe."
      })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to process loan payment',
        variant: "destructive"
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  const activePumperLoans = pumperLoans.filter(l => l.status === 'ACTIVE')
  const paidPumperLoans = pumperLoans.filter(l => l.status === 'PAID')
  const activeExternalLoans = externalLoans.filter(l => l.status === 'ACTIVE')
  const paidExternalLoans = externalLoans.filter(l => l.status === 'PAID')

  const totalActivePumper = activePumperLoans.reduce((sum, l) => sum + l.amount, 0)
  const totalActiveExternal = activeExternalLoans.reduce((sum, l) => sum + l.amount, 0)
  const totalMonthlyRental = activePumperLoans.reduce((sum, l) => sum + (l.monthlyRental || 0), 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loans Management</h1>
          <p className="text-muted-foreground mt-1">View and manage all loans and payments</p>
        </div>
        <Button onClick={fetchAllLoans} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Pumper Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePumperLoans.length}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Rs. {totalActivePumper.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rental</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rs. {totalMonthlyRental.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active External Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExternalLoans.length}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Rs. {totalActiveExternal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidPumperLoans.length + paidExternalLoans.length}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Loans fully paid</div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}


      {/* Loans Tabs */}
      <Tabs defaultValue="pumper" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pumper">
            Pumper Loans ({pumperLoans.length})
          </TabsTrigger>
          <TabsTrigger value="external">
            External Loans ({externalLoans.length})
          </TabsTrigger>
          <TabsTrigger value="office">
            Office Staff Loans ({officeStaffLoans.length})
          </TabsTrigger>
        </TabsList>

        {/* Pumper Loans */}
        <TabsContent value="pumper" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Pumper Loans</CardTitle>
              <CardDescription>Loans given to pumpers that are currently active</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : activePumperLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No active pumper loans</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pumper</TableHead>
                        <TableHead className="text-right">Loan Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Monthly Rental</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Given By</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activePumperLoans.map((loan) => {
                        const paidAmount = loan.paidAmount || 0
                        const remainingAmount = loan.amount - paidAmount
                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">{loan.pumperName}</TableCell>
                            <TableCell className="text-right font-mono">
                              Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              Rs. {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-orange-600">
                              Rs. {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              Rs. {(loan.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={loan.reason}>
                              {loan.reason}
                            </TableCell>
                            <TableCell>{loan.givenBy || '-'}</TableCell>
                            <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={loan.status === 'ACTIVE' ? 'default' : loan.status === 'PAID' ? 'secondary' : 'destructive'}>
                                {loan.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPayments(loan, 'PUMPER')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Payments
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handlePayLoan(loan, 'PUMPER')}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {paidPumperLoans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Paid Pumper Loans</CardTitle>
                <CardDescription>Loans that have been fully paid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pumper</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Monthly Rental</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Given By</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidPumperLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.pumperName}</TableCell>
                          <TableCell className="text-right font-mono">
                            Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            Rs. {(loan.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={loan.reason}>
                            {loan.reason}
                          </TableCell>
                          <TableCell>{loan.givenBy || '-'}</TableCell>
                          <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{loan.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPayments(loan, 'PUMPER')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Payments
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* External Loans */}
        <TabsContent value="external" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active External Loans</CardTitle>
              <CardDescription>Loans given to external parties that are currently active</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : activeExternalLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No active external loans</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeExternalLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.borrowerName}</TableCell>
                          <TableCell className="text-right font-mono">
                            Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={loan.status === 'ACTIVE' ? 'default' : loan.status === 'PAID' ? 'secondary' : 'destructive'}>
                              {loan.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewPayments(loan, 'EXTERNAL')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Payments
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handlePayLoan(loan, 'EXTERNAL')}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {paidExternalLoans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Paid External Loans</CardTitle>
                <CardDescription>External loans that have been fully paid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidExternalLoans.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.borrowerName}</TableCell>
                          <TableCell className="text-right font-mono">
                            Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{loan.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPayments(loan, 'EXTERNAL')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Payments
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Office Staff Loans */}
        <TabsContent value="office" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Office Staff Loans</CardTitle>
              <CardDescription>Loans given to office staff that are currently active</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : officeStaffLoans.filter(l => l.status === 'ACTIVE').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No active office staff loans</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Monthly Rental</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {officeStaffLoans.filter(l => l.status === 'ACTIVE').map((loan) => {
                        const balance = loan.amount - (loan.paidAmount || 0)
                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-medium">{loan.staffName}</TableCell>
                            <TableCell className="text-right font-mono">
                              Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                              Rs. {(loan.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                              Rs. {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              Rs. {(loan.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={loan.status === 'ACTIVE' ? 'default' : loan.status === 'PAID' ? 'secondary' : 'destructive'}>
                                {loan.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewPayments(loan, 'OFFICE')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Payments
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handlePayLoan(loan, 'OFFICE')}
                                  disabled={balance <= 0}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Pay
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {officeStaffLoans.filter(l => l.status === 'PAID').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Paid Office Staff Loans</CardTitle>
                <CardDescription>Office staff loans that have been fully paid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {officeStaffLoans.filter(l => l.status === 'PAID').map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.staffName}</TableCell>
                          <TableCell className="text-right font-mono">
                            Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{new Date(loan.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{loan.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPayments(loan, 'OFFICE')}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Payments
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment History Dialog */}
      <Dialog open={paymentsDialogOpen} onOpenChange={setPaymentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedLoan?.name}</DialogTitle>
            <DialogDescription>
              All payments made for this loan
            </DialogDescription>
          </DialogHeader>
          {loanPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No payments recorded for this loan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-semibold text-green-600">
                      Rs. {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>{payment.performedBy}</TableCell>
                    <TableCell className="font-mono">
                      Rs. {payment.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Loan - {selectedLoanForPayment?.name}</DialogTitle>
            <DialogDescription>
              Record a loan payment. This will add money to the safe and update the loan status.
            </DialogDescription>
          </DialogHeader>
          {selectedLoanForPayment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm font-medium mb-2">Loan Details</div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div>Loan Amount: Rs. {selectedLoanForPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  {selectedLoanForPayment.paidAmount !== undefined && (
                    <>
                      <div>Paid: Rs. {selectedLoanForPayment.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div>Remaining: Rs. {(selectedLoanForPayment.amount - (selectedLoanForPayment.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </>
                  )}
                  <div>Loan Type: {selectedLoanForPayment.type === 'PUMPER' ? 'Pumper Loan' : 'External Loan'}</div>
                </div>
              </div>
              <div>
                <Label>Payment Amount (Rs.)</Label>
                <MoneyInput
                  value={paymentAmount}
                  onChange={(value) => setPaymentAmount(value)}
                  placeholder="Enter payment amount"
                />
                {selectedLoanForPayment.paidAmount !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Remaining: Rs. {(selectedLoanForPayment.amount - (selectedLoanForPayment.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
                {selectedLoanForPayment.paidAmount === undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Full amount: Rs. {selectedLoanForPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false)
                    setSelectedLoanForPayment(null)
                    setPaymentAmount(undefined)
                    setPaymentNotes('')
                  }}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessPayment}
                  disabled={processingPayment || paymentAmount === undefined || paymentAmount <= 0}
                >
                  {processingPayment ? 'Processing...' : 'Pay Loan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
