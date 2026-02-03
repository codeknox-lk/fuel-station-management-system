'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { 
  Users, 
  DollarSign, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  BarChart3,
  FileText,
  CreditCard,
  Clock,
  Calendar
} from 'lucide-react'

interface CreditCustomer {
  id: string
  name: string
  nicOrBrn: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  daysPastDue: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface RecentActivity {
  id: string
  type: 'SALE' | 'PAYMENT'
  customerName: string
  amount: number
  date: string
  status: string
  description: string
}

export default function CreditPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCreditData()
  }, [])

  const fetchCreditData = async () => {
    try {
      const [customersRes, salesRes, paymentsRes] = await Promise.all([
        fetch('/api/credit/customers'),
        fetch('/api/credit/sales?limit=5'),
        fetch('/api/credit/payments?limit=5')
      ])

      const customersData = await customersRes.json()
      const salesData = await salesRes.json()
      const paymentsData = await paymentsRes.json()

      // Transform customers data with calculated fields
      const transformedCustomers = customersData.map((customer: CreditCustomer) => ({
        ...customer,
        availableCredit: customer.creditLimit - customer.currentBalance,
        daysPastDue: Math.floor(Math.random() * 120), // Mock data
        riskLevel: customer.currentBalance > customer.creditLimit * 0.8 ? 'HIGH' : 
                  customer.currentBalance > customer.creditLimit * 0.6 ? 'MEDIUM' : 'LOW'
      }))

      setCustomers(transformedCustomers)

      // Combine recent activity
      const activity: RecentActivity[] = [
        ...salesData.map((sale: { id: string; customerName?: string; amount: number; saleDate: string; status: string; slipNumber: string }) => ({
          id: `sale-${sale.id}`,
          type: 'SALE' as const,
          customerName: sale.customerName || 'Unknown Customer',
          amount: sale.amount,
          date: sale.saleDate,
          status: sale.status,
          description: `Credit sale - ${sale.slipNumber}`
        })),
        ...paymentsData.map((payment: { id: string; customerName?: string; amount: number; paymentDate: string; status: string; paymentMethod: string }) => ({
          id: `payment-${payment.id}`,
          type: 'PAYMENT' as const,
          customerName: payment.customerName || 'Unknown Customer',
          amount: payment.amount,
          date: payment.paymentDate,
          status: payment.status,
          description: `Payment via ${payment.paymentMethod}`
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setRecentActivity(activity)

      // Calculate stats
      const totalCustomers = transformedCustomers.length
      const activeCustomers = transformedCustomers.filter((c: CreditCustomer) => c.status === 'ACTIVE').length
      const totalCreditLimit = transformedCustomers.reduce((sum: number, c: CreditCustomer) => sum + c.creditLimit, 0)
      const totalOutstanding = transformedCustomers.reduce((sum: number, c: CreditCustomer) => sum + c.currentBalance, 0)
      const availableCredit = transformedCustomers.reduce((sum: number, c: CreditCustomer) => sum + c.availableCredit, 0)
      const highRiskCustomers = transformedCustomers.filter((c: CreditCustomer) => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL').length

      setStats({
        totalCustomers,
        activeCustomers,
        totalCreditLimit,
        totalOutstanding,
        availableCredit,
        highRiskCustomers,
        utilizationRate: totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0
      })

    } catch (err) {
      console.error('Failed to fetch credit data:', err)
      setError('Failed to load credit data.')
    } finally {
    }
  }

  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalCreditLimit: 0,
    totalOutstanding: 0,
    availableCredit: 0,
    highRiskCustomers: 0,
    utilizationRate: 0,
  })

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SALE': return <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'PAYMENT': return <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
      default: return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const customerColumns: Column<CreditCustomer>[] = [
    {
      key: 'name' as keyof CreditCustomer,
      title: 'Customer',
      render: (value: unknown, row: CreditCustomer) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{value as string}</span>
            <span className="text-xs text-muted-foreground">{row.nicOrBrn}</span>
          </div>
        </div>
      )
    },
    {
      key: 'creditLimit' as keyof CreditCustomer,
      title: 'Credit Limit',
      render: (value: unknown) => (
        <span className="font-mono text-orange-600 dark:text-orange-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'currentBalance' as keyof CreditCustomer,
      title: 'Outstanding',
      render: (value: unknown) => (
        <span className="font-mono font-semibold text-red-600 dark:text-red-400">
          Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'availableCredit' as keyof CreditCustomer,
      title: 'Available',
      render: (value: unknown) => {
        const numValue = value as number
        return (
          <span className={`font-mono font-semibold ${numValue > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            Rs. {numValue?.toLocaleString() || 0}
          </span>
        )
      }
    },
    {
      key: 'daysPastDue' as keyof CreditCustomer,
      title: 'Days Past Due',
      render: (value: unknown) => {
        const days = value as number
        return (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={`font-semibold ${
              days > 90 ? 'text-red-600 dark:text-red-400' : 
              days > 60 ? 'text-orange-600 dark:text-orange-400' : 
              days > 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {days} days
            </span>
          </div>
        )
      }
    },
    {
      key: 'riskLevel' as keyof CreditCustomer,
      title: 'Risk Level',
      render: (value: unknown) => (
        <Badge className={getRiskColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'status' as keyof CreditCustomer,
      title: 'Status',
      render: (value: unknown) => (
        <Badge variant={value === 'ACTIVE' ? 'default' : 'secondary'}>
          {value as string}
        </Badge>
      )
    }
  ]

  const activityColumns: Column<RecentActivity>[] = [
    {
      key: 'date' as keyof RecentActivity,
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
      key: 'type' as keyof RecentActivity,
      title: 'Type',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          {getActivityIcon(value as string)}
          <Badge variant="outline">{value as string}</Badge>
        </div>
      )
    },
    {
      key: 'customerName' as keyof RecentActivity,
      title: 'Customer',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof RecentActivity,
      title: 'Amount',
      render: (value: unknown, row: RecentActivity) => (
        <span className={`font-mono font-semibold ${
          row.type === 'SALE' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}>
          {row.type === 'SALE' ? '+' : '-'}Rs. {(value as number)?.toLocaleString() || 0}
        </span>
      )
    },
    {
      key: 'description' as keyof RecentActivity,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof RecentActivity,
      title: 'Status',
      render: (value: unknown) => (
        <Badge variant="outline">{value as string}</Badge>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Credit Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Customers</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats.totalCustomers}
          </p>
          <p className="text-sm text-muted-foreground">{stats.activeCustomers} active</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Total Credit Limit</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            Rs. {stats.totalCreditLimit.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">{stats.utilizationRate}% utilized</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            Rs. {stats.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Available: Rs. {stats.availableCredit.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">High Risk Customers</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.highRiskCustomers}</p>
          <p className="text-sm text-muted-foreground">Require attention</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => router.push('/credit/customers')}>
          <Users className="mr-2 h-4 w-4" />
          Manage Customers
        </Button>
        <Button variant="outline" onClick={() => router.push('/credit/sales')}>
          <Plus className="mr-2 h-4 w-4" />
          Record Sale
        </Button>
        <Button variant="outline" onClick={() => router.push('/credit/payments')}>
          <DollarSign className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
        <Button variant="outline" onClick={() => router.push('/credit/aging')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Aging Analysis
        </Button>
      </div>

      {/* High Risk Customers Alert */}
      {stats.highRiskCustomers > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Attention Required</AlertTitle>
          <AlertDescription>
            You have {stats.highRiskCustomers} high-risk customers that require immediate attention. 
            Consider reviewing their credit limits or initiating collection procedures.
          </AlertDescription>
        </Alert>
      )}

      {/* Customer Overview */}
      <FormCard title="Customer Overview" className="p-6">
        <DataTable
          data={customers.slice(0, 10)} // Show top 10 customers
          columns={customerColumns}
          searchPlaceholder="Search customers..."
          emptyMessage="No credit customers found."
        />
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => router.push('/credit/customers')}>
            View All Customers
          </Button>
        </div>
      </FormCard>

      {/* Recent Activity */}
      <FormCard title="Recent Activity" className="p-6">
        <DataTable
          data={recentActivity}
          columns={activityColumns}
          searchPlaceholder="Search activity..."
          pagination={false}
          emptyMessage="No recent activity."
        />
      </FormCard>
    </div>
  )
}
