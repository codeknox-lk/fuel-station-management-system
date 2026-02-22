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
  Users,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Camera,
  AlertCircle,
  CheckCircle,
  Plus,

} from 'lucide-react'


interface CreditCustomer {
  id: string
  name: string
  nicOrBrn: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
}

interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
  isActive: boolean
}

interface CreditSale {
  id: string
  customerId: string
  customerName?: string
  stationId: string
  stationName?: string
  amount: number
  saleDate: string
  slipNumber: string
  signedSlipUrl?: string
  fuelId?: string
  fuel?: Fuel
  litres?: number
  recordedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
}

export default function CreditSalesPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [recentSales, setRecentSales] = useState<CreditSale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const { selectedStation, stations } = useStation()
  const [amount, setAmount] = useState(0)
  const [saleDate, setSaleDate] = useState<Date>(new Date())
  const [slipNumber, setSlipNumber] = useState('')
  const [fuelId, setFuelId] = useState('')
  const [litres, setLitres] = useState('')
  const [signedSlipFile, setSignedSlipFile] = useState<File | null>(null)
  const [fuels, setFuels] = useState<Fuel[]>([])

  // Load data based on selected station
  useEffect(() => {
    const loadData = async () => {
      try {
        const salesUrl = !selectedStation || selectedStation === 'all'
          ? '/api/credit/sales?limit=10'
          : `/api/credit/sales?stationId=${selectedStation}&limit=10`

        const [customersRes, salesRes, fuelsRes] = await Promise.all([
          fetch('/api/credit/customers?status=ACTIVE'),
          fetch(salesUrl),
          fetch('/api/fuels')
        ])

        const customersData = await customersRes.json()
        const salesData = await salesRes.json()
        const fuelsData = await fuelsRes.json()

        setFuels(fuelsData.filter((f: Fuel) => f.isActive))
        setCustomers(customersData.map((customer: { id: string; name: string; creditLimit: number; currentBalance: number }) => ({
          ...customer,
          availableCredit: customer.creditLimit - customer.currentBalance
        })))
        setRecentSales(salesData)
      } catch {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [selectedStation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer || !selectedStation || amount <= 0 || !slipNumber) {
      setError('Please fill in all required fields')
      return
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    // Check customer credit limit
    const customer = customers.find(c => c.id === selectedCustomer)
    if (customer && amount > customer.availableCredit) {
      setError(`Amount exceeds available credit limit of Rs. ${(customer.availableCredit || 0).toLocaleString()}`)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/credit/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          stationId: selectedStation,
          amount: amount,
          saleDate: saleDate.toISOString(),
          slipNumber,
          fuelId: fuelId || undefined,
          litres: litres ? parseFloat(litres) : undefined,
          signedSlipUrl: signedSlipFile ? `uploads/credit-slips/${signedSlipFile.name}` : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record credit sale')
      }

      const newSale = await response.json()

      // Add to recent sales list
      setRecentSales(prev => [newSale, ...prev.slice(0, 9)])

      // Update customer available credit
      setCustomers(prev => prev.map(c =>
        c.id === selectedCustomer
          ? { ...c, currentBalance: c.currentBalance + amount, availableCredit: c.availableCredit - amount }
          : c
      ))

      // Reset form
      setSelectedCustomer('')
      setAmount(0)
      setSaleDate(new Date())
      setSlipNumber('')
      setFuelId('')
      setLitres('')
      setSignedSlipFile(null)

      setSuccess('Credit sale recorded successfully!')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to record credit sale')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'REJECTED': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer)

  const salesColumns: Column<CreditSale>[] = [
    {
      key: 'saleDate' as keyof CreditSale,
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
      key: 'customerName' as keyof CreditSale,
      title: 'Customer',
      render: (value: unknown, row: CreditSale) => {
        const customer = customers.find(c => c.id === row.customerId)
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{customer?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'stationName' as keyof CreditSale,
      title: 'Station',
      render: (value: unknown, row: CreditSale) => {
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
      key: 'amount' as keyof CreditSale,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-mono font-semibold text-green-700">
            Rs. {((value as number) || 0).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'fuel' as keyof CreditSale,
      title: 'Fuel Type',
      render: (value: unknown, row: CreditSale) => (
        row.fuel ? (
          <div className="flex flex-col">
            <Badge variant="outline">{row.fuel.icon} {row.fuel.name}</Badge>
            {row.litres && (
              <span className="text-xs text-muted-foreground mt-1">
                {row.litres}L
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      )
    },
    {
      key: 'slipNumber' as keyof CreditSale,
      title: 'Slip Number',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'signedSlipUrl' as keyof CreditSale,
      title: 'Signed Slip',
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
      key: 'status' as keyof CreditSale,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'recordedBy' as keyof CreditSale,
      title: 'Recorded By',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{value as string}</span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-foreground">Credit Sales</h1>

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

      <FormCard title="Record New Credit Sale">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer and Station Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer} disabled={loading}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Available: Rs. {(customer.availableCredit || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomerData && (
                <div className="mt-2 p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-md">
                  <div className="text-xs text-orange-700">
                    <div>Credit Limit: Rs. {(selectedCustomerData.creditLimit || 0).toLocaleString()}</div>
                    <div>Current Balance: Rs. {(selectedCustomerData.currentBalance || 0).toLocaleString()}</div>
                    <div className="font-semibold">Available: Rs. {(selectedCustomerData.availableCredit || 0).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Selected Station</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{stations.find(s => s.id === selectedStation)?.name || 'All Stations'}</span>
              </div>
            </div>
          </div>

          {/* Sale Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="amount">Amount (Rs.) *</Label>
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
              <Label htmlFor="saleDate">Sale Date *</Label>
              <DateTimePicker
                value={saleDate}
                onChange={(date) => setSaleDate(date || new Date())}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="slipNumber">Slip Number *</Label>
              <Input
                id="slipNumber"
                value={slipNumber}
                onChange={(e) => setSlipNumber(e.target.value)}
                placeholder="SLP001234"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="fuelId">Fuel Type</Label>
              <Select value={fuelId} onValueChange={setFuelId} disabled={loading}>
                <SelectTrigger id="fuelId">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {fuels.map((fuel) => (
                    <SelectItem key={fuel.id} value={fuel.id}>
                      {fuel.icon} {fuel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="litres">Litres</Label>
              <Input
                id="litres"
                type="number"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
          </div>

          {/* Signed Slip Upload */}
          <div>
            <Label>Signed Slip Photo</Label>
            <FileUploadStub
              onFileSelect={setSignedSlipFile}
              acceptedTypes={["image/*"]}
              placeholder="Upload signed slip photo (required for approval)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload a clear photo of the signed credit slip for verification
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/credit')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Sale
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Credit Sales" className="p-6">
        <DataTable
          data={recentSales}
          columns={salesColumns}
          searchPlaceholder="Search credit sales..."
          emptyMessage="No credit sales recorded yet."
        />
      </FormCard>
    </div>
  )
}
