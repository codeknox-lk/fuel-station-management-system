'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  CreditCard,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function PumperLoansPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const { selectedStation } = useStation()

  const pumperId = useMemo(() => (params?.pumperId as string) || '', [params])
  const pumperName = useMemo(() => searchParams?.get('pumperName') || 'Unknown', [searchParams])

  interface Loan {
    id: string
    stationId: string
    pumperId: string
    pumperName: string
    amount: number
    monthlyRental?: number
    paidAmount?: number
    status: 'ACTIVE' | 'PAID' | 'DEFAULTED'
    reason: string
    givenBy?: string
    dueDate: string
    createdAt: string
    updatedAt: string
  }


  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pumperLoans, setPumperLoans] = useState<Loan[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null)
  const [editingMonthlyRental, setEditingMonthlyRental] = useState<number | undefined>(undefined)
  const [loanPaymentDialogOpen, setLoanPaymentDialogOpen] = useState(false)
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null)
  const [loanPaymentAmount, setLoanPaymentAmount] = useState<number | undefined>(undefined)
  const [loanPaymentNotes, setLoanPaymentNotes] = useState('')
  const [processingLoanPayment, setProcessingLoanPayment] = useState(false)

  const fetchPumperLoans = useCallback(async () => {
    if (!selectedStation || !pumperName) return

    try {
      setLoadingLoans(true)
      setError('')
      // Fetch all loans (not just active) to show history
      const res = await fetch(`/api/loans/pumper?stationId=${selectedStation}&pumperName=${encodeURIComponent(pumperName)}`)
      if (res.ok) {
        const data = await res.json()
        setPumperLoans(data)
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Failed to fetch loans')
      }
    } catch (err) {
      console.error('Error fetching pumper loans:', err)
      setError('Failed to fetch loans')
    } finally {
      setLoadingLoans(false)
    }
  }, [selectedStation, pumperName])

  useEffect(() => {
    if (selectedStation && pumperName) {
      fetchPumperLoans()
    }
  }, [selectedStation, pumperName, fetchPumperLoans])

  const handleUpdateMonthlyRental = async (loanId: string, newMonthlyRental: number) => {
    try {
      setError('')
      const res = await fetch(`/api/loans/pumper/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyRental: newMonthlyRental
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update monthly rental')
      }

      await fetchPumperLoans()

      setEditingLoanId(null)
      setEditingMonthlyRental(undefined)
      setSuccess('Monthly rental updated successfully!')
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (err) {
      setSuccess('')
      setError(err instanceof Error ? err.message : 'Failed to update monthly rental')
      setTimeout(() => {
        setError('')
      }, 5000)
    }
  }

  const handleCancelEdit = () => {
    setEditingLoanId(null)
    setEditingMonthlyRental(undefined)
  }

  const handleStartEdit = (loan: Loan) => {
    setEditingLoanId(loan.id)
    setEditingMonthlyRental(loan.monthlyRental || 0)
  }

  const handlePayLoan = (loan: Loan) => {
    const remainingAmount = loan.amount - (loan.paidAmount || 0)
    setSelectedLoanForPayment(loan)
    setLoanPaymentAmount(remainingAmount > 0 ? remainingAmount : loan.amount)
    setLoanPaymentNotes('')
    setLoanPaymentDialogOpen(true)
  }

  const handleProcessLoanPayment = async () => {
    if (!selectedLoanForPayment || loanPaymentAmount === undefined || loanPaymentAmount <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (!selectedStation) {
      setError('Please select a station')
      return
    }

    try {
      setProcessingLoanPayment(true)
      setError('')

      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System' : 'System'

      const res = await fetch(`/api/loans/pumper/${selectedLoanForPayment.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          amount: loanPaymentAmount,
          notes: loanPaymentNotes || undefined,
          performedBy: username
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to process loan payment')
      }

      // Refresh loans list to show updated status
      await fetchPumperLoans()

      setLoanPaymentDialogOpen(false)
      setSelectedLoanForPayment(null)
      setLoanPaymentAmount(undefined)
      setLoanPaymentNotes('')
      setSuccess('Loan payment processed successfully! Money has been added to safe.')
      setTimeout(() => {
        setSuccess('')
      }, 5000)
    } catch (err) {
      setSuccess('')
      setError(err instanceof Error ? err.message : 'Failed to process loan payment')
      setTimeout(() => setError(''), 5000)
    } finally {
      setProcessingLoanPayment(false)
    }
  }

  const activeLoans = pumperLoans.filter(loan => loan.status === 'ACTIVE')
  const paidLoans = pumperLoans.filter(loan => loan.status === 'PAID')
  const totalMonthlyRental = activeLoans.reduce((sum, loan) => sum + (loan.monthlyRental || 0), 0)

  const totalPaidAmount = pumperLoans.reduce((sum, loan) => sum + (loan.paidAmount || 0), 0)
  const totalOutstanding = activeLoans.reduce((sum, loan) => {
    const paidAmount = loan.paidAmount || 0
    return sum + (loan.amount - paidAmount)
  }, 0)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/salary/${pumperId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Salary
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Loan Management - {pumperName}</h1>
          <p className="text-muted-foreground mt-1">View and manage all loans and payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Loans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Rs. {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rs. {totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-600 font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Active Loans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Active Loans
          </CardTitle>
          <CardDescription>
            Loans currently active and being deducted from salary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLoans ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No active loans found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Monthly Rental</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLoans.map((loan) => {
                    const paidAmount = loan.paidAmount || 0
                    const remainingAmount = loan.amount - paidAmount
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono">
                          Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-mono text-green-600">
                          Rs. {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-mono font-semibold text-orange-600">
                          Rs. {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {editingLoanId === loan.id ? (
                            <div className="flex items-center gap-2">
                              <MoneyInput
                                value={editingMonthlyRental}
                                onChange={(value) => setEditingMonthlyRental(value)}
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                onClick={() => editingMonthlyRental !== undefined && handleUpdateMonthlyRental(loan.id, editingMonthlyRental)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <span
                              className="font-mono cursor-pointer hover:text-orange-600 hover:underline"
                              onClick={() => handleStartEdit(loan)}
                              title="Click to edit monthly rental"
                            >
                              Rs. {(loan.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'ACTIVE' ? 'default' : loan.status === 'PAID' ? 'secondary' : 'destructive'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(loan.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(loan.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-medium">{loan.reason}</div>
                            {loan.reason?.toLowerCase().includes('loan given from safe') && loan.givenBy && (
                              <div className="text-xs text-muted-foreground">
                                Given by: {loan.givenBy}
                              </div>
                            )}
                            {loan.reason?.toLowerCase().includes('shift close') && loan.givenBy && (
                              <div className="text-xs text-muted-foreground">
                                Given by: {loan.givenBy} | Taken by: {loan.pumperName}
                              </div>
                            )}
                            {loan.reason?.toLowerCase().includes('shift close') && !loan.givenBy && (
                              <div className="text-xs text-muted-foreground">
                                Taken by: {loan.pumperName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingLoanId === loan.id ? (
                            <span className="text-xs text-muted-foreground">Editing...</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handlePayLoan(loan)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay Loan
                            </Button>
                          )}
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

      {/* Paid Loans */}
      {paidLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Paid Loans
            </CardTitle>
            <CardDescription>
              Loans that have been fully paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Monthly Rental</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidLoans.map((loan) => {
                  const paidAmount = loan.paidAmount || 0
                  const remainingAmount = loan.amount - paidAmount
                  return (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono">
                        Rs. {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-green-600">
                        Rs. {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-muted-foreground">
                        Rs. {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono">
                        Rs. {(loan.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(loan.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-medium">{loan.reason}</div>
                          {loan.givenBy && (
                            <div className="text-xs text-muted-foreground">
                              Given by: {loan.givenBy}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Loan Payment Dialog */}
      <Dialog open={loanPaymentDialogOpen} onOpenChange={setLoanPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Loan - {selectedLoanForPayment?.pumperName}</DialogTitle>
            <DialogDescription>
              Record a loan payment. This will add money to the safe and update the loan status.
            </DialogDescription>
          </DialogHeader>
          {selectedLoanForPayment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="text-sm font-medium mb-2">Loan Details</div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <div>Loan Amount: Rs. {selectedLoanForPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div>Paid: Rs. {(selectedLoanForPayment.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div>Remaining: Rs. {(selectedLoanForPayment.amount - (selectedLoanForPayment.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div>Monthly Rental: Rs. {(selectedLoanForPayment.monthlyRental || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div>Reason: {selectedLoanForPayment.reason}</div>
                </div>
              </div>
              <div>
                <Label>Payment Amount (Rs.)</Label>
                <MoneyInput
                  value={loanPaymentAmount}
                  onChange={(value) => setLoanPaymentAmount(value)}
                  placeholder="Enter payment amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: Rs. {(selectedLoanForPayment.amount - (selectedLoanForPayment.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={loanPaymentNotes}
                  onChange={(e) => setLoanPaymentNotes(e.target.value)}
                  placeholder="Add any notes about this payment"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoanPaymentDialogOpen(false)
                    setSelectedLoanForPayment(null)
                    setLoanPaymentAmount(undefined)
                    setLoanPaymentNotes('')
                  }}
                  disabled={processingLoanPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcessLoanPayment}
                  disabled={processingLoanPayment || loanPaymentAmount === undefined || loanPaymentAmount <= 0}
                >
                  {processingLoanPayment ? 'Processing...' : 'Pay Loan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
