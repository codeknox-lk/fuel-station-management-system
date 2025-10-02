'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileUploadStub } from '@/components/FileUploadStub'
import { Fuel, Clock, Truck, FileText, Camera, AlertCircle, CheckCircle, Plus, Building2 } from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Tank {
  id: string
  stationId: string
  tankNumber: string
  fuelType: string
  capacity: number
  currentStock: number
}

interface Delivery {
  id: string
  tankId: string
  tankNumber?: string
  fuelType?: string
  supplier: string
  invoiceNumber: string
  invoiceQuantity: number
  measuredQuantity: number
  dipBefore: number
  dipAfter: number
  deliveryTime: string
  recordedBy: string
  photoUrl?: string
  notes?: string
  variance?: number
  createdAt: string
}

const suppliers = [
  'Ceylon Petroleum Corporation (CPC)',
  'Lanka IOC PLC',
  'Shell Gas Lanka Ltd',
  'Chevron Lubricants Lanka PLC',
  'Mobil Lanka Lubricants Pvt Ltd',
  'Other'
]

export default function TankDeliveriesPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [tanks, setTanks] = useState<Tank[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedTank, setSelectedTank] = useState('')
  const [supplier, setSupplier] = useState('')
  const [customSupplier, setCustomSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceQuantity, setInvoiceQuantity] = useState('')
  const [measuredQuantity, setMeasuredQuantity] = useState('')
  const [dipBefore, setDipBefore] = useState('')
  const [dipAfter, setDipAfter] = useState('')
  const [deliveryTime, setDeliveryTime] = useState<Date>(new Date())
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, deliveriesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/deliveries?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const deliveriesData = await deliveriesRes.json()

        setStations(stationsData)
        setRecentDeliveries(deliveriesData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  // Load tanks when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadTanks = async () => {
        try {
          const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
          const tanksData = await response.json()
          setTanks(tanksData)
        } catch (err) {
          setError('Failed to load tanks')
        }
      }

      loadTanks()
    } else {
      setTanks([])
    }
  }, [selectedStation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !selectedTank || !supplier || !invoiceNumber || 
        !invoiceQuantity || !measuredQuantity || !dipBefore || !dipAfter) {
      setError('Please fill in all required fields')
      return
    }

    if (supplier === 'Other' && !customSupplier) {
      setError('Please specify the supplier name')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const finalSupplier = supplier === 'Other' ? customSupplier : supplier

      const response = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId: selectedTank,
          supplier: finalSupplier,
          invoiceNumber,
          invoiceQuantity: parseFloat(invoiceQuantity),
          measuredQuantity: parseFloat(measuredQuantity),
          dipBefore: parseFloat(dipBefore),
          dipAfter: parseFloat(dipAfter),
          deliveryTime: deliveryTime.toISOString(),
          notes,
          recordedBy: 'Current User', // In real app, get from auth context
          photoUrl: photoFile ? `uploads/${photoFile.name}` : undefined // Mock photo URL
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record delivery')
      }

      const newDelivery = await response.json()
      
      // Add to recent deliveries list
      setRecentDeliveries(prev => [newDelivery, ...prev.slice(0, 9)])
      
      // Reset form
      setSelectedTank('')
      setSupplier('')
      setCustomSupplier('')
      setInvoiceNumber('')
      setInvoiceQuantity('')
      setMeasuredQuantity('')
      setDipBefore('')
      setDipAfter('')
      setDeliveryTime(new Date())
      setNotes('')
      setPhotoFile(null)
      
      setSuccess('Delivery recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record delivery')
    } finally {
      setLoading(false)
    }
  }

  const availableTanks = tanks.filter(tank => tank.stationId === selectedStation)

  const deliveryColumns: Column<Delivery>[] = [
    {
      key: 'deliveryTime' as keyof Delivery,
      title: 'Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'tankNumber' as keyof Delivery,
      title: 'Tank',
      render: (value: unknown, row: Delivery) => {
        const tank = tanks.find(t => t.id === row.tankId)
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{tank?.tankNumber || (value as string)}</span>
            {tank && <Badge variant="outline">{tank.fuelType}</Badge>}
          </div>
        )
      }
    },
    {
      key: 'supplier' as keyof Delivery,
      title: 'Supplier',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'invoiceNumber' as keyof Delivery,
      title: 'Invoice',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="font-mono text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'invoiceQuantity' as keyof Delivery,
      title: 'Invoice Qty (L)',
      render: (value: unknown) => (
        <span className="font-mono">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'measuredQuantity' as keyof Delivery,
      title: 'Measured Qty (L)',
      render: (value: unknown) => (
        <span className="font-mono font-semibold">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'variance' as keyof Delivery,
      title: 'Variance (L)',
      render: (value: unknown) => {
        const numValue = value as number
        if (numValue == null) {
          return <span className="text-gray-400">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            {Math.abs(numValue) <= 50 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className={`font-mono font-semibold ${Math.abs(numValue) <= 50 ? 'text-green-600' : 'text-red-600'}`}>
              {numValue > 0 ? '+' : ''}{numValue.toLocaleString()}L
            </span>
          </div>
        )
      }
    },
    {
      key: 'photoUrl' as keyof Delivery,
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
      <h1 className="text-3xl font-bold text-gray-900">Tank Deliveries</h1>

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

      <FormCard title="Record New Delivery">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station and Tank Selection */}
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
              <Label htmlFor="tank">Tank *</Label>
              <Select value={selectedTank} onValueChange={setSelectedTank} disabled={loading || !selectedStation}>
                <SelectTrigger id="tank">
                  <SelectValue placeholder="Select a tank" />
                </SelectTrigger>
                <SelectContent>
                  {availableTanks.map((tank) => (
                    <SelectItem key={tank.id} value={tank.id}>
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4" />
                        <span className="font-medium">Tank {tank.tankNumber}</span>
                        <Badge variant="outline">{tank.fuelType}</Badge>
                        <span className="text-xs text-gray-500">
                          (Cap: {tank.capacity.toLocaleString()}L)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select value={supplier} onValueChange={setSupplier} disabled={loading}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup} value={sup}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {sup}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supplier === 'Other' && (
              <div>
                <Label htmlFor="customSupplier">Supplier Name *</Label>
                <Input
                  id="customSupplier"
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  placeholder="Enter supplier name"
                  disabled={loading}
                  required
                />
              </div>
            )}
          </div>

          {/* Invoice and Quantity Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2024-001"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="invoiceQuantity">Invoice Quantity (L) *</Label>
              <Input
                id="invoiceQuantity"
                type="number"
                value={invoiceQuantity}
                onChange={(e) => setInvoiceQuantity(e.target.value)}
                placeholder="10000"
                min="0"
                step="0.1"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="measuredQuantity">Measured Quantity (L) *</Label>
              <Input
                id="measuredQuantity"
                type="number"
                value={measuredQuantity}
                onChange={(e) => setMeasuredQuantity(e.target.value)}
                placeholder="9950"
                min="0"
                step="0.1"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="deliveryTime">Delivery Time *</Label>
              <DateTimePicker
                value={deliveryTime}
                onChange={setDeliveryTime}
                disabled={loading}
              />
            </div>
          </div>

          {/* Dip Readings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dipBefore">Dip Before Delivery (L) *</Label>
              <Input
                id="dipBefore"
                type="number"
                value={dipBefore}
                onChange={(e) => setDipBefore(e.target.value)}
                placeholder="5000"
                min="0"
                step="0.1"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="dipAfter">Dip After Delivery (L) *</Label>
              <Input
                id="dipAfter"
                type="number"
                value={dipAfter}
                onChange={(e) => setDipAfter(e.target.value)}
                placeholder="14950"
                min="0"
                step="0.1"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Photo Upload and Notes */}
          <div className="space-y-4">
            <div>
              <Label>Delivery Photo</Label>
              <FileUploadStub
                onFileSelect={setPhotoFile}
                accept="image/*"
                placeholder="Upload delivery photo (optional)"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about the delivery..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/tanks')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Delivery
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Deliveries" className="p-6">
        <DataTable
          data={recentDeliveries}
          columns={deliveryColumns}
          searchPlaceholder="Search deliveries..."
          emptyMessage="No deliveries recorded yet."
        />
      </FormCard>
    </div>
  )
}
