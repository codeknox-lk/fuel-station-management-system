'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Calculator,
  FileText,
  Building,
  CreditCard,
  Calendar
} from 'lucide-react'

interface SafeActivity {
  id: string
  type: 'EXPENSE' | 'DEPOSIT' | 'LOAN' | 'CHEQUE'
  description: string
  amount: number
  date: string
  status: string
  reference?: string
}

export default function SafePage() {
  const router = useRouter()
  const [recentActivity, setRecentActivity] = useState<SafeActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSafeData()
  }, [])

  const fetchSafeData = async () => {
    try {
      setLoading(true)
      const [expensesRes, depositsRes, loansRes, chequesRes] = await Promise.all([
        fetch('/api/expenses?limit=3'),
        fetch('/api/deposits?limit=3'),
        fetch('/api/loans/external?limit=2'),
        fetch('/api/cheques?limit=2')
      ])

      const expensesData = await expensesRes.json()
      const depositsData = await depositsRes.json()
      const loansData = await loansRes.json()
      const chequesData = await chequesRes.json()

      // Combine recent activity
      const activity: SafeActivity[] = [
        ...expensesData.map((expense: { id: string; category: string; amount: number; date: string; status: string }) => ({
          id: `expense-${expense.id}`,
          type: 'EXPENSE' as const,
          description: `${expense.category} expense`,
          amount: -expense.amount, // Negative for outflow
          date: expense.expenseDate,
          status: expense.status,
          reference: expense.id
        })),
        ...depositsData.map((deposit: { id: string; bankAccount: string; amount: number; date: string; status: string }) => ({
          id: `deposit-${deposit.id}`,
          type: 'DEPOSIT' as const,
          description: `Bank deposit to ${deposit.bankName}`,
          amount: -deposit.amount, // Negative for outflow
          date: deposit.depositDate,
          status: deposit.status,
          reference: deposit.slipNumber
        })),
        ...loansData.map((loan: { id: string; toName: string; amount: number; date: string; status: string }) => ({
          id: `loan-${loan.id}`,
          type: 'LOAN' as const,
          description: `External loan from ${loan.lenderName}`,
          amount: loan.amount, // Positive for inflow
          date: loan.loanDate,
          status: loan.status,
          reference: loan.id
        })),
        ...chequesData.map((cheque: { id: string; chequeNumber: string; amount: number; date: string; status: string }) => ({
          id: `cheque-${cheque.id}`,
          type: 'CHEQUE' as const,
          description: `Cheque ${cheque.chequeNumber} from ${cheque.bankName}`,
          amount: cheque.amount, // Positive for inflow
          date: cheque.receivedDate,
          status: cheque.status,
          reference: cheque.chequeNumber
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setRecentActivity(activity)

    } catch (err) {
      console.error('Failed to fetch safe data:', err)
      setError('Failed to load safe data.')
    } finally {
      setLoading(false)
    }
  }

  // Mock statistics
  const stats = {
    currentBalance: 125000,
    todayInflows: 85000,
    todayOutflows: 45000,
    pendingCheques: 25000,
    monthlyExpenses: 180000,
    monthlyDeposits: 850000
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'EXPENSE': return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'DEPOSIT': return <Building className="h-4 w-4 text-blue-500" />
      case 'LOAN': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'CHEQUE': return <CreditCard className="h-4 w-4 text-purple-500" />
      default: return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'
    
    switch (status.toLowerCase()) {
      case 'approved':
      case 'confirmed':
      case 'deposited':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'received':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
      case 'returned':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const activityColumns: Column<SafeActivity>[] = [
    {
      key: 'date' as keyof SafeActivity,
      title: 'Date',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'type' as keyof SafeActivity,
      title: 'Type',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          {getActivityIcon(value as string)}
          <Badge variant="outline">{value as string}</Badge>
        </div>
      )
    },
    {
      key: 'description' as keyof SafeActivity,
      title: 'Description',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof SafeActivity,
      title: 'Amount',
      render: (value: unknown) => {
        const amount = value as number
        return (
          <span className={`font-mono font-semibold ${getActivityColor(amount)}`}>
            {amount >= 0 ? '+' : ''}Rs. {Math.abs(amount).toLocaleString()}
          </span>
        )
      }
    },
    {
      key: 'status' as keyof SafeActivity,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {(value as string) || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'reference' as keyof SafeActivity,
      title: 'Reference',
      render: (value: unknown) => (
        <span className="font-mono text-sm text-gray-600">
          {value as string || '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Safe Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Current Safe Balance</h3>
          <p className="text-3xl font-bold text-purple-600">
            Rs. {stats.currentBalance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">As of today</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Today&apos;s Inflows</h3>
          <p className="text-3xl font-bold text-green-600">
            Rs. {stats.todayInflows.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Cash sales & receipts</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Today&apos;s Outflows</h3>
          <p className="text-3xl font-bold text-red-600">
            Rs. {stats.todayOutflows.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Expenses & deposits</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Pending Cheques</h3>
          <p className="text-3xl font-bold text-yellow-600">
            Rs. {stats.pendingCheques.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Awaiting clearance</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Monthly Expenses</h3>
          <p className="text-3xl font-bold text-orange-600">
            Rs. {stats.monthlyExpenses.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">This month total</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Monthly Deposits</h3>
          <p className="text-3xl font-bold text-blue-600">
            Rs. {stats.monthlyDeposits.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Bank deposits made</p>
        </FormCard>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => router.push('/safe/summary')}>
          <Calculator className="mr-2 h-4 w-4" />
          Safe Summary
        </Button>
        <Button variant="outline" onClick={() => router.push('/expenses')}>
          <TrendingDown className="mr-2 h-4 w-4" />
          Record Expense
        </Button>
        <Button variant="outline" onClick={() => router.push('/deposits')}>
          <Building className="mr-2 h-4 w-4" />
          Record Deposit
        </Button>
        <Button variant="outline" onClick={() => router.push('/loans')}>
          <Plus className="mr-2 h-4 w-4" />
          Manage Loans
        </Button>
        <Button variant="outline" onClick={() => router.push('/cheques')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage Cheques
        </Button>
      </div>

      {/* Balance Alert */}
      {stats.currentBalance < 50000 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Safe Balance</AlertTitle>
          <AlertDescription>
            Current safe balance is Rs. {stats.currentBalance.toLocaleString()}. 
            Consider reviewing cash flow or making necessary deposits.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Activity */}
      <FormCard title="Recent Safe Activity" className="p-6">
        <DataTable
          data={recentActivity}
          columns={activityColumns}
          searchPlaceholder="Search activity..."
          pagination={false}
          emptyMessage="No recent safe activity."
        />
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.push('/safe/summary')}>
            View Detailed Summary
          </Button>
        </div>
      </FormCard>
    </div>
  )
}
