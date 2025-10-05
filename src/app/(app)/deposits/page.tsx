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
  bankName: string
  accountNumber: string
  accountName: string
  branch: string
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

// Mock bank accounts data
const mockBankAccounts: BankAccount[] = [
  {
    id: 'acc-1',
    bankName: 'Bank of Ceylon',
    accountNumber: '1234567890',
    accountName: 'Petrol Shed Operations',
    branch: 'Colombo Main'
  },
  {
    id: 'acc-2',
    bankName: 'Commercial Bank',
    accountNumber: '9876543210',
    accountName: 'Daily Collections',
    branch: 'Kandy Branch'
  },
  {
    id: 'acc-3',
    bankName: 'Peoples Bank',
    accountNumber: '5555666677',
    accountName: 'Business Account',
    branch: 'Galle Branch'
  },
  {
    id: 'acc-4',
    bankName: 'Sampath Bank',
    accountNumber: '1111222233',
    accountName: 'Operational Fund',
    branch: 'Negombo Branch'
  }
]

export default function DepositsPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [recentDeposits, setRecentDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedBankAccount, setSelectedBankAccount] = useState('')
  const [amount, setAmount] = useState(0)
  const [depositDate, setDepositDate] = useState<Date>(new Date())
  const [depositedBy, setDepositedBy] = useState('')
  const [slipNumber, setSlipNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [slipPhoto, setSlipPhoto] = useState<File | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, depositsRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/deposits?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const depositsData = await depositsRes.json()

        setStations(stationsData)
        setRecentDeposits(depositsData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedBankAccount || amount <= 0 || !depositedBy) {
      setError('Please fill in all required fields')
      return
    }

    const amountValue = amount
    if (amountValue <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          bankAccountId: selectedBankAccount,
          amount: amountValue,
          depositDate: depositDate.toISOString(),
          depositedBy,
          slipNumber: slipNumber || undefined,
          notes: notes || undefined,
          slipPhotoUrl: slipPhoto ? `uploads/deposit-slips/${slipPhoto.name}` : undefined,
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record deposit')
      }

      const newDeposit = await response.json()
      
      // Add to recent deposits list
      setRecentDeposits(prev => [newDeposit, ...prev.slice(0, 9)])
      
      // Reset form
      setSelectedStation('')
      setSelectedBankAccount('')
      setAmount(0)
      setDepositDate(new Date())
      setDepositedBy('')
      setSlipNumber('')
      setNotes('')
      setSlipPhoto(null)
      
      setSuccess('Deposit recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record deposit')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectedBankAccountData = mockBankAccounts.find(acc => acc.id === selectedBankAccount)

  const depositColumns: Column<Deposit>[] = [
    {
      key: 'depositDate' as keyof Deposit,
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
      key: 'stationName' as keyof Deposit,
      title: 'Station',
      render: (value: unknown, row: Deposit) => {
        const station = stations.find(s => s.id === row.stationId)
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
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
            <Building className="h-4 w-4 text-gray-500" />
            <div className="flex flex-col">
              <span className="font-medium">{account?.bankName || (value as string)}</span>
              <span className="text-xs text-gray-500">
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
          <DollarSign className="h-4 w-4 text-green-500" />
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
          <User className="h-4 w-4 text-gray-500" />
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
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-mono text-sm">{value as string}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    },
    {
      key: 'slipPhotoUrl' as keyof Deposit,
      title: 'Slip Photo',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Camera className="h-4 w-4 text-gray-500" />
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
        <span className="text-sm text-gray-600 max-w-xs truncate">
          {value as string || '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Bank Deposits</h1>

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
                  {mockBankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{account.bankName}</span>
                          <span className="text-xs text-gray-500">
                            {account.accountName} - ****{account.accountNumber.slice(-4)}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBankAccountData && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                  <div className="text-xs text-blue-700">
                    <div>Account: {selectedBankAccountData.accountName}</div>
                    <div>Branch: {selectedBankAccountData.branch}</div>
                    <div>Number: {selectedBankAccountData.accountNumber}</div>
                  </div>
                </div>
              )}
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
            <p className="text-xs text-gray-500 mt-1">
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
