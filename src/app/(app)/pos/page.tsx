'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CreditCard,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  Plus,
  BarChart3,
  FileText,
  Calculator,
  DollarSign,
  Clock
} from 'lucide-react'
import { Card } from '@/components/ui/card'

interface POSTerminal {
  id: string
  stationId: string
  stationName?: string
  terminalNumber: string
  name: string
  isActive: boolean
  lastBatchDate?: string
  todayTransactions: number
  todayAmount: number
  station?: {
    id: string
    name: string
  }
}

interface RecentActivity {
  id: string
  type: 'BATCH' | 'MISSING_SLIP' | 'RECONCILIATION'
  description: string
  amount?: number
  status: string
  timestamp: string
}

import { PosBatchWithDetails, PosMissingSlipWithDetails } from '@/types/db'

// ... existing imports

export default function POSPage() {
  const router = useRouter()
  const [terminals, setTerminals] = useState<POSTerminal[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPOSData()
  }, [])

  const fetchPOSData = async () => {
    try {
      setLoading(true)
      const [terminalsRes, batchesRes, slipsRes] = await Promise.all([
        fetch('/api/pos/terminals'),
        fetch('/api/pos/batches?limit=5'),
        fetch('/api/pos/missing-slip?limit=5')
      ])

      const terminalsData = await terminalsRes.json()
      const batchesData: PosBatchWithDetails[] = await batchesRes.json()
      const slipsData: PosMissingSlipWithDetails[] = await slipsRes.json()

      // Transform terminals data and calculate today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const transformedTerminals = terminalsData.map((terminal: POSTerminal) => {
        // Get today's batches for this terminal
        const todayBatches = batchesData.filter((batch) =>
          batch.terminalEntries.some(entry => entry.terminalId === terminal.id) &&
          new Date(batch.createdAt) >= today
        )

        const todayTransactions = todayBatches.reduce((sum, batch) => {
          // Only count transactions for this specific terminal in the batch
          const terminalEntry = batch.terminalEntries.find(e => e.terminalId === terminal.id)
          return sum + (terminalEntry?.transactionCount || 0)
        }, 0)

        // Note: Total amount might be shared across batch, but usually batch is per terminal or multi-terminal.
        // If batch is multi-terminal, we should calculate amount for this terminal only.
        // Checking schema: PosBatchTerminalEntry has visaAmount, masterAmount etc. but totalAmount is on Batch.
        // Let's calculate from entries if possible, or fall back to batch total if it's 1:1.

        const todayAmount = todayBatches.reduce((sum, batch) => {
          const terminalEntry = batch.terminalEntries.find(e => e.terminalId === terminal.id)
          if (terminalEntry) {
            // Sum of all payment types for this entry
            return sum +
              (terminalEntry.visaAmount || 0) +
              (terminalEntry.masterAmount || 0) +
              (terminalEntry.amexAmount || 0) +
              (terminalEntry.qrAmount || 0) +
              (terminalEntry.dialogTouchAmount || 0)
          }
          return sum
        }, 0)

        // Get last batch date
        const lastBatch = batchesData.find((batch) =>
          batch.terminalEntries.some(e => e.terminalId === terminal.id)
        )

        return {
          ...terminal,
          stationName: terminal.station?.name || `Station ${terminal.stationId}`,
          todayTransactions,
          todayAmount,
          lastBatchDate: lastBatch?.createdAt ? new Date(lastBatch.createdAt).toISOString() : undefined
        }
      })

      setTerminals(transformedTerminals)

      // Combine recent activity
      const activity: RecentActivity[] = [
        ...batchesData.map((batch) => {
          const entryCount = batch.terminalEntries.length
          const description = entryCount > 1
            ? `Batch ${batch.terminalEntries[0].startNumber}... (${entryCount} terminals)`
            : `Batch ${batch.terminalEntries[0]?.startNumber}-${batch.terminalEntries[0]?.endNumber} created`

          return {
            id: `batch-${batch.id}`,
            type: 'BATCH' as const,
            description,
            amount: batch.totalAmount,
            status: batch.isReconciled ? 'RECONCILED' : 'PENDING',
            timestamp: batch.createdAt.toString()
          }
        }),
        ...slipsData.map((slip) => ({
          id: `slip-${slip.id}`,
          type: 'MISSING_SLIP' as const,
          description: `Missing slip reported - Rs. ${slip.amount.toLocaleString()}`,
          amount: slip.amount,
          status: 'PENDING',
          timestamp: new Date(slip.timestamp).toISOString()
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setRecentActivity(activity)

      // Calculate stats
      const activeTerminals = transformedTerminals.filter((t: POSTerminal) => t.isActive).length
      const totalTransactions = transformedTerminals.reduce((sum: number, t: POSTerminal) => sum + t.todayTransactions, 0)
      const totalAmount = transformedTerminals.reduce((sum: number, t: POSTerminal) => sum + t.todayAmount, 0)
      const pendingSlips = slipsData.length // All slips are pending (no status field)

      setStats({
        activeTerminals,
        totalTerminals: transformedTerminals.length,
        totalTransactions,
        totalAmount,
        pendingSlips,
        averageTransaction: totalTransactions > 0 ? Math.round(totalAmount / totalTransactions) : 0
      })

    } catch (err) {
      console.error('Failed to fetch POS data:', err)
      setError('Failed to load POS data.')
    } finally {
      setLoading(false)
    }
  }

  const [stats, setStats] = useState({
    activeTerminals: 0,
    totalTerminals: 0,
    totalTransactions: 0,
    totalAmount: 0,
    pendingSlips: 0,
    averageTransaction: 0,
  })

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300' : 'bg-muted text-foreground'
  }

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'ACTIVE' : 'INACTIVE'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'BATCH': return <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      case 'MISSING_SLIP': return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'RECONCILIATION': return <Calculator className="h-4 w-4 text-green-600 dark:text-green-400" />
      default: return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const terminalColumns: Column<POSTerminal>[] = [
    {
      key: 'stationName' as keyof POSTerminal,
      title: 'Station',
      render: (value: unknown) => (
        <span className="font-medium">{value as string}</span>
      )
    },
    {
      key: 'terminalNumber' as keyof POSTerminal,
      title: 'Terminal',
      render: (value: unknown, row: POSTerminal) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-semibold">{value as string}</span>
            <span className="text-xs text-muted-foreground">{row.name}</span>
          </div>
        </div>
      )
    },
    {
      key: 'isActive' as keyof POSTerminal,
      title: 'Status',
      render: (value: unknown) => {
        const isActive = value as boolean
        return (
          <Badge className={getStatusColor(isActive)}>
            {getStatusText(isActive)}
          </Badge>
        )
      }
    },
    {
      key: 'todayTransactions' as keyof POSTerminal,
      title: 'Today&apos;s Transactions',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <span className="">{(value as number)?.toLocaleString() || 0}</span>
        </div>
      )
    },
    {
      key: 'todayAmount' as keyof POSTerminal,
      title: 'Today&apos;s Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-semibold text-green-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'lastBatchDate' as keyof POSTerminal,
      title: 'Last Batch',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {value ? new Date(value as string).toLocaleDateString() : 'No batches'}
        </span>
      )
    }
  ]

  const activityColumns: Column<RecentActivity>[] = [
    {
      key: 'timestamp' as keyof RecentActivity,
      title: 'Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
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
      key: 'description' as keyof RecentActivity,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'amount' as keyof RecentActivity,
      title: 'Amount',
      render: (value: unknown) => (
        value ? (
          <span className="text-sm">
            Rs. {(value as number).toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
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
      <h1 className="text-3xl font-bold text-foreground">POS Management</h1>

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
          <h3 className="text-lg font-semibold text-foreground">Active Terminals</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.activeTerminals}/{stats.totalTerminals}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Today&apos;s Transactions</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {stats.totalTransactions.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Today&apos;s Amount</h3>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            Rs. {stats.totalAmount.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">
            Avg: Rs. {stats.averageTransaction.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-foreground">Pending Issues</h3>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.pendingSlips}</p>
          <p className="text-sm text-muted-foreground">Missing slips</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => router.push('/pos/batches')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Batch
        </Button>
        <Button variant="outline" onClick={() => router.push('/pos/missing-slips')}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Report Missing Slip
        </Button>
        <Button variant="outline" onClick={() => router.push('/pos/reconcile')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Reconcile
        </Button>
      </div>

      {/* Terminals Overview */}
      <FormCard title="POS Terminals" className="p-6">
        <DataTable
          data={terminals}
          columns={terminalColumns}
          searchPlaceholder="Search terminals..."
          emptyMessage="No POS terminals found."
          loading={loading}
        />
      </FormCard>

      {/* Recent Activity */}
      <FormCard title="Recent Activity" className="p-6">
        <DataTable
          data={recentActivity}
          columns={activityColumns}
          searchPlaceholder="Search activity..."
          pagination={false}
          emptyMessage="No recent activity."
          loading={loading}
        />
      </FormCard>
    </div>
  )
}
