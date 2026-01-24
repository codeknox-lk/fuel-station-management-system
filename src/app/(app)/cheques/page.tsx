'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
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
  Building2,
  DollarSign,
  Calendar,
  Building,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
  Clock,
  XCircle,
  ArrowUpCircle
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Cheque {
  id: string
  stationId: string
  stationName?: string
  chequeNumber: string
  bankName: string
  amount: number
  status: 'RECEIVED' | 'DEPOSITED' | 'RETURNED'
  depositReference?: string
  receivedDate: string
  depositedDate?: string
  returnedDate?: string
  returnReason?: string
  notes?: string
  recordedBy: string
  createdAt: string
}

const sriLankanBanks = [
  'Bank of Ceylon',
  'Peoples Bank',
  'Commercial Bank',
  'Hatton National Bank',
  'Sampath Bank',
  'Nations Trust Bank',
  'DFCC Bank',
  'National Development Bank',
  'Pan Asia Banking Corporation',
  'Union Bank',
  'Seylan Bank',
  'Regional Development Bank',
  'HSBC Sri Lanka',
  'Standard Chartered Bank',
  'Citibank N.A.',
  'Deutsche Bank AG'
]

export default function ChequesPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [recentCheques, setRecentCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [chequeNumber, setChequeNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState<'RECEIVED' | 'DEPOSITED' | 'RETURNED'>('RECEIVED')
  const [depositReference, setDepositReference] = useState('')
  const [receivedDate, setReceivedDate] = useState<Date>(new Date())
  const [notes, setNotes] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, chequesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/cheques?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const chequesData = await chequesRes.json()

        setStations(stationsData)
        setRecentCheques(chequesData)
      } catch (_err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStation || !chequeNumber || !bankName || !amount) {
      setError('Please fill in all required fields')
      return
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    // Validate deposit reference for deposited status
    if (status === 'DEPOSITED' && !depositReference) {
      setError('Deposit reference is required when status is DEPOSITED')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/cheques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          chequeNumber,
          bankName,
          amount: amount,
          status,
          depositReference: depositReference || undefined,
          receivedDate: receivedDate.toISOString(),
          notes: notes || undefined,
          recordedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record cheque')
      }

      const newCheque = await response.json()

      // Add to recent cheques list
      setRecentCheques(prev => [newCheque, ...prev.slice(0, 9)])

      // Reset form
      setSelectedStation('')
      setChequeNumber('')
      setBankName('')
      setAmount(0)
      setStatus('RECEIVED')
      setDepositReference('')
      setReceivedDate(new Date())
      setNotes('')

      setSuccess('Cheque recorded successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (_err) {
      setError('Failed to record cheque')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'DEPOSITED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'RETURNED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECEIVED': return <Clock className="h-4 w-4" />
      case 'DEPOSITED': return <CheckCircle className="h-4 w-4" />
      case 'RETURNED': return <XCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const chequeColumns: Column<Cheque>[] = [
    {
      key: 'receivedDate' as keyof Cheque,
      title: 'Received Date',
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
      key: 'stationName' as keyof Cheque,
      title: 'Station',
      render: (value: unknown, row: Cheque) => {
        const station = stations.find(s => s.id === row.stationId)
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{station?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'chequeNumber' as keyof Cheque,
      title: 'Cheque Number',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'bankName' as keyof Cheque,
      title: 'Bank',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'amount' as keyof Cheque,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-mono font-semibold text-green-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'status' as keyof Cheque,
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
      key: 'depositReference' as keyof Cheque,
      title: 'Deposit Reference',
      render: (value: unknown) => (
        value ? (
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-mono text-sm">{value as string}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'depositedDate' as keyof Cheque,
      title: 'Deposited Date',
      render: (value: unknown) => (
        value ? (
          <span className="text-sm">
            {new Date(value as string).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'returnedDate' as keyof Cheque,
      title: 'Returned Date',
      render: (value: unknown) => (
        value ? (
          <span className="text-sm text-red-600 dark:text-red-400">
            {new Date(value as string).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'notes' as keyof Cheque,
      title: 'Notes',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate">
          {value as string || '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Cheques Management</h1>

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

      <FormCard title="Record New Cheque">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station and Cheque Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station">Station *</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation} disabled={loading}>
                <SelectTrigger id="station">
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {station.name} ({station.city})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="chequeNumber">Cheque Number *</Label>
              <Input
                id="chequeNumber"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="e.g., 123456"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Bank and Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Bank *</Label>
              <Select value={bankName} onValueChange={setBankName} disabled={loading}>
                <SelectTrigger id="bankName">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {sriLankanBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {bank}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Cheque Amount (Rs.) *</Label>
              <MoneyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Status and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value: 'RECEIVED' | 'DEPOSITED' | 'RETURNED') => setStatus(value)} disabled={loading}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIVED">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Received
                    </div>
                  </SelectItem>
                  <SelectItem value="DEPOSITED">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Deposited
                    </div>
                  </SelectItem>
                  <SelectItem value="RETURNED">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Returned
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="receivedDate">Received Date *</Label>
              <DateTimePicker
                value={receivedDate}
                onChange={(date) => setReceivedDate(date || new Date())}
                disabled={loading}
              />
            </div>
          </div>

          {/* Deposit Reference (conditional) */}
          {status === 'DEPOSITED' && (
            <div>
              <Label htmlFor="depositReference">Deposit Reference *</Label>
              <Input
                id="depositReference"
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                placeholder="Bank deposit slip number or reference"
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the cheque..."
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/safe')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Cheque
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Cheques" className="p-6">
        <DataTable
          data={recentCheques}
          columns={chequeColumns}
          searchPlaceholder="Search cheques..."
          emptyMessage="No cheques recorded yet."
        />
      </FormCard>
    </div>
  )
}
