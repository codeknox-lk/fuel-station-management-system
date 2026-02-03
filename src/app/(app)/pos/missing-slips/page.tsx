'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CreditCard,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  ArrowLeft
} from 'lucide-react'

interface POSBatch {
  id: string
  stationId: string
  terminalId: string
  batchNumber: string
  batchDate: string
  bankName?: string
  totalAmount: number
}

interface MissingSlip {
  id: string
  batchId: string
  batchNumber?: string
  stationName?: string
  bankName?: string
  amount: number
  transactionTime: string
  lastFourDigits: string
  reportedBy: string
  reportedAt: string
  status: 'REPORTED' | 'INVESTIGATING' | 'RESOLVED' | 'DISPUTED'
  notes?: string
}

export default function MissingSlipsPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<POSBatch[]>([])
  const [recentSlips, setRecentSlips] = useState<MissingSlip[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedBatch, setSelectedBatch] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [transactionTime, setTransactionTime] = useState<Date | undefined>(new Date())
  const [lastFourDigits, setLastFourDigits] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [batchesRes, slipsRes] = await Promise.all([
          fetch('/api/pos/batches?recent=true'),
          fetch('/api/pos/missing-slip?limit=10')
        ])

        const batchesData = await batchesRes.json()
        const slipsData = await slipsRes.json()

        setBatches(batchesData)
        setRecentSlips(slipsData)
      } catch {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBatch || !amount || !lastFourDigits || !transactionTime) {
      setError('Please fill in all required fields')
      return
    }

    if (lastFourDigits.length !== 4 || !/^\d{4}$/.test(lastFourDigits)) {
      setError('Last 4 digits must be exactly 4 numeric digits')
      return
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/pos/missing-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch,
          amount: amount,
          transactionTime: transactionTime!.toISOString(),
          lastFourDigits,
          reportedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to report missing slip')
      }

      const newSlip = await response.json()

      // Add to recent slips list
      setRecentSlips(prev => [newSlip, ...prev.slice(0, 9)])

      // Reset form
      setSelectedBatch('')
      setAmount(0)
      setTransactionTime(new Date())
      setLastFourDigits('')

      setSuccess('Missing slip reported successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to report missing slip')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'REPORTED': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'INVESTIGATING': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'DISPUTED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <CheckCircle className="h-4 w-4" />
      case 'REPORTED': return <AlertTriangle className="h-4 w-4" />
      case 'INVESTIGATING': return <Clock className="h-4 w-4" />
      case 'DISPUTED': return <AlertCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const slipColumns: Column<MissingSlip>[] = [
    {
      key: 'reportedAt' as keyof MissingSlip,
      title: 'Reported',
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
      key: 'batchNumber' as keyof MissingSlip,
      title: 'Batch',
      render: (value: unknown, row: MissingSlip) => {
        const batch = batches.find(b => b.id === row.batchId)
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{batch?.batchNumber || (value as string)}</span>
              {batch && (
                <span className="text-xs text-muted-foreground">
                  {new Date(batch.batchDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'stationName' as keyof MissingSlip,
      title: 'Station',
      render: (value: unknown, row: MissingSlip) => {
        const batch = batches.find(b => b.id === row.batchId)
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{value as string || 'Unknown'}</span>
              {batch?.bankName && (
                <span className="text-xs text-muted-foreground">{batch.bankName}</span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'amount' as keyof MissingSlip,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="font-mono font-semibold text-red-700">
            Rs. {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'transactionTime' as keyof MissingSlip,
      title: 'Transaction Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'lastFourDigits' as keyof MissingSlip,
      title: 'Last 4 Digits',
      render: (value: unknown) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
          ****{value as string}
        </span>
      )
    },
    {
      key: 'status' as keyof MissingSlip,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          <div className="flex items-center gap-1">
            {getStatusIcon(value as string)}
            <span>{value as string}</span>
          </div>
        </Badge>
      )
    },
    {
      key: 'reportedBy' as keyof MissingSlip,
      title: 'Reported By',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/pos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Missing POS Slips</h1>
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

      <FormCard title="Report Missing Slip">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Batch Selection */}
          <div>
            <Label htmlFor="batch">POS Batch *</Label>
            <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={loading}>
              <SelectTrigger id="batch">
                <SelectValue placeholder="Select a batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-medium">{batch.batchNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(batch.batchDate).toLocaleDateString()} -
                          Rs. {batch.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Select the batch where the slip is missing
            </p>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Transaction Amount *</Label>
              <MoneyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="transactionTime">Transaction Time *</Label>
              <DateTimePicker
                value={transactionTime}
                onChange={setTransactionTime}
                disabled={loading}
                showSeconds={true}
              />
            </div>

            <div>
              <Label htmlFor="lastFourDigits">Last 4 Digits of Card *</Label>
              <Input
                id="lastFourDigits"
                value={lastFourDigits}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setLastFourDigits(value)
                }}
                placeholder="1234"
                maxLength={4}
                pattern="\d{4}"
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the last 4 digits of the card number
              </p>
            </div>
          </div>

          {/* Information Box */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important Information</AlertTitle>
            <AlertDescription>
              Missing slips should be reported as soon as they are discovered.
              Provide accurate transaction details to help with reconciliation and investigation.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/pos')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Reporting...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Report Missing Slip
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Missing Slips" className="p-6">
        <DataTable
          data={recentSlips}
          columns={slipColumns}
          searchPlaceholder="Search missing slips..."
          emptyMessage="No missing slips reported."
        />
      </FormCard>
    </div>
  )
}

