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
import { FileUploadStub } from '@/components/FileUploadStub'
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  User,
  Building,
  AlertCircle, 
  CheckCircle, 
  Plus,
  Clock,
  FileText,
  Camera
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface BankAccount {
  id: string
  name: string
  accountNumber: string | null
  branch: string | null
}

interface Deposit {
  id: string
  stationId: string
  stationName?: string
  bankAccountId: string
  bankName?: string
  accountNumber?: string
  amount: number
  depositDate: string
  depositedBy: string
  slipNumber?: string
  slipPhotoUrl?: string
  notes?: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  recordedBy: string
  createdAt: string
}

// Mock bank accounts data - REMOVED, now using real banks from API

export default function DepositsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [recentDeposits, setRecentDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [depositDate, setDepositDate] = useState<Date>(new Date())
  const [depositedBy, setDepositedBy] = useState('')
  const [slipNumber, setSlipNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [slipPhoto, setSlipPhoto] = useState<File | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, depositsRes, banksRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/deposits?limit=10'),
          fetch('/api/banks?active=true')
        ])

        const stationsData = await stationsRes.json()
        const depositsData = await depositsRes.json()
        const banksData = await banksRes.json()

        setStations(stationsData)
        setRecentDeposits(depositsData)
        setBanks(Array.isArray(banksData) ? banksData : [])
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedBankAccount || !amount || amount <= 0 || !depositedBy) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const selectedBank = banks.find(b => b.id === selectedBankAccount)
      
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          bankId: selectedBankAccount,
          accountId: selectedBank?.accountNumber || selectedBankAccount,
          amount: amount,
          depositDate: depositDate.toISOString(),
          depositedBy,
          depositSlip: slipNumber || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to record deposit')
      }

      const newDeposit = await response.json()
      
      // Reload deposits
      const depositsRes = await fetch('/api/deposits?limit=10')
      const depositsData = await depositsRes.json()
      setRecentDeposits(depositsData)
      
      // Reset form
      setSelectedBankAccount('')
      setAmount(undefined)
      setDepositDate(new Date())
      setDepositedBy('')
      setSlipNumber('')
      setNotes('')
      setSlipPhoto(null)
      
      setSuccess('Deposit recorded successfully! Money has been deducted from safe and added to bank account.')
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record deposit')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'REJECTED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const selectedBankData = banks.find(b => b.id === selectedBankAccount)

  const depositColumns: Column<Deposit>[] = [
    {
      key: 'depositDate' as keyof Deposit,
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
      key: 'stationName' as keyof Deposit,
      title: 'Station',
      render: (value: unknown, row: Deposit) => {
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
      key: 'bankName' as keyof Deposit,
      title: 'Bank Account',
      render: (value: unknown, row: Deposit) => {
        const account = mockBankAccounts.find(acc => acc.id === row.bankAccountId)
        return (
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{account?.bankName || (value as string)}</span>
              <span className="text-xs text-muted-foreground">
                {account?.accountNumber ? `****${account.accountNumber.slice(-4)}` : ''}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'amount' as keyof Deposit,
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
      key: 'depositedBy' as keyof Deposit,
      title: 'Deposited By',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'slipNumber' as keyof Deposit,
      title: 'Slip Number',
      render: (value: unknown) => (
        value ? (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{value as string}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'slipPhotoUrl' as keyof Deposit,
      title: 'Slip Photo',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    },
    {
      key: 'status' as keyof Deposit,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'notes' as keyof Deposit,
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
      <h1 className="text-3xl font-bold text-foreground">Bank Deposits</h1>

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

      <FormCard title="Record New Deposit">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station and Bank Account */}
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
              <Label htmlFor="bankAccount">Bank Account *</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount} disabled={loading}>
                <SelectTrigger id="bankAccount">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {banks.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No bank accounts available</div>
                  ) : (
                    banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{bank.name}</span>
                            {bank.branch && (
                              <span className="text-xs text-muted-foreground">
                                {bank.branch}{bank.accountNumber && ` - ${bank.accountNumber}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount and Deposited By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Deposit Amount (Rs.) *</Label>
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
              <Label htmlFor="depositedBy">Deposited By *</Label>
              <Input
                id="depositedBy"
                value={depositedBy}
                onChange={(e) => setDepositedBy(e.target.value)}
                placeholder="Name of person who made the deposit"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Date and Slip Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="depositDate">Deposit Date *</Label>
              <DateTimePicker
                value={depositDate}
                onChange={(date) => date && setDepositDate(date)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="slipNumber">Deposit Slip Number</Label>
              <Input
                id="slipNumber"
                value={slipNumber}
                onChange={(e) => setSlipNumber(e.target.value)}
                placeholder="Bank slip reference number"
                disabled={loading}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the deposit..."
              disabled={loading}
            />
          </div>

          {/* Slip Photo Upload */}
          <div>
            <Label>Deposit Slip Photo</Label>
            <FileUploadStub
              onFileSelect={setSlipPhoto}
              accept="image/*"
              placeholder="Upload photo of deposit slip (recommended)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a clear photo of the bank deposit slip for verification
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/safe')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Deposit
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Deposits" className="p-6">
        <DataTable
          data={recentDeposits}
          columns={depositColumns}
          searchPlaceholder="Search deposits..."
          emptyMessage="No deposits recorded yet."
        />
      </FormCard>
    </div>
  )
}
