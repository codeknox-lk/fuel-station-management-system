'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Truck, AlertCircle, CheckCircle, Plus, ArrowLeft, RefreshCw, Droplets, Clock, AlertTriangle } from 'lucide-react'
import { depthToVolume, getTankCapacityLabel, validateDepth, getMaxDepth, volumeToDepth, TankCapacity } from '@/lib/tank-calibration'



interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
}

interface Tank {
  id: string
  stationId: string
  tankNumber: string
  fuelId: string
  fuel?: Fuel
  capacity: number
  currentLevel: number
}

interface Delivery {
  id: string
  tankId: string
  tank?: {
    tankNumber: string
    fuelId: string
    fuel?: Fuel
    currentLevel: number
    capacity: number
  }
  supplier: string
  invoiceNumber?: string
  invoiceQuantity: number
  quantity: number
  beforeDipReading?: number
  afterDipReading?: number
  actualReceived?: number
  fuelSoldDuring?: number
  beforeMeterReadings?: {
    assignmentId: string
    nozzleId: string
    meterReading: number
  }[]
  verificationStatus: string
  deliveryDate: string
  receivedBy: string
  verifiedBy?: string
  createdAt: string
  invoiceVariance?: number
  dipVariance?: number
}

interface ActiveShift {
  id: string
  startTime: string
  template: { name: string }
  assignments: Array<{
    id: string
    pumperName: string
    nozzle: {
      id: string
      nozzleNumber: string
      tank: { id: string; tankNumber: string; fuelId: string; fuel?: Fuel; name?: string }
    }
    startMeterReading: number
  }>
}

interface PumpReading {
  assignmentId: string
  nozzleId: string
  tankId: string
  startMeterReading: number
  currentMeter: string
  fuelUsed: number
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
  const { selectedStation, isAllStations } = useStation()
  const { toast } = useToast()

  const [tanks, setTanks] = useState<Tank[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('new') // Restored

  // Form state
  const [selectedTank, setSelectedTank] = useState('')
  const [supplier, setSupplier] = useState('')
  const [customSupplier, setCustomSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceQuantity, setInvoiceQuantity] = useState('')
  const [deliveryTime, setDeliveryTime] = useState<Date>(new Date())
  const [receivedBy, setReceivedBy] = useState('')
  const [notes, setNotes] = useState('')

  // Before dip state
  const [beforeDipDepth, setBeforeDipDepth] = useState('')
  const [beforeDipReading, setBeforeDipReading] = useState('')
  const [beforeDipTime, setBeforeDipTime] = useState<Date>(new Date())
  const [showBeforeDip, setShowBeforeDip] = useState(false)

  // Active shifts state (for before dip)
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [pumpReadings, setPumpReadings] = useState<PumpReading[]>([])

  // Defined here to be accessible
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const deliveriesRes = await fetch('/api/tanks/deliveries?limit=10')
      if (deliveriesRes.ok) {
        const deliveriesData = await deliveriesRes.json()
        setDeliveries(deliveriesData)
      }
    } catch (error) {
      console.error('Failed to load data', error)
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Verification dialog state
  const [verifyingDelivery, setVerifyingDelivery] = useState<Delivery | null>(null)
  const [afterDipDepth, setAfterDipDepth] = useState('')
  const [afterDipReading, setAfterDipReading] = useState('')
  const [afterDipTime, setAfterDipTime] = useState<Date>(new Date())
  const [afterActiveShifts, setAfterActiveShifts] = useState<ActiveShift[]>([])
  const [afterPumpReadings, setAfterPumpReadings] = useState<PumpReading[]>([])
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Details dialog state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showDetails, setShowDetails] = useState(false)



  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedStation) {
      const loadTanks = async () => {
        try {
          const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
          const tanksData = await response.json()
          setTanks(tanksData)
        } catch (err) {
          console.error('Failed to load tanks:', err)
          toast({
            title: "Error",
            description: "Failed to load tanks",
            variant: "destructive"
          })
        }
      }
      loadTanks()
    } else {
      setTanks([])
    }
  }, [selectedStation, toast])

  const loadActiveShifts = useCallback(async (time: Date, isBefore: boolean) => {
    if (!selectedStation) return

    try {
      setLoadingShifts(true)
      const timeISO = time.toISOString()

      const response = await fetch(
        `/api/shifts?stationId=${selectedStation}&activeAt=${timeISO}&includeAssignments=true`
      )

      if (response.ok) {
        const data = await response.json()
        const shiftsData = Array.isArray(data) ? data : data.shifts || []

        if (isBefore) {
          setActiveShifts(shiftsData)
          const initialReadings: PumpReading[] = []
          shiftsData.forEach((shift: ActiveShift) => {
            shift.assignments.forEach(assignment => {
              initialReadings.push({
                assignmentId: assignment.id,
                nozzleId: assignment.nozzle.id,
                tankId: assignment.nozzle.tank.id,
                startMeterReading: assignment.startMeterReading,
                currentMeter: '',
                fuelUsed: 0
              })
            })
          })
          setPumpReadings(initialReadings)
        } else {
          setAfterActiveShifts(shiftsData)
          const initialReadings: PumpReading[] = []
          shiftsData.forEach((shift: ActiveShift) => {
            shift.assignments.forEach(assignment => {
              initialReadings.push({
                assignmentId: assignment.id,
                nozzleId: assignment.nozzle.id,
                tankId: assignment.nozzle.tank.id,
                startMeterReading: assignment.startMeterReading,
                currentMeter: '',
                fuelUsed: 0
              })
            })
          })
          setAfterPumpReadings(initialReadings)
        }
      }
    } catch (err) {
      console.error('Failed to load active shifts:', err)
    } finally {
      setLoadingShifts(false)
    }
  }, [selectedStation])

  useEffect(() => {
    if (selectedStation && beforeDipTime && showBeforeDip) {
      loadActiveShifts(beforeDipTime, true)
    }
  }, [selectedStation, beforeDipTime, showBeforeDip, loadActiveShifts])

  useEffect(() => {
    if (verifyingDelivery && afterDipTime) {
      loadActiveShifts(afterDipTime, false)
    }
  }, [verifyingDelivery, afterDipTime, loadActiveShifts])

  const handleMeterChange = (assignmentId: string, value: string, isBefore: boolean, beforeDipMeter?: number) => {
    const setReadings = isBefore ? setPumpReadings : setAfterPumpReadings

    setReadings(prev => prev.map(reading => {
      if (reading.assignmentId === assignmentId) {
        const currentMeter = parseFloat(value) || 0

        // For after dip, use the provided beforeDipMeter parameter (from stored data)
        let baselineMeter = reading.startMeterReading
        if (!isBefore) {
          if (beforeDipMeter !== undefined) {
            // Use stored before dip meter from database
            baselineMeter = beforeDipMeter
          } else {
            // Fallback: try to get from pumpReadings state (during initial recording)
            const beforeReading = pumpReadings.find(r => r.assignmentId === assignmentId)
            if (beforeReading && beforeReading.currentMeter) {
              baselineMeter = parseFloat(beforeReading.currentMeter)
            }
          }
        }

        const fuelUsed = Math.max(0, currentMeter - baselineMeter)
        return { ...reading, currentMeter: value, fuelUsed }
      }
      return reading
    }))
  }

  const calculateTotalFuelSold = (readings: PumpReading[], tankId: string): number => {
    return readings
      .filter(r => r.tankId === tankId && r.fuelUsed > 0)
      .reduce((sum, r) => sum + r.fuelUsed, 0)
  }

  const handleTakeBeforeDip = () => {
    if (!selectedTank) {
      toast({
        title: "Error",
        description: "Please select a tank first",
        variant: "destructive"
      })
      return
    }
    setShowBeforeDip(true)
    setBeforeDipTime(new Date())
  }

  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStation || !selectedTank || !supplier || !invoiceQuantity || !receivedBy) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (!beforeDipReading) {
      toast({
        title: "Error",
        description: "Please take a before dip reading first",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const finalSupplier = supplier === 'Other' ? customSupplier : supplier
      const fuelSold = calculateTotalFuelSold(pumpReadings, selectedTank)

      // Prepare before meter readings for storage
      const beforeMeterData = pumpReadings
        .filter(r => r.tankId === selectedTank && r.currentMeter)
        .map(r => ({
          assignmentId: r.assignmentId,
          nozzleId: r.nozzleId,
          meterReading: parseFloat(r.currentMeter)
        }))

      const response = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          tankId: selectedTank,
          invoiceQuantity: parseFloat(invoiceQuantity),
          supplier: finalSupplier,
          deliveryDate: deliveryTime.toISOString(),
          invoiceNumber: invoiceNumber || null,
          notes: notes || null,
          beforeDipReading: parseFloat(beforeDipReading),
          beforeDipTime: beforeDipTime.toISOString(),
          fuelSoldDuring: fuelSold,
          beforeMeterReadings: beforeMeterData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record delivery')
      }

      toast({
        title: "Success",
        description: "Delivery recorded successfully! Please verify with after dip."
      })

      // Reset form
      setSelectedTank('')
      setSupplier('')
      setCustomSupplier('')
      setInvoiceNumber('')
      setInvoiceQuantity('')
      setReceivedBy('')
      setNotes('')
      setBeforeDipReading('')
      setShowBeforeDip(false)
      setActiveShifts([])
      setPumpReadings([])

      // Reload and switch to pending tab
      loadData()
      setActiveTab('pending')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record delivery'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDelivery = async () => {
    if (!verifyingDelivery || !afterDipReading) {
      toast({
        title: "Error",
        description: "After dip reading is required",
        variant: "destructive"
      })
      return
    }

    setVerifyLoading(true)

    try {
      const additionalSold = calculateTotalFuelSold(afterPumpReadings, verifyingDelivery.tankId)

      const response = await fetch(`/api/deliveries/${verifyingDelivery.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          afterDipReading: parseFloat(afterDipReading),
          afterDipTime: afterDipTime.toISOString(),
          additionalFuelSold: additionalSold,
          verifiedBy: typeof window !== 'undefined' ? localStorage.getItem('username') || 'System User' : 'System User'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to verify delivery')
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: result.message || 'Delivery verified successfully!'
      })

      // Reset
      setVerifyingDelivery(null)
      setAfterDipDepth('')
      setAfterDipReading('')
      setAfterActiveShifts([])
      setAfterPumpReadings([])

      // Reload
      loadData()
      setActiveTab('verified')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify delivery'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setVerifyLoading(false)
    }
  }

  const columns: Column<Delivery>[] = [
    {
      key: 'deliveryDate' as keyof Delivery,
      title: 'Date & Time',
      render: (value: unknown) => {
        if (!value) return '-'
        return new Date(value as (string) || 0).toLocaleString()
      }
    },
    {
      key: 'tank' as keyof Delivery,
      title: 'Tank',
      render: (_: unknown, row: Delivery) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">Tank {row.tank?.tankNumber || 'N/A'}</span>
          {row.tank?.fuel && <Badge variant="outline" className="text-xs">{row.tank.fuel.icon} {row.tank.fuel.name}</Badge>}
        </div>
      )
    },
    {
      key: 'supplier' as keyof Delivery,
      title: 'Supplier',
      render: (value: unknown) => <span className="text-sm">{value as string}</span>
    },
    {
      key: 'invoiceQuantity' as keyof Delivery,
      title: 'Invoice Qty',
      render: (value: unknown) => {
        if (value == null) return '-'
        return <span>{(value as (number) || 0).toLocaleString()}L</span>
      }
    },
    {
      key: 'actualReceived' as keyof Delivery,
      title: 'Actual Received',
      render: (value: unknown) => {
        if (value == null) return <span className="text-muted-foreground">Pending</span>
        return <span className="font-semibold text-green-600">{(value as (number) || 0).toLocaleString()}L</span>
      }
    },
    {
      key: 'verificationStatus' as keyof Delivery,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (status === 'VERIFIED') return <Badge className="bg-green-600">Verified</Badge>
        if (status === 'DISCREPANCY') return <Badge variant="destructive">Discrepancy</Badge>
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Pending</Badge>
      }
    },
    {
      key: 'receivedBy' as keyof Delivery,
      title: 'Received By',
      render: (value: unknown) => <span className="text-sm text-muted-foreground">{value as string}</span>
    }
  ]

  const pendingDeliveries = deliveries.filter(d => d.verificationStatus === 'PENDING_VERIFICATION')
  const verifiedDeliveries = deliveries.filter(d => d.verificationStatus !== 'PENDING_VERIFICATION')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/tanks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8 text-orange-600" />
              Fuel Deliveries
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record and verify deliveries with before/after dip measurements
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}




      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new">New Delivery</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Verification
            {pendingDeliveries.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingDeliveries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verified">Verified Deliveries</TabsTrigger>
        </TabsList>

        {/* New Delivery Tab */}
        <TabsContent value="new" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Record New Delivery</CardTitle>
              <CardDescription>
                Record fuel deliveries with before-dip verification to ensure accurate inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordDelivery} className="space-y-6">
                {/* Basic Information */}
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Station Warning */}
                  {isAllStations && (
                    <div className="w-full flex items-center p-4 text-amber-800 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-4">
                      <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="font-medium">Please select a specific station from the top menu to record a delivery.</span>
                    </div>
                  )}

                  {!isAllStations && (
                    <>
                      <div className="w-full md:w-1/2">
                        <Label htmlFor="tank">Tank *</Label>
                        <Select value={selectedTank} onValueChange={setSelectedTank} disabled={loading}>
                          <SelectTrigger id="tank">
                            <SelectValue placeholder="Select tank" />
                          </SelectTrigger>
                          <SelectContent>
                            {tanks.filter(t => t.stationId === selectedStation).map((tank) => (
                              <SelectItem key={tank.id} value={tank.id}>
                                Tank {tank.tankNumber} - {tank.fuel?.icon} {tank.fuel?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="deliveryTime">Delivery Time *</Label>
                        <DateTimePicker
                          value={deliveryTime}
                          onChange={(date) => date && setDeliveryTime(date)}
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Supplier Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select value={supplier} onValueChange={setSupplier} disabled={loading}>
                      <SelectTrigger id="supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {supplier === 'Other' && (
                    <div>
                      <Label htmlFor="customSupplier">Custom Supplier *</Label>
                      <Input
                        id="customSupplier"
                        value={customSupplier}
                        onChange={(e) => setCustomSupplier(e.target.value)}
                        placeholder="Enter supplier name"
                        required={supplier === 'Other'}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="invoiceQuantity">Invoice Quantity (L) *</Label>
                    <Input
                      id="invoiceQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceQuantity}
                      onChange={(e) => setInvoiceQuantity(e.target.value)}
                      placeholder="Enter quantity from invoice"
                      className=""
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="receivedBy">Received By *</Label>
                    <Input
                      id="receivedBy"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Name of person receiving"
                      required
                    />
                  </div>
                </div>

                {/* Current Tank Level Display */}
                {selectedTank && (() => {
                  const tank = tanks.find(t => t.id === selectedTank)
                  if (tank) {
                    return (
                      <Card className="bg-orange-500/5 border-orange-500/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Current System Stock</div>
                              <div className="text-2xl font-bold">{(tank.currentLevel || 0).toLocaleString()}L</div>
                            </div>
                            <Droplets className="h-12 w-12 text-orange-600 opacity-20" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }
                  return null
                })()}

                {/* Before Dip Section */}
                {!showBeforeDip ? (
                  <Card className="border-orange-500/50 bg-orange-500/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Droplets className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-orange-600 mb-2">Step 1: Take Before Dip</h3>
                          <p className="text-sm text-orange-600/80 mb-4">
                            Before the delivery arrives, measure the physical tank level. This is the starting point for calculating actual received quantity.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-orange-500/30 hover:bg-orange-500/20"
                            onClick={handleTakeBeforeDip}
                            disabled={!selectedTank}
                          >
                            <Droplets className="mr-2 h-4 w-4" />
                            Take Before Dip Reading
                          </Button>
                          {!selectedTank && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Please select a tank first
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-600">
                          1
                        </div>
                        <div>
                          <CardTitle className="text-orange-600">Before Delivery Dip Reading</CardTitle>
                          <CardDescription>
                            Measured at: {(beforeDipTime || 0).toLocaleString()}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Active Shifts Check */}
                      {loadingShifts ? (
                        <div className="text-center py-4">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-600" />
                          <p className="text-sm text-muted-foreground">Checking for active shifts...</p>
                        </div>
                      ) : activeShifts.length > 0 ? (() => {
                        // Count shifts that have assignments for this tank
                        const shiftsForSelectedTank = activeShifts.filter(shift =>
                          shift.assignments.some(assignment => {
                            const reading = pumpReadings.find(r => r.assignmentId === assignment.id)
                            return reading && reading.tankId === selectedTank
                          })
                        )

                        if (shiftsForSelectedTank.length === 0) {
                          return (
                            <Alert className="border-green-500/50 bg-green-500/10">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-600">No Active Shifts for This Tank</AlertTitle>
                              <AlertDescription className="text-green-600">
                                No shifts running on this tank
                              </AlertDescription>
                            </Alert>
                          )
                        }

                        return (
                          <div className="space-y-3">
                            <Alert className="border-orange-500/50 bg-orange-500/10">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <AlertTitle className="text-orange-600">Shifts Active During Dip</AlertTitle>
                              <AlertDescription className="text-orange-600">
                                {shiftsForSelectedTank.length} shift(s) running on this tank. Enter current meter readings to account for fuel sold.
                              </AlertDescription>
                            </Alert>

                            {activeShifts.map((shift) => {
                              // Only show shift if it has assignments for this tank
                              const shiftsForThisTank = shift.assignments.filter(assignment => {
                                const reading = pumpReadings.find(r => r.assignmentId === assignment.id)
                                return reading && reading.tankId === selectedTank
                              })

                              if (shiftsForThisTank.length === 0) return null

                              return (
                                <Card key={shift.id} className="bg-background">
                                  <CardContent className="pt-4">
                                    <div className="font-medium mb-3 flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      {shift.template.name}
                                    </div>
                                    <div className="space-y-2">
                                      {shiftsForThisTank.map((assignment) => {
                                        const reading = pumpReadings.find(r => r.assignmentId === assignment.id)
                                        return (
                                          <div key={assignment.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                                            {/* Header: Pumper and Nozzle */}
                                            <div className="flex items-center justify-between pb-2 border-b">
                                              <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                                  <span className="font-bold text-orange-600 text-sm">{assignment.pumperName.charAt(0)}</span>
                                                </div>
                                                <div>
                                                  <div className="font-semibold">{assignment.pumperName}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {assignment.nozzle.tank.name} - Nozzle {assignment.nozzle.nozzleNumber}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-xs text-muted-foreground">Shift Opening</div>
                                                <div className="font-mono font-semibold text-sm">{(assignment.startMeterReading || 0).toLocaleString()}L</div>
                                              </div>
                                            </div>

                                            {/* Meter readings */}
                                            <div className="grid grid-cols-2 gap-3">
                                              <div>
                                                <Label htmlFor={`before-${assignment.id}`} className="text-xs text-muted-foreground">Current Meter (Before Dip) *</Label>
                                                <Input
                                                  id={`before-${assignment.id}`}
                                                  type="number"
                                                  step="0.01"
                                                  min={assignment.startMeterReading}
                                                  value={reading?.currentMeter || ''}
                                                  onChange={(e) => handleMeterChange(assignment.id, e.target.value, true)}
                                                  placeholder="Enter current reading"
                                                  className="font-mono h-9"
                                                />
                                              </div>
                                              <div>
                                                <Label className="text-xs text-muted-foreground">Fuel Sold So Far</Label>
                                                <div className={`h-9 flex items-center font-mono font-semibold text-lg ${reading?.fuelUsed && reading.fuelUsed > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                                  {reading?.fuelUsed && reading.fuelUsed > 0 ? `${(reading.fuelUsed || 0).toLocaleString()}L` : '-'}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Shift Total:</span>
                                        <span className="font-mono font-semibold">{
                                          shiftsForThisTank
                                            .map(a => pumpReadings.find(r => r.assignmentId === a.id))
                                            .filter(r => r && r.tankId === selectedTank)
                                            .reduce((sum, r) => sum + (r?.fuelUsed || 0), 0)
                                            .toLocaleString()
                                        }L</span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                            <div className="mt-4 pt-3 border-t">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">Total Fuel Sold:</span>
                                <span className="font-mono font-bold text-lg">{calculateTotalFuelSold(pumpReadings, (selectedTank) || 0).toLocaleString()}L</span>
                              </div>
                            </div>
                          </div>
                        )
                      })() : (
                        <Alert className="border-green-500/50 bg-green-500/10">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-600">No Active Shifts</AlertTitle>
                          <AlertDescription className="text-green-600">
                            No shifts running - system stock is accurate.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Dip Reading Input */}
                      <div className="pt-2">
                        {(() => {
                          const tank = tanks.find(t => t.id === selectedTank)
                          if (!tank) return null

                          const tankCapacity = tank.capacity as 9000 | 15000 | 22500
                          const maxDepth = getMaxDepth(tankCapacity)

                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="beforeDipDepth" className="text-base font-semibold">Liquid Depth (cm) *</Label>
                                <Input
                                  id="beforeDipDepth"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max={maxDepth}
                                  value={beforeDipDepth}
                                  onChange={(e) => {
                                    const depth = e.target.value
                                    setBeforeDipDepth(depth)

                                    if (depth && parseFloat(depth) > 0) {
                                      const validation = validateDepth(parseFloat(depth), tankCapacity)
                                      if (validation.valid) {
                                        const volume = depthToVolume(parseFloat(depth), tankCapacity)
                                        setBeforeDipReading(volume.toString())
                                      }
                                    } else {
                                      setBeforeDipReading('')
                                    }
                                  }}
                                  placeholder="Enter depth from dipstick"
                                  required
                                  className="mt-2"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                  Using {getTankCapacityLabel(tankCapacity)} chart (max: {maxDepth}cm)
                                </p>
                              </div>

                              <div>
                                <Label htmlFor="beforeDipReading" className="text-base font-semibold">Calculated Volume (Litres)</Label>
                                <Input
                                  id="beforeDipReading"
                                  type="text"
                                  value={beforeDipReading ? (parseFloat(beforeDipReading) || 0).toLocaleString() : ''}
                                  disabled
                                  placeholder="Auto-calculated from depth"
                                  className="mt-2 bg-muted"
                                />
                                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-2">
                                  {beforeDipDepth && beforeDipReading ? (
                                    <span className="text-green-600 font-semibold">
                                      ✓ {beforeDipDepth}cm = {(parseFloat(beforeDipReading) || 0).toLocaleString()}L
                                    </span>
                                  ) : (
                                    <>
                                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>Automatically calculated from depth measurement</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Variance Check */}
                      {beforeDipReading && selectedTank && (() => {
                        const tank = tanks.find(t => t.id === selectedTank)
                        if (!tank) return null

                        const fuelSoldBeforeDip = calculateTotalFuelSold(pumpReadings, selectedTank)
                        const expectedLevel = tank.currentLevel - fuelSoldBeforeDip
                        // Calculate expected depth from expected level
                        const tankCapacity = tank.capacity as TankCapacity
                        const expectedDepth = volumeToDepth(expectedLevel, tankCapacity)

                        const physicalDip = parseFloat(beforeDipReading)
                        const physicalDepth = parseFloat(beforeDipDepth)

                        const variance = physicalDip - expectedLevel
                        const depthVariance = physicalDepth - expectedDepth


                        return (
                          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                            <div className="font-semibold mb-3 text-sm text-muted-foreground">Before Dip Variance Check:</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span>System Stock (Current):</span>
                                <span className="font-semibold">{(tank.currentLevel || 0).toLocaleString()}L</span>
                              </div>
                              <div className="flex justify-between items-center text-orange-600">
                                <span>- Fuel Sold Before Dip:</span>
                                <span className="font-semibold">-{(fuelSoldBeforeDip || 0).toLocaleString()}L</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t font-semibold">
                                <span>Expected Level:</span>
                                <span className="text-orange-600">
                                  {(expectedLevel || 0).toLocaleString()}L
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (~{expectedDepth.toFixed(1)}cm)
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Physical Dip:</span>
                                <span className="text-green-600 font-semibold">{(physicalDip || 0).toLocaleString()}L</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t font-bold">
                                <span>Variance:</span>
                                <span className={`text-lg ${Math.abs(depthVariance) <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                  {variance > 0 ? '+' : ''}{variance.toFixed(1)}L
                                  <span className="text-sm ml-1">
                                    / {depthVariance > 0 ? '+' : ''}{depthVariance.toFixed(1)}cm
                                  </span>
                                </span>
                              </div>
                            </div>

                            {Math.abs(depthVariance) > 1 && (
                              <Alert className="mt-3 border-red-500/50 bg-red-500/10">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertTitle className="text-red-600">High Variance Detected</AlertTitle>
                                <AlertDescription className="text-red-600">
                                  Physical dip varies by {Math.abs(depthVariance).toFixed(1)}cm (Limit: 1.0cm).
                                  {variance > 0
                                    ? ' Possible meter error or unrecorded sales.'
                                    : ' Possible leak, theft, or meter error.'
                                  }
                                </AlertDescription>
                              </Alert>
                            )}

                            {Math.abs(depthVariance) <= 1 && (
                              <Alert className="mt-3 border-green-500/50 bg-green-500/10">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-600">Within Tolerance</AlertTitle>
                                <AlertDescription className="text-green-600">
                                  Variance is within acceptable limit (1cm).
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Notes Section */}
                {showBeforeDip && (
                  <div>
                    <Label htmlFor="notes" className="text-base font-semibold">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about the delivery (e.g., truck number, driver name, weather conditions)"
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/tanks')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !beforeDipReading}
                  >
                    {loading ? 'Recording...' : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Delivery
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Verification Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Verification</CardTitle>
              <CardDescription>Deliveries awaiting after-dip verification and tank update</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDeliveries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deliveries pending verification</p>
                  <p className="text-sm mt-2">Verified deliveries will appear in the &quot;Verified Deliveries&quot; tab</p>
                </div>
              ) : (
                <>
                  <Alert className="mb-4 border-orange-500/50 bg-orange-500/10">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-600">Action Required</AlertTitle>
                    <AlertDescription className="text-orange-600">
                      These deliveries need after-dip verification. Click on a delivery to complete verification.
                    </AlertDescription>
                  </Alert>
                  <DataTable
                    data={pendingDeliveries}
                    columns={columns}
                    onRowClick={(delivery) => {
                      setVerifyingDelivery(delivery)
                      setAfterDipTime(new Date())
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verified Tab */}
        <TabsContent value="verified">
          <Card>
            <CardHeader>
              <CardTitle>Verified Deliveries</CardTitle>
              <CardDescription>Completed delivery verifications with final calculations</CardDescription>
            </CardHeader>
            <CardContent>
              {verifiedDeliveries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No verified deliveries yet</p>
                </div>
              ) : (
                <DataTable
                  data={verifiedDeliveries}
                  columns={columns}
                  onRowClick={(delivery) => {
                    setSelectedDelivery(delivery)
                    setShowDetails(true)
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Verification Dialog */}
      <Dialog open={!!verifyingDelivery} onOpenChange={() => setVerifyingDelivery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify Delivery - After Dip</DialogTitle>
            <DialogDescription>
              Complete verification by taking after-dip reading to calculate actual received quantity
            </DialogDescription>
          </DialogHeader>

          {verifyingDelivery && (
            <div className="space-y-5">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <div className="text-sm text-muted-foreground">Tank</div>
                  <div className="font-semibold">Tank {verifyingDelivery.tank?.tankNumber} - {verifyingDelivery.tank?.fuel?.icon} {verifyingDelivery.tank?.fuel?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Supplier</div>
                  <div className="font-semibold">{verifyingDelivery.supplier}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Quantity</div>
                  <div className="font-mono font-bold text-xl">{(verifyingDelivery.invoiceQuantity || 0).toLocaleString()}L</div>
                </div>
              </div>

              {/* Step 1: Before Delivery - Info Card */}
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <CardTitle className="text-orange-600">Before Delivery</CardTitle>
                      <CardDescription>Recorded when delivery truck arrived</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Tank</div>
                      <div className="font-semibold">Tank {verifyingDelivery.tank?.tankNumber}</div>
                      <div className="text-sm text-muted-foreground">{verifyingDelivery.tank?.fuel?.icon} {verifyingDelivery.tank?.fuel?.name}</div>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Before Dip Reading</div>
                      <div className="font-mono text-orange-600">{(verifyingDelivery.beforeDipReading || 0).toLocaleString()}L</div>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Fuel Sold (Before Dip)</div>
                      <div className="font-mono font-bold text-xl text-orange-600">{(verifyingDelivery.fuelSoldDuring || 0).toLocaleString()}L</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Fuel Sold During Delivery */}
              {loadingShifts ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-muted-foreground">Checking for active shifts...</p>
                </div>
              ) : afterActiveShifts.length > 0 ? (() => {
                // Count shifts that have assignments for this tank
                const shiftsForSelectedTank = afterActiveShifts.filter(shift =>
                  shift.assignments.some(assignment => {
                    const reading = afterPumpReadings.find(r => r.assignmentId === assignment.id)
                    return reading && reading.tankId === verifyingDelivery.tankId
                  })
                )

                if (shiftsForSelectedTank.length === 0) {
                  return (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">No Active Shifts</AlertTitle>
                      <AlertDescription className="text-green-600">
                        No shifts running - no fuel sold during delivery
                      </AlertDescription>
                    </Alert>
                  )
                }

                return (
                  <Alert className="border-orange-500/50 bg-orange-500/10">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-600">Shifts Still Running</AlertTitle>
                    <AlertDescription>
                      <p className="text-orange-600 mb-3">
                        {shiftsForSelectedTank.length} shift(s) running on this tank. Enter current meter readings to calculate fuel sold while delivering
                      </p>
                      <div className="space-y-3">
                        {afterActiveShifts.map((shift) => {
                          // Only show shift if it has assignments for this tank
                          const shiftsForThisTank = shift.assignments.filter(assignment => {
                            const reading = afterPumpReadings.find(r => r.assignmentId === assignment.id)
                            return reading && reading.tankId === verifyingDelivery.tankId
                          })

                          if (shiftsForThisTank.length === 0) return null

                          return (
                            <div key={shift.id} className="border rounded p-3 bg-background">
                              <div className="font-medium mb-2 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {shift.template.name}
                              </div>
                              <div className="space-y-2">
                                {shiftsForThisTank.map((assignment) => {
                                  const reading = afterPumpReadings.find(r => r.assignmentId === assignment.id)

                                  // Get before dip meter from stored data
                                  const beforeMeterData = verifyingDelivery.beforeMeterReadings
                                  let beforeDipMeter = assignment.startMeterReading

                                  if (beforeMeterData && Array.isArray(beforeMeterData)) {
                                    const stored = beforeMeterData.find(m => m.assignmentId === assignment.id)
                                    if (stored && stored.meterReading) {
                                      beforeDipMeter = stored.meterReading
                                    }
                                  }

                                  return (
                                    <div key={assignment.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                                      {/* Header: Pumper and Nozzle */}
                                      <div className="flex items-center justify-between pb-2 border-b">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                                            <span className="font-bold text-orange-600 text-sm">{assignment.pumperName.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <div className="font-semibold">{assignment.pumperName}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {assignment.nozzle.tank.name} - Nozzle {assignment.nozzle.nozzleNumber}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-xs text-muted-foreground">Before Dip Meter</div>
                                          <div className="font-semibold text-orange-600">{(beforeDipMeter || 0).toLocaleString()}L</div>
                                        </div>
                                      </div>

                                      {/* Meter readings */}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label htmlFor={`after-${assignment.id}`} className="text-xs text-muted-foreground">Current Meter (After Dip) *</Label>
                                          <Input
                                            id={`after-${assignment.id}`}
                                            type="number"
                                            step="0.01"
                                            min={beforeDipMeter}
                                            value={reading?.currentMeter || ''}
                                            onChange={(e) => handleMeterChange(assignment.id, e.target.value, false, beforeDipMeter)}
                                            placeholder="Enter current reading"
                                            className="h-9"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Sold While Delivering</Label>
                                          <div className={`h-9 flex items-center font-semibold text-lg ${reading?.fuelUsed && reading.fuelUsed > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                            {reading?.fuelUsed && reading.fuelUsed > 0 ? `${(reading.fuelUsed || 0).toLocaleString()}L` : '-'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Shift Total:</span>
                                  <span className="font-semibold">{
                                    shiftsForThisTank
                                      .map(a => afterPumpReadings.find(r => r.assignmentId === a.id))
                                      .filter(r => r && r.tankId === verifyingDelivery.tankId)
                                      .reduce((sum, r) => sum + (r?.fuelUsed || 0), 0)
                                      .toLocaleString()
                                  }L</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-4 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total Fuel Sold:</span>
                          <span className="font-bold text-lg">{calculateTotalFuelSold(afterPumpReadings, (verifyingDelivery.tankId) || 0).toLocaleString()}L</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )
              })() : (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">No Active Shifts</AlertTitle>
                  <AlertDescription className="text-green-600">
                    No shifts running - no fuel sold during delivery
                  </AlertDescription>
                </Alert>
              )}

              {/* Step 3: After Delivery */}
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <CardTitle className="text-green-600">After Delivery Complete</CardTitle>
                      <CardDescription>Tank level after fuel has been loaded</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const tankCapacity = (verifyingDelivery.tank?.capacity || 9000) as 9000 | 15000 | 22500
                    const maxDepth = getMaxDepth(tankCapacity)

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="afterDipDepth" className="text-base font-semibold">Liquid Depth (cm) *</Label>
                          <Input
                            id="afterDipDepth"
                            type="number"
                            step="0.1"
                            min="0"
                            max={maxDepth}
                            value={afterDipDepth}
                            onChange={(e) => {
                              const depth = e.target.value
                              setAfterDipDepth(depth)

                              if (depth && parseFloat(depth) > 0) {
                                const validation = validateDepth(parseFloat(depth), tankCapacity)
                                if (validation.valid) {
                                  const volume = depthToVolume(parseFloat(depth), tankCapacity)
                                  setAfterDipReading(volume.toString())
                                }
                              } else {
                                setAfterDipReading('')
                              }
                            }}
                            placeholder="Enter depth from dipstick"
                            required
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Using {getTankCapacityLabel(tankCapacity)} chart (max: {maxDepth}cm)
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="afterDipReading" className="text-base font-semibold">Calculated Volume (Litres)</Label>
                          <Input
                            id="afterDipReading"
                            type="text"
                            value={afterDipReading ? (parseFloat(afterDipReading) || 0).toLocaleString() : ''}
                            disabled
                            placeholder="Auto-calculated from depth"
                            className="mt-2 bg-muted"
                          />
                          <p className="text-xs text-muted-foreground mt-2 flex items-start gap-2">
                            {afterDipDepth && afterDipReading ? (
                              <span className="text-green-600 font-semibold">
                                ✓ {afterDipDepth}cm = {(parseFloat(afterDipReading) || 0).toLocaleString()}L
                              </span>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>Measure after delivery truck has finished loading</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Verification Calculation */}
              {afterDipReading && verifyingDelivery.beforeDipReading && (() => {
                const fuelSoldDuring = calculateTotalFuelSold(afterPumpReadings, verifyingDelivery.tankId)
                const actualReceived = parseFloat(afterDipReading) - verifyingDelivery.beforeDipReading + fuelSoldDuring
                const variance = actualReceived - verifyingDelivery.invoiceQuantity
                const variancePercent = (Math.abs(variance) / verifyingDelivery.invoiceQuantity) * 100



                return (
                  <Card className="bg-orange-500/5 border-orange-500/30">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <CardTitle className="text-orange-600">Verification & Stock Update</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-5">
                        {/* Expected Stock Calculation */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <div className="font-semibold mb-3 text-sm text-muted-foreground">Expected Stock Calculation:</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span>Before Dip Reading:</span>
                              <span className="font-semibold">{(verifyingDelivery.beforeDipReading || 0).toLocaleString()}L</span>
                            </div>
                            <div className="flex justify-between items-center text-green-600">
                              <span>+ Invoice Quantity:</span>
                              <span className="font-mono font-semibold">+{(verifyingDelivery.invoiceQuantity || 0).toLocaleString()}L</span>
                            </div>
                            <div className="flex justify-between items-center text-orange-600">
                              <span>- Fuel Sold During Delivery:</span>
                              <span className="font-mono font-semibold">-{(fuelSoldDuring || 0).toLocaleString()}L</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t font-bold text-base">
                              <span>Expected After Dip:</span>
                              <span className="font-mono text-orange-600">{(verifyingDelivery.beforeDipReading + verifyingDelivery.invoiceQuantity - (fuelSoldDuring) || 0).toLocaleString()}L</span>
                            </div>
                          </div>
                        </div>

                        {/* Physical Dip vs Expected */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                            <div className="text-xs text-muted-foreground mb-1">After Dip (Physical)</div>
                            <div className="font-mono font-bold text-2xl text-green-600">{(parseFloat(afterDipReading) || 0).toLocaleString()}L</div>
                          </div>
                          <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                            <div className="text-xs text-muted-foreground mb-1">Expected After Dip</div>
                            <div className="font-mono font-bold text-2xl text-orange-600">{(verifyingDelivery.beforeDipReading + verifyingDelivery.invoiceQuantity - (fuelSoldDuring) || 0).toLocaleString()}L</div>
                          </div>
                        </div>

                        {/* Actual Received Calculation */}
                        <div className="bg-orange-500/10 p-4 rounded-lg border-2 border-orange-500/30">
                          <div className="text-sm font-semibold text-muted-foreground mb-3">Actual Quantity Received:</div>
                          <div className="space-y-1 text-sm mb-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">After Dip:</span>
                              <span className="font-mono">{(parseFloat(afterDipReading) || 0).toLocaleString()}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Before Dip:</span>
                              <span className="font-mono">-{(verifyingDelivery.beforeDipReading || 0).toLocaleString()}L</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fuel Sold During:</span>
                              <span className="font-mono">+{(fuelSoldDuring || 0).toLocaleString()}L</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                            <span className="font-bold">Actual Received:</span>
                            <span className="font-mono font-bold text-3xl text-orange-600">{(actualReceived || 0).toLocaleString()}L</span>
                          </div>
                        </div>

                        {/* Variance from Invoice */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-background rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Invoice Quantity</div>
                            <div className="font-mono font-bold text-xl">{(verifyingDelivery.invoiceQuantity || 0).toLocaleString()}L</div>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Variance from Invoice</div>
                            <div className={`font-mono font-bold text-xl ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(1)}L
                              <span className="text-sm ml-1">({variancePercent.toFixed(2)}%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyingDelivery(null)} disabled={verifyLoading}>
              Cancel
            </Button>
            <Button onClick={handleVerifyDelivery} disabled={verifyLoading || !afterDipReading}>
              {verifyLoading ? 'Verifying...' : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify & Update Tank
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>Complete delivery verification information</DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tank</Label>
                  <div className="font-semibold">Tank {selectedDelivery.tank?.tankNumber} - {selectedDelivery.tank?.fuel?.icon} {selectedDelivery.tank?.fuel?.name}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Supplier</Label>
                  <div className="font-semibold">{selectedDelivery.supplier}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Invoice Quantity</Label>
                  <div className="font-mono font-semibold">{(selectedDelivery.invoiceQuantity || 0).toLocaleString()}L</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual Received</Label>
                  <div className="font-mono font-semibold text-green-600">{(selectedDelivery.actualReceived || 0).toLocaleString()}L</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Before Dip</Label>
                  <div className="font-mono">{(selectedDelivery.beforeDipReading || 0).toLocaleString()}L</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">After Dip</Label>
                  <div className="font-mono">{(selectedDelivery.afterDipReading || 0).toLocaleString()}L</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fuel Sold During</Label>
                  <div className="font-mono text-orange-600">{(selectedDelivery.fuelSoldDuring || 0).toLocaleString()}L</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Variance</Label>
                  <div className={`font-mono font-semibold ${selectedDelivery.dipVariance && Math.abs(selectedDelivery.dipVariance) > 50
                    ? 'text-red-600'
                    : 'text-green-600'
                    }`}>
                    {selectedDelivery.dipVariance != null
                      ? `${selectedDelivery.dipVariance > 0 ? '+' : ''}${selectedDelivery.dipVariance.toFixed(1)}L`
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Received By</Label>
                  <div>{selectedDelivery.receivedBy}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Verified By</Label>
                  <div>{selectedDelivery.verifiedBy || '-'}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>
                    {selectedDelivery.verificationStatus === 'VERIFIED' && <Badge className="bg-green-600">Verified</Badge>}
                    {selectedDelivery.verificationStatus === 'DISCREPANCY' && <Badge variant="destructive">Discrepancy</Badge>}
                    {selectedDelivery.verificationStatus === 'PENDING_VERIFICATION' && <Badge variant="outline">Pending</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
