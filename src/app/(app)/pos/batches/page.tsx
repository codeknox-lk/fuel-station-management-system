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
  Clock
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface POSTerminal {
  id: string
  stationId: string
  terminalId: string
  bankName: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface POSBatch {
  id: string
  stationId: string
  stationName?: string
  terminalId: string
  bankName?: string
  batchDate: string
  batchNumber: string
  visaTotal: number
  mastercardTotal: number
  amexTotal: number
  otherTotal: number
  totalAmount: number
  photoUrl?: string
  recordedBy: string
  createdAt: string
  status: 'PENDING' | 'RECONCILED' | 'DISPUTED'
}

const cardSchemes = [
  { key: 'visa', label: 'Visa', color: 'bg-blue-100 text-blue-800' },
  { key: 'mastercard', label: 'Mastercard', color: 'bg-red-100 text-red-800' },
  { key: 'amex', label: 'American Express', color: 'bg-green-100 text-green-800' },
  { key: 'other', label: 'Other Cards', color: 'bg-gray-100 text-gray-800' }
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
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0])
  const [batchNumber, setBatchNumber] = useState('')
  const [visaTotal, setVisaTotal] = useState('')
  const [mastercardTotal, setMastercardTotal] = useState('')
  const [amexTotal, setAmexTotal] = useState('')
  const [otherTotal, setOtherTotal] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

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
    terminal.stationId === selectedStation && terminal.status === 'ACTIVE'
  )

  // Calculate total amount
  const totalAmount = [visaTotal, mastercardTotal, amexTotal, otherTotal]
    .reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedTerminal || !batchDate || !batchNumber) {
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
          stationId: selectedStation,
          terminalId: selectedTerminal,
          batchDate,
          batchNumber,
          visaTotal: parseFloat(visaTotal) || 0,
          mastercardTotal: parseFloat(mastercardTotal) || 0,
          amexTotal: parseFloat(amexTotal) || 0,
          otherTotal: parseFloat(otherTotal) || 0,
          totalAmount,
          photoUrl: photoFile ? `uploads/pos-batches/${photoFile.name}` : undefined,
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create POS batch')
      }

      const newBatch = await response.json()
      
      // Add to recent batches list
      setRecentBatches(prev => [newBatch, ...prev.slice(0, 9)])
      
      // Reset form
      setSelectedTerminal('')
      setBatchNumber('')
      setVisaTotal('')
      setMastercardTotal('')
      setAmexTotal('')
      setOtherTotal('')
      setPhotoFile(null)
      
      setSuccess('POS batch created successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to create POS batch')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECONCILED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'DISPUTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const batchColumns: Column<POSBatch>[] = [
    {
      key: 'batchDate' as keyof POSBatch,
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
      key: 'stationName' as keyof POSBatch,
      title: 'Station',
      render: (value: unknown, row: POSBatch) => {
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
      key: 'terminalId' as keyof POSBatch,
      title: 'Terminal',
      render: (value: unknown, row: POSBatch) => {
        const terminal = terminals.find(t => t.id === row.terminalId)
        return (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <div className="flex flex-col">
              <span className="font-medium">{value as string}</span>
              {terminal && <span className="text-xs text-gray-500">{terminal.bankName}</span>}
            </div>
          </div>
        )
      }
    },
    {
      key: 'batchNumber' as keyof POSBatch,
      title: 'Batch #',
      render: (value: unknown) => (
        <span className="font-mono text-sm">{value as string}</span>
      )
    },
    {
      key: 'visaTotal' as keyof POSBatch,
      title: 'Visa',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-blue-100 text-blue-800 text-xs">VISA</Badge>
          <span className="font-mono text-sm">
            Rs. {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'mastercardTotal' as keyof POSBatch,
      title: 'Mastercard',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Badge className="bg-red-100 text-red-800 text-xs">MC</Badge>
          <span className="font-mono text-sm">
            Rs. {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'totalAmount' as keyof POSBatch,
      title: 'Total Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-500" />
          <span className="font-mono font-semibold text-green-700">
            Rs. {(value as number)?.toLocaleString() || '0'}
          </span>
        </div>
      )
    },
    {
      key: 'status' as keyof POSBatch,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'photoUrl' as keyof POSBatch,
      title: 'Photo',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Camera className="h-4 w-4 text-gray-500" />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">POS Batches</h1>

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
                          <span className="font-medium">{terminal.terminalId}</span>
                          <span className="text-xs text-gray-500">{terminal.bankName}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="batchDate">Batch Date *</Label>
              <input
                id="batchDate"
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Batch Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g., B001234"
                disabled={loading}
                required
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
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
                      scheme.key === 'visa' ? visaTotal :
                      scheme.key === 'mastercard' ? mastercardTotal :
                      scheme.key === 'amex' ? amexTotal : otherTotal
                    }
                    onChange={(value) => {
                      if (scheme.key === 'visa') setVisaTotal(value)
                      else if (scheme.key === 'mastercard') setMastercardTotal(value)
                      else if (scheme.key === 'amex') setAmexTotal(value)
                      else setOtherTotal(value)
                    }}
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Batch Receipt Photo</Label>
            <FileUploadStub
              onFileSelect={setPhotoFile}
              accept="image/*"
              placeholder="Upload batch receipt photo (optional)"
            />
          </div>

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
