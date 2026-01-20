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
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileUploadStub } from '@/components/FileUploadStub'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { 
  CreditCard, 
  Calendar, 
  Building2, 
  Camera, 
  AlertCircle, 
  CheckCircle, 
  Plus,
  DollarSign,
  Clock,
  Wallet,
  ArrowLeft
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Station {
  id: string
  name: string
  city: string
}

interface POSTerminal {
  id: string
  stationId: string
  terminalNumber: string
  name: string
  isActive: boolean
  station?: {
    id: string
    name: string
  }
}

interface POSBatch {
  id: string
  stationId?: string
  stationName?: string
  terminalId: string
  terminal?: {
    id: string
    terminalNumber: string
    name: string
  }
  startNumber: string
  endNumber: string
  transactionCount: number
  visaAmount: number
  masterAmount: number
  amexAmount: number
  qrAmount: number
  totalAmount: number
  isReconciled: boolean
  createdAt: string
  notes?: string
}

const cardSchemes = [
  { key: 'visa', label: 'Visa', color: 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300' },
  { key: 'mastercard', label: 'Mastercard', color: 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300' },
  { key: 'amex', label: 'American Express', color: 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300' },
  { key: 'qr', label: 'QR Payments', color: 'bg-purple-500/20 text-purple-400 dark:bg-purple-600/30 dark:text-purple-300' }
]

export default function POSBatchesPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [terminals, setTerminals] = useState<POSTerminal[]>([])
  const [recentBatches, setRecentBatches] = useState<POSBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation, setSelectedStation } = useStation()
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [startNumber, setStartNumber] = useState('')
  const [endNumber, setEndNumber] = useState('')
  const [visaAmount, setVisaAmount] = useState('')
  const [masterAmount, setMasterAmount] = useState('')
  const [amexAmount, setAmexAmount] = useState('')
  const [qrAmount, setQrAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [addToSafe, setAddToSafe] = useState(false)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, terminalsRes, batchesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/pos/terminals'),
          fetch('/api/pos/batches?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const terminalsData = await terminalsRes.json()
        const batchesData = await batchesRes.json()

        setStations(stationsData)
        setTerminals(terminalsData)
        setRecentBatches(batchesData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  // Filter terminals by selected station
  const availableTerminals = terminals.filter(terminal => 
    terminal.stationId === selectedStation && terminal.isActive
  )

  // Calculate total amount
  const totalAmount = [visaAmount, masterAmount, amexAmount, qrAmount]
    .reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedTerminal || !startNumber || !endNumber) {
      setError('Please fill in all required fields')
      return
    }

    if (totalAmount <= 0) {
      setError('Please enter at least one card scheme total')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/pos/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminalId: selectedTerminal,
          startNumber,
          endNumber,
          visaAmount: parseFloat(visaAmount) || 0,
          masterAmount: parseFloat(masterAmount) || 0,
          amexAmount: parseFloat(amexAmount) || 0,
          qrAmount: parseFloat(qrAmount) || 0,
          totalAmount,
          notes: notes || undefined,
          addToSafe: addToSafe
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create POS batch')
      }

      const newBatch = await response.json()
      
      // Reload batches to get proper data
      const batchesRes = await fetch('/api/pos/batches?limit=10')
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json()
        setRecentBatches(batchesData)
      }
      
      // Reset form
      setSelectedTerminal('')
      setStartNumber('')
      setEndNumber('')
      setVisaAmount('')
      setMasterAmount('')
      setAmexAmount('')
      setQrAmount('')
      setNotes('')
      setAddToSafe(false)
      
      setSuccess('POS batch created successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to create POS batch')
    } finally {
      setLoading(false)
    }
  }

  const batchColumns: Column<POSBatch>[] = [
    {
      key: 'createdAt' as keyof POSBatch,
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
      key: 'terminal' as keyof POSBatch,
      title: 'Terminal',
      render: (value: unknown) => {
        const terminal = value as { terminalNumber: string; name: string } | undefined
        if (!terminal) return '-'
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{terminal.terminalNumber}</span>
              <span className="text-xs text-muted-foreground">{terminal.name}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'startNumber' as keyof POSBatch,
      title: 'Slip Range',
      render: (value: unknown, row: POSBatch) => (
        <span className="font-mono text-sm">{value as string} - {row.endNumber}</span>
      )
    },
    {
      key: 'transactionCount' as keyof POSBatch,
      title: 'Txn Count',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{(value as number) || 0}</span>
      )
    },
    {
      key: 'visaAmount' as keyof POSBatch,
      title: 'Visa',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300 text-xs">VISA</Badge>
          <span className="font-mono text-xs">
            {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'masterAmount' as keyof POSBatch,
      title: 'Master',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300 text-xs">MC</Badge>
          <span className="font-mono text-xs">
            {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'qrAmount' as keyof POSBatch,
      title: 'QR',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-purple-500/20 text-purple-400 dark:bg-purple-600/30 dark:text-purple-300 text-xs">QR</Badge>
          <span className="font-mono text-xs">
            {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'totalAmount' as keyof POSBatch,
      title: 'Total',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-mono font-semibold text-green-700">
            {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'isReconciled' as keyof POSBatch,
      title: 'Status',
      render: (value: unknown) => {
        const isReconciled = value as boolean
        return (
          <Badge className={isReconciled ? 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300' : 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'}>
            {isReconciled ? 'RECONCILED' : 'PENDING'}
          </Badge>
        )
      }
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push('/pos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">POS Batches</h1>
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

      <FormCard title="Create New POS Batch">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station and Terminal Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="terminal">POS Terminal *</Label>
              <Select value={selectedTerminal} onValueChange={setSelectedTerminal} disabled={loading || !selectedStation}>
                <SelectTrigger id="terminal">
                  <SelectValue placeholder="Select terminal" />
                </SelectTrigger>
                <SelectContent>
                  {availableTerminals.map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{terminal.terminalNumber}</span>
                          <span className="text-xs text-muted-foreground">{terminal.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Batch Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startNumber">Start Slip Number *</Label>
              <Input
                id="startNumber"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder="e.g., 0001"
                disabled={loading}
                required
              />
            </div>
            <div>
              <Label htmlFor="endNumber">End Slip Number *</Label>
              <Input
                id="endNumber"
                value={endNumber}
                onChange={(e) => setEndNumber(e.target.value)}
                placeholder="e.g., 0125"
                disabled={loading}
                required
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                <strong>Total Amount: Rs. {totalAmount.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Card Scheme Totals */}
          <div>
            <Label className="text-base font-semibold">Card Scheme Totals</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
              {cardSchemes.map((scheme) => (
                <div key={scheme.key}>
                  <Label htmlFor={scheme.key} className="flex items-center gap-2">
                    <Badge className={scheme.color}>{scheme.label}</Badge>
                  </Label>
                  <MoneyInput
                    id={scheme.key}
                    value={
                      scheme.key === 'visa' ? visaAmount :
                      scheme.key === 'mastercard' ? masterAmount :
                      scheme.key === 'amex' ? amexAmount : qrAmount
                    }
                    onChange={(value) => {
                      if (scheme.key === 'visa') setVisaAmount(value)
                      else if (scheme.key === 'mastercard') setMasterAmount(value)
                      else if (scheme.key === 'amex') setAmexAmount(value)
                      else setQrAmount(value)
                    }}
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this batch"
              disabled={loading}
            />
          </div>

          {/* Safe Integration */}
          {totalAmount > 0 && (
            <FormCard className="p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="addToSafeBatch"
                  checked={addToSafe}
                  onCheckedChange={(checked) => setAddToSafe(checked as boolean)}
                />
                <Label htmlFor="addToSafeBatch" className="flex items-center gap-2 cursor-pointer">
                  <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium">Put batch total (Rs. {totalAmount.toLocaleString()}) into Safe</span>
                </Label>
              </div>
              <p className="text-sm text-muted-foreground mt-2 ml-7">
                The batch total will be automatically added to the safe.
              </p>
            </FormCard>
          )}

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/pos')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Batch
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent POS Batches" className="p-6">
        <DataTable
          data={recentBatches}
          columns={batchColumns}
          searchPlaceholder="Search batches..."
          emptyMessage="No POS batches found."
        />
      </FormCard>
    </div>
  )
}

