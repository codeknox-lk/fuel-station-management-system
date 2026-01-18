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
  Clock
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface CreditCustomer {
  id: string
  name: string
  nicOrBrn: string
  creditLimit: number
  currentBalance: number
  availableCredit: number
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
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
  fuelType?: string
  litres?: number
  recordedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
  createdAt: string
}

export default function CreditSalesPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [customers, setCustomers] = useState<CreditCustomer[]>([])
  const [recentSales, setRecentSales] = useState<CreditSale[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const { selectedStation } = useStation()
  const [amount, setAmount] = useState(0)
  const [saleDate, setSaleDate] = useState<Date>(new Date())
  const [slipNumber, setSlipNumber] = useState('')
  const [fuelType, setFuelType] = useState('')
  const [litres, setLitres] = useState('')
  const [signedSlipFile, setSignedSlipFile] = useState<File | null>(null)

  const fuelTypes = ['Petrol 95', 'Petrol 92', 'Diesel', 'Super Diesel']

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, customersRes, salesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/credit/customers?status=ACTIVE'),
          fetch('/api/credit/sales?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const customersData = await customersRes.json()
        const salesData = await salesRes.json()

        setStations(stationsData)
        setCustomers(customersData.map((customer: { id: string; name: string; creditLimit: number; currentBalance: number }) => ({
          ...customer,
          availableCredit: customer.creditLimit - customer.currentBalance
        })))
        setRecentSales(salesData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

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
      setError(`Amount exceeds available credit limit of Rs. ${customer.availableCredit.toLocaleString()}`)
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
          fuelType: fuelType || undefined,
          litres: litres ? parseFloat(litres) : undefined,
          signedSlipUrl: signedSlipFile ? `uploads/credit-slips/${signedSlipFile.name}` : undefined,
          recordedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
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
      setSelectedStation('')
      setAmount(0)
      setSaleDate(new Date())
      setSlipNumber('')
      setFuelType('')
      setLitres('')
      setSignedSlipFile(null)
      
      setSuccess('Credit sale recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
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
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'fuelType' as keyof CreditSale,
      title: 'Fuel Type',
      render: (value: unknown, row: CreditSale) => (
        value ? (
          <div className="flex flex-col">
            <Badge variant="outline">{value as string}</Badge>
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
                            Available: Rs. {customer.availableCredit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomerData && (
                <div className="mt-2 p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-md">
                  <div className="text-xs text-blue-700">
                    <div>Credit Limit: Rs. {selectedCustomerData.creditLimit.toLocaleString()}</div>
                    <div>Current Balance: Rs. {selectedCustomerData.currentBalance.toLocaleString()}</div>
                    <div className="font-semibold">Available: Rs. {selectedCustomerData.availableCredit.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

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
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select value={fuelType} onValueChange={setFuelType} disabled={loading}>
                <SelectTrigger id="fuelType">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((fuel) => (
                    <SelectItem key={fuel} value={fuel}>
                      {fuel}
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
