'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Clock,
  TrendingUp,
  User,
  Calendar,
  ArrowLeft,
  Download,
  CheckCircle,
  XCircle,
  CreditCard,
  Settings,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SalaryData {
  pumperId: string
  pumperName: string
  employeeId?: string
  baseSalary: number
  holidayAllowance?: number
  restDaysTaken?: number
  daysWorked?: number
  shiftCount: number
  totalHours: number
  totalOvertimeHours?: number
  totalOvertimeAmount?: number
  commission?: number
  totalSales: number
  totalAdvances: number
  totalLoans: number
  totalLoanAmount?: number
  varianceAdd: number
  varianceDeduct: number
  epf?: number
  netSalary: number
  shiftDetails: Array<{
    shiftId: string
    date: string
    hours: number
    sales: number
    advance: number
    variance: number
    varianceStatus: string
    overtimeHours?: number
    overtimeAmount?: number
  }>
}

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
]

export default function PumperSalaryDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { selectedStation } = useStation()

  // Extract values immediately using useMemo to avoid Next.js 15 enumeration issues
  const pumperId = useMemo(() => (params?.pumperId as string) || '', [params])
  const month = useMemo(() => searchParams?.get('month') || '', [searchParams])
  const pumperName = useMemo(() => searchParams?.get('pumperName') || 'Unknown', [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [loanRepayDialogOpen, setLoanRepayDialogOpen] = useState(false)
  interface PaymentHistoryItem {
    id: string
    paymentDate: string
    paymentMethod: string
    paymentReference?: string
    notes?: string
    status: string
    netSalary: number
    paidBy: string
  }
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'CASH' as 'CASH' | 'CHEQUE' | 'BANK_TRANSFER',
    paymentReference: '',
    notes: ''
  })

  // Check if payment already exists and is paid
  const hasPaidPayment = paymentHistory.some(p => p.status === 'PAID')

  useEffect(() => {
    if (selectedStation && pumperId && month) {
      fetchSalaryData()
      fetchPaymentHistory()
    }
  }, [selectedStation, pumperId, month])

  // Re-fetch payment history when dialog closes to update hasPaidPayment
  useEffect(() => {
    if (!paymentDialogOpen && selectedStation && pumperId && month && !isProcessingPayment) {
      fetchPaymentHistory()
    }
  }, [paymentDialogOpen])

  const fetchPaymentHistory = async () => {
    if (!selectedStation || !pumperId || !month) return

    try {
      const res = await fetch(`/api/salary/payments?stationId=${selectedStation}&pumperId=${pumperId}&month=${month}`)
      if (res.ok) {
        const data = await res.json()
        setPaymentHistory(data)
      }
    } catch (err) {
      console.error('Error fetching payment history:', err)
    }
  }

  const handleMarkAsPaid = async () => {
    // Prevent multiple clicks
    if (isProcessingPayment || !selectedStation || !salaryData || !month || hasPaidPayment) {
      return
    }

    try {
      setIsProcessingPayment(true)
      setLoading(true)
      setError('')
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'

      const response = await fetch('/api/salary/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          pumperId: salaryData.pumperId,
          paymentMonth: month,
          baseSalary: salaryData.baseSalary,
          varianceAdd: salaryData.varianceAdd,
          varianceDeduct: salaryData.varianceDeduct,
          advances: salaryData.totalAdvances,
          loans: salaryData.totalLoans,
          netSalary: salaryData.netSalary,
          paymentDate: new Date().toISOString(),
          paymentMethod: paymentForm.paymentMethod,
          paymentReference: paymentForm.paymentReference || undefined,
          paidBy: username,
          notes: paymentForm.notes || undefined,
          status: 'PAID'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Failed to record payment'

        // Handle "already paid" case gracefully
        if (errorMessage.includes('already recorded and paid')) {
          await fetchPaymentHistory() // Refresh to get the existing payment
          setPaymentDialogOpen(false)
          setPaymentForm({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
          setError('Payment has already been recorded for this month.')
          return
        }

        throw new Error(errorMessage)
      }

      await fetchPaymentHistory()
      setPaymentDialogOpen(false)
      setPaymentForm({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
      setError('') // Clear any previous errors
      // Use a better notification method instead of alert
      if (typeof window !== 'undefined') {
        // You can replace this with a toast notification if available
        console.log('Salary payment recorded successfully!')
      }
    } catch (err) {
      console.error('Error marking salary as paid:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to record payment'
      setError(errorMessage)

      // If it's an "already paid" error, refresh payment history
      if (errorMessage.includes('already') || errorMessage.includes('recorded')) {
        await fetchPaymentHistory()
      }
    } finally {
      setLoading(false)
      setIsProcessingPayment(false)
    }
  }

  const fetchSalaryData = async () => {
    if (!selectedStation || !pumperId || !month) return

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/salary?stationId=${selectedStation}&month=${month}&pumperId=${pumperId}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch salary data')
      }

      const data = await res.json()

      // If pumperId is specified, the API should return data for that pumper
      // If not found in array, check if it's an empty result
      let pumperData = data.salaryData?.find((p: SalaryData) => p.pumperId === pumperId)

      // If not found and salaryData exists, it might be the first (and only) item
      if (!pumperData && data.salaryData && data.salaryData.length > 0) {
        pumperData = data.salaryData[0]
      }

      // If still not found, create empty data structure
      if (!pumperData) {
        pumperData = {
          pumperId: pumperId,
          pumperName: pumperName || 'Unknown',
          employeeId: undefined,
          baseSalary: 0,
          shiftCount: 0,
          totalHours: 0,
          totalSales: 0,
          totalAdvances: 0,
          totalLoans: 0,
          varianceAdd: 0,
          varianceDeduct: 0,
          netSalary: 0,
          shiftDetails: []
        }
      }

      setSalaryData(pumperData)
    } catch (err) {
      console.error('Error fetching salary data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load salary data')
    } finally {
      setLoading(false)
    }
  }

  // Parse month safely (format: YYYY-MM)
  const monthParts = month.split('-')
  const year = monthParts[0] || new Date().getFullYear().toString()
  const monthNum = monthParts[1] || String(new Date().getMonth() + 1).padStart(2, '0')
  const monthLabel = months.find(m => m.value === monthNum)?.label || monthNum

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  if (error || !salaryData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monthly Salary Report</h1>
            <p className="text-muted-foreground mt-1">
              {pumperName} - {monthLabel} {year}
            </p>
          </div>
        </div>
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Salary data not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Monthly Salary Report
            </h1>
            <p className="text-muted-foreground mt-1">
              {salaryData.pumperName} {salaryData.employeeId && `(${salaryData.employeeId})`} - {monthLabel} {year}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
            // Prevent closing dialog while processing
            if (isProcessingPayment) {
              return
            }
            setPaymentDialogOpen(open)
            if (!open) {
              setError('')
              // Reset form if canceled
              if (!hasPaidPayment) {
                setPaymentForm({ paymentMethod: 'CASH', paymentReference: '', notes: '' })
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                disabled={!salaryData || salaryData.netSalary <= 0 || hasPaidPayment || isProcessingPayment}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {hasPaidPayment ? 'Already Paid' : isProcessingPayment ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Salary Payment</DialogTitle>
                <DialogDescription>
                  Record that salary has been paid to {salaryData?.pumperName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {hasPaidPayment && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Payment already recorded for this month
                    </p>
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <div>
                  <Label>Net Salary Amount</Label>
                  <Input
                    value={`Rs. ${salaryData?.netSalary.toLocaleString() || 0}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    disabled={isProcessingPayment || hasPaidPayment}
                    onValueChange={(value: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER') =>
                      setPaymentForm({ ...paymentForm, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(paymentForm.paymentMethod === 'CHEQUE' || paymentForm.paymentMethod === 'BANK_TRANSFER') && (
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      placeholder={paymentForm.paymentMethod === 'CHEQUE' ? 'Cheque number' : 'Transfer reference'}
                      value={paymentForm.paymentReference}
                      disabled={isProcessingPayment || hasPaidPayment}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={paymentForm.notes}
                    disabled={isProcessingPayment || hasPaidPayment}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentDialogOpen(false)
                      setError('')
                    }}
                    disabled={isProcessingPayment}
                  >
                    {hasPaidPayment ? 'Close' : 'Cancel'}
                  </Button>
                  {!hasPaidPayment && (
                    <Button
                      onClick={handleMarkAsPaid}
                      disabled={loading || isProcessingPayment || hasPaidPayment}
                    >
                      {isProcessingPayment ? 'Processing...' : 'Record Payment'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/settings/pumpers`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Base Salary
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Total OT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rs. {(salaryData.totalOvertimeAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(salaryData.totalOvertimeHours || 0).toFixed(1)} hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rs. {(salaryData.commission || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From Rs. {salaryData.totalSales.toLocaleString()} sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Days Worked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salaryData.daysWorked || 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {salaryData.shiftCount} shifts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {salaryData.netSalary.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deductions and Additions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Deductions</CardTitle>
            <CardDescription>Amounts deducted from salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaryData.epf && salaryData.epf > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <span className="text-sm font-medium">EPF (8%):</span>
                <span className="font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.epf.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
              <span className="text-sm font-medium">Advances Taken:</span>
              <span className="font-semibold text-red-600 text-lg">
                -Rs. {salaryData.totalAdvances.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
              <span className="text-sm font-medium">Loans:</span>
              <span className="font-semibold text-red-600 text-lg">
                -Rs. {salaryData.totalLoans.toLocaleString()}
              </span>
            </div>
            {salaryData.varianceDeduct > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-red-500/30">
                <span className="text-sm font-medium">Variance Deductions:</span>
                <span className="font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.varianceDeduct.toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Deductions:</span>
                <span className="font-bold text-red-600 text-xl">
                  -Rs. {((salaryData.epf || 0) + salaryData.totalAdvances + salaryData.totalLoans + salaryData.varianceDeduct).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Additions</CardTitle>
            <CardDescription>Amounts added to salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaryData.holidayAllowance !== undefined && salaryData.holidayAllowance > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Holiday Allowance:</span>
                <span className="font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.holidayAllowance.toLocaleString()}
                </span>
                {salaryData.restDaysTaken !== undefined && salaryData.restDaysTaken > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({salaryData.restDaysTaken} rest days deducted)
                  </span>
                )}
              </div>
            )}
            {salaryData.totalOvertimeAmount && salaryData.totalOvertimeAmount > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Overtime:</span>
                <span className="font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.totalOvertimeAmount.toLocaleString()}
                </span>
                {salaryData.totalOvertimeHours && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({salaryData.totalOvertimeHours.toFixed(1)}h)
                  </span>
                )}
              </div>
            )}
            {salaryData.commission !== undefined && salaryData.commission > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Commission:</span>
                <span className="font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.commission.toLocaleString()}
                </span>
              </div>
            )}
            {salaryData.varianceAdd > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Variance Bonuses:</span>
                <span className="font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.varianceAdd.toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Additions:</span>
                <span className="font-bold text-green-600 text-xl">
                  +Rs. {((salaryData.holidayAllowance || 0) + (salaryData.totalOvertimeAmount || 0) + (salaryData.commission || 0) + salaryData.varianceAdd).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Salary Card */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Net Salary Calculation</CardTitle>
          <CardDescription>Final amount after all adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border">
              <span className="text-lg font-medium">Base Salary:</span>
              <span className="font-semibold text-lg">
                Rs. {salaryData.baseSalary.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-green-500/30">
              <span className="text-lg font-medium">Additions:</span>
              <span className="font-semibold text-green-600 text-lg">
                +Rs. {((salaryData.holidayAllowance || 0) + (salaryData.totalOvertimeAmount || 0) + (salaryData.commission || 0) + salaryData.varianceAdd).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-red-500/30">
              <span className="text-lg font-medium">Deductions:</span>
              <span className="font-semibold text-red-600 text-lg">
                -Rs. {((salaryData.epf || 0) + salaryData.totalAdvances + salaryData.totalLoans + salaryData.varianceDeduct).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-6 bg-primary/10 rounded-lg border-2 border-primary">
              <span className="text-xl font-bold">Net Salary:</span>
              <div className="flex items-center gap-2">
                <DollarSign className={`h-8 w-8 ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-4xl font-bold ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {salaryData.netSalary.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shift Details */}
      {salaryData.shiftDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Shift-by-Shift Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of all shifts worked in {monthLabel} {year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salaryData.shiftDetails.map((shift, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {new Date(shift.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <Link
                          href={`/shifts/${shift.shiftId}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View Shift Details →
                        </Link>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      <Clock className="h-4 w-4 mr-1" />
                      {shift.hours.toFixed(1)}h
                      {shift.overtimeHours && shift.overtimeHours > 0 && (
                        <span className="ml-2 text-blue-600">
                          (OT: {shift.overtimeHours.toFixed(1)}h)
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {shift.overtimeAmount && shift.overtimeAmount > 0 && (
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-xs text-muted-foreground mb-1">Overtime</div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-600 text-lg">
                            Rs. {shift.overtimeAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {shift.overtimeHours?.toFixed(1)}h @ 1.5x rate
                        </div>
                      </div>
                    )}
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Sales</div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600 text-lg">
                          Rs. {shift.sales.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Commission: Rs. {Math.floor(shift.sales / 1000).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Advance Taken</div>
                      <span className="font-semibold text-orange-600 text-lg">
                        Rs. {shift.advance.toLocaleString()}
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg border ${shift.varianceStatus === 'ADD_TO_SALARY'
                      ? 'bg-green-500/10 border-green-500/20'
                      : shift.varianceStatus === 'DEDUCT_FROM_SALARY'
                        ? 'bg-red-500/10 border-red-500/20'
                        : 'bg-muted border-border'
                      }`}>
                      <div className="text-xs text-muted-foreground mb-1">Variance</div>
                      <div className="flex items-center gap-1">
                        {shift.varianceStatus === 'ADD_TO_SALARY' && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-600 text-lg">
                              +Rs. {Math.abs(shift.variance).toLocaleString()}
                            </span>
                          </>
                        )}
                        {shift.varianceStatus === 'DEDUCT_FROM_SALARY' && (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="font-semibold text-red-600 text-lg">
                              -Rs. {shift.variance.toLocaleString()}
                            </span>
                          </>
                        )}
                        {shift.varianceStatus === 'NORMAL' && (
                          <span className="text-muted-foreground text-sm">No variance</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Shift Impact</div>
                      <span className="font-semibold text-blue-600 text-lg">
                        {(() => {
                          // Calculate net impact: variance adjustment + advance deduction
                          let impact = -shift.advance // Advance is always deducted
                          if (shift.varianceStatus === 'ADD_TO_SALARY') {
                            impact += Math.abs(shift.variance) // Add variance bonus
                          } else if (shift.varianceStatus === 'DEDUCT_FROM_SALARY') {
                            impact -= Math.abs(shift.variance) // Deduct variance penalty
                          }
                          // impact is negative = deduction, positive = addition
                          return impact >= 0
                            ? `+Rs. ${impact.toLocaleString()}`
                            : `-Rs. ${Math.abs(impact).toLocaleString()}`
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {salaryData.shiftDetails.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No shifts worked during this period</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Record of salary payments for {monthLabel} {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No payment records found for this month</p>
              <p className="text-sm mt-2">Click &quot;Mark as Paid&quot; above to record a payment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">Payment Record #{idx + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        Paid on: {new Date(payment.paymentDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Method: {payment.paymentMethod}
                        {payment.paymentReference && ` - Ref: ${payment.paymentReference}`}
                      </div>
                      {payment.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Notes: {payment.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          payment.status === 'PAID'
                            ? 'bg-green-500/20 text-green-600'
                            : payment.status === 'PARTIAL'
                              ? 'bg-yellow-500/20 text-yellow-600'
                              : 'bg-muted'
                        }
                      >
                        {payment.status}
                      </Badge>
                      <div className="font-mono font-bold text-lg mt-2">
                        Rs. {payment.netSalary.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Paid by: {payment.paidBy}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Management Section */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-orange-600">
            <CreditCard className="h-5 w-5" />
            Outstanding Loans
          </CardTitle>
          <CardDescription>
            {salaryData.totalLoanAmount && salaryData.totalLoanAmount > 0 ? (
              <div className="space-y-1">
                <div>Total loan amount: Rs. {salaryData.totalLoanAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {salaryData.totalLoans > 0 && (
                  <div>Total monthly rental deduction: Rs. {salaryData.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                )}
              </div>
            ) : salaryData.totalLoans > 0 ? (
              `Total monthly rental deduction: Rs. ${salaryData.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ) : (
              'No active loans with monthly rental deduction'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Loans are automatically deducted from salary each month based on monthly rental amount. You can update the monthly rental below.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/salary/${pumperId}/loans?pumperName=${encodeURIComponent(pumperName)}`)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Loans
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

