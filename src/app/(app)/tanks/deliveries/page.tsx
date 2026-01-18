'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Fuel, Clock, Truck, FileText, Camera, AlertCircle, CheckCircle, Plus, Building2, Calendar, ArrowLeft } from 'lucide-react'

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
  currentLevel: number
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
  const { selectedStation, setSelectedStation } = useStation()
  const [selectedTank, setSelectedTank] = useState('')
  const [supplier, setSupplier] = useState('')
  const [customSupplier, setCustomSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceQuantity, setInvoiceQuantity] = useState('')
  const [dipBefore, setDipBefore] = useState('')
  const [dipAfter, setDipAfter] = useState('')
  const [deliveryTime, setDeliveryTime] = useState<Date>(new Date())
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Delivery details dialog state
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null)
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false)

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
        !invoiceQuantity || !dipBefore || !dipAfter) {
      setError('Please fill in all required fields')
      return
    }

    // Calculate quantity from dip readings
    const calculatedQuantity = parseFloat(dipAfter) - parseFloat(dipBefore)
    if (calculatedQuantity <= 0) {
      setError('Dip After must be greater than Dip Before')
      return
    }

    if (supplier === 'Other' && !customSupplier) {
      setError('Please specify the supplier name')
      return
    }

    // Frontend capacity validation
    const selectedTankData = tanks.find(t => t.id === selectedTank)
    if (selectedTankData) {
      const newLevel = selectedTankData.currentLevel + calculatedQuantity
      
      if (newLevel > selectedTankData.capacity) {
        const availableSpace = selectedTankData.capacity - selectedTankData.currentLevel
        setError(
          `Delivery exceeds tank capacity! Tank capacity: ${selectedTankData.capacity.toLocaleString()}L, ` +
          `Current stock: ${selectedTankData.currentLevel.toLocaleString()}L. ` +
          `Attempted delivery: ${calculatedQuantity.toLocaleString()}L. ` +
          `Maximum delivery allowed: ${availableSpace.toFixed(1)}L`
        )
        return
      }
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
          stationId: selectedStation,
          tankId: selectedTank,
          supplier: finalSupplier,
          invoiceNumber,
          invoiceQuantity: parseFloat(invoiceQuantity),
          measuredQuantity: calculatedQuantity, // Use calculated quantity
          dipBefore: parseFloat(dipBefore),
          dipAfter: parseFloat(dipAfter),
          deliveryTime: deliveryTime.toISOString(),
          receivedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User',
          notes,
          photoUrl: photoFile ? `uploads/${photoFile.name}` : undefined // Mock photo URL
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to record delivery')
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
      setDipBefore('')
      setDipAfter('')
      setDeliveryTime(new Date())
      setNotes('')
      setPhotoFile(null)
      
      setSuccess('Delivery recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record delivery'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const availableTanks = tanks.filter(tank => tank.stationId === selectedStation)

  const handleDeliveryClick = (delivery: any) => {
    setSelectedDelivery(delivery)
    setShowDeliveryDetails(true)
  }

  const deliveryColumns: Column<any>[] = [
    {
      key: 'deliveryDate' as keyof any,
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
      key: 'tank' as keyof any,
      title: 'Tank',
      render: (value: unknown, row: any) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.tank?.fuelType?.replace(/_/g, ' ') || 'Unknown'}</span>
          <Badge variant="outline">{row.tank?.fuelType?.replace(/_/g, ' ') || ''}</Badge>
        </div>
      )
    },
    {
      key: 'supplier' as keyof any,
      title: 'Supplier',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'invoiceNumber' as keyof any,
      title: 'Invoice',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{value as string || '-'}</span>
        </div>
      )
    },
    {
      key: 'invoiceQuantity' as keyof any,
      title: 'Invoice Qty (L)',
      render: (value: unknown) => (
        <span className="font-mono">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'quantity' as keyof any,
      title: 'Quantity (L)',
      render: (value: unknown, row: any) => {
        // Calculate from dip readings if available
        const calculatedQty = row.dipAfter && row.dipBefore 
          ? row.dipAfter - row.dipBefore 
          : (value as number) || 0
        return (
          <span className="font-mono font-semibold">
            {calculatedQty.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L
          </span>
        )
      }
    },
    {
      key: 'variance' as keyof Delivery,
      title: 'Variance (L)',
      render: (value: unknown) => {
        const numValue = value as number
        if (numValue == null) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            {Math.abs(numValue) <= 50 ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-mono font-semibold ${Math.abs(numValue) <= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
          <Camera className="h-4 w-4 text-muted-foreground" />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/tanks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Tank Deliveries</h1>
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
                        <span className="font-medium">{tank.tankNumber || 'TANK-1'}</span>
                        <Badge variant="outline">{tank.fuelType.replace(/_/g, ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          (Cap: {tank.capacity.toLocaleString()}L, Current: {tank.currentLevel.toLocaleString()}L)
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
              <Label htmlFor="deliveryTime">Delivery Time *</Label>
              <DateTimePicker
                value={deliveryTime}
                onChange={setDeliveryTime}
                disabled={loading}
              />
            </div>
          </div>

          {/* Dip Readings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <Label>Calculated Quantity (L)</Label>
              <div className="p-2 border rounded-md bg-muted">
                <div className="text-lg font-bold font-mono">
                  {dipBefore && dipAfter && parseFloat(dipAfter) >= parseFloat(dipBefore) 
                    ? `${(parseFloat(dipAfter) - parseFloat(dipBefore)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`
                    : <span className="text-muted-foreground">-</span>}
                </div>
              </div>
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
          onRowClick={handleDeliveryClick}
        />
      </FormCard>

      {/* Delivery Details Dialog */}
      <Dialog open={showDeliveryDetails} onOpenChange={setShowDeliveryDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600 dark:text-green-400" />
              Delivery Details: {selectedDelivery?.invoiceNumber || 'Loading...'}
            </DialogTitle>
            <DialogDescription>
              Complete information about this delivery
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  <div className="font-semibold">{selectedDelivery.invoiceNumber || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <div className="font-medium">{selectedDelivery.supplier || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tank</Label>
                  <div>
                    <Badge variant="outline">
                      {selectedDelivery.tank?.fuelType?.replace(/_/g, ' ') || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Station</Label>
                  <div className="font-medium">
                    {selectedDelivery.station?.name || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg overflow-hidden">
                  <Label className="text-xs text-muted-foreground mb-2 block">Invoice Quantity</Label>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 break-words leading-tight">
                    {(selectedDelivery.invoiceQuantity?.toLocaleString() || 0)}L
                  </div>
                </div>
                <div className="p-4 border rounded-lg overflow-hidden">
                  <Label className="text-xs text-muted-foreground mb-2 block">Calculated Quantity</Label>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400 break-words leading-tight">
                    {(() => {
                      const calculatedQty = selectedDelivery.dipAfter && selectedDelivery.dipBefore
                        ? selectedDelivery.dipAfter - selectedDelivery.dipBefore
                        : (selectedDelivery.quantity || 0)
                      return `${calculatedQty.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L`
                    })()}
                  </div>
                </div>
                <div className="p-4 border rounded-lg overflow-hidden">
                  <Label className="text-xs text-muted-foreground mb-2 block">Variance</Label>
                  <div className={`text-xl font-bold break-words leading-tight ${
                    selectedDelivery.variance !== null && selectedDelivery.variance !== undefined
                      ? selectedDelivery.variance > 0
                        ? 'text-green-600 dark:text-green-400'
                        : selectedDelivery.variance < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400' // 0 variance = good (green)
                      : 'text-muted-foreground'
                  }`}>
                    {selectedDelivery.variance !== null && selectedDelivery.variance !== undefined
                      ? `${selectedDelivery.variance > 0 ? '+' : ''}${selectedDelivery.variance.toLocaleString()}L`
                      : 'N/A'}
                  </div>
                  {selectedDelivery.variance !== null && selectedDelivery.variance !== undefined && (
                    <div className="text-xs mt-1">
                      {selectedDelivery.invoiceQuantity 
                        ? `${Math.abs(((selectedDelivery.variance / selectedDelivery.invoiceQuantity) * 100)).toFixed(2)}%`
                        : 'N/A'}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Indicators */}
              {selectedDelivery.variance !== null && selectedDelivery.variance !== undefined && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {Math.abs(selectedDelivery.variance) <= 50 ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <div className="font-semibold text-green-700">
                            {selectedDelivery.variance === 0 ? 'Perfect Match!' : 'Good'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedDelivery.variance === 0
                              ? 'Invoice and measured quantities match exactly'
                              : 'Variance is within acceptable tolerance (±50L)'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <div>
                          <div className="font-semibold text-red-700">High Variance</div>
                          <div className="text-sm text-muted-foreground">
                            Variance exceeds tolerance threshold (±50L)
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Delivery Time
                  </Label>
                  <div className="font-medium">
                    {new Date(selectedDelivery.deliveryDate).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Received By
                  </Label>
                  <div className="font-medium">{selectedDelivery.receivedBy || 'N/A'}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                    <Camera className="h-3 w-3" />
                    Photo Available
                  </Label>
                  <div>
                    <Badge variant={selectedDelivery.photoUrl ? 'default' : 'secondary'}>
                      {selectedDelivery.photoUrl ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Created At
                  </Label>
                  <div className="font-medium text-sm">
                    {new Date(selectedDelivery.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedDelivery.notes && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-2 block">Notes</Label>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedDelivery.notes}
                  </div>
                </div>
              )}

              {/* Tank Information */}
              {selectedDelivery.tank && (
                <div className="p-4 border rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    Tank Information
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Level</Label>
                      <div className="font-semibold">
                        {selectedDelivery.tank.currentLevel?.toLocaleString() || 0}L
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Capacity</Label>
                      <div className="font-semibold">
                        {selectedDelivery.tank.capacity?.toLocaleString() || 0}L
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Failed to load delivery details
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

