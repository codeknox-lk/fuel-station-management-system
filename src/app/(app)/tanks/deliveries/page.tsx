'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { depthToVolume, TankCapacity } from '@/lib/tank-calibration'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Truck, Plus, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
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
  verificationStatus: string
  deliveryDate: string
  receivedBy: string
  verifiedBy?: string
  createdAt: string
  invoiceVariance?: number
  dipVariance?: number
}

export default function TankDeliveriesPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const { toast } = useToast()

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [activeTab, setActiveTab] = useState('pending')
  const [deleting, setDeleting] = useState(false)

  // Details dialog state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Load deliveries
  const loadData = useCallback(async () => {
    try {
      // Fetch deliveries - add station filter if selected
      const url = selectedStation
        ? `/api/deliveries?stationId=${selectedStation}&limit=50`
        : '/api/deliveries?limit=50'

      const deliveriesRes = await fetch(url)
      if (deliveriesRes.ok) {
        const deliveriesData = await deliveriesRes.json()
        setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : [])
      } else {
        throw new Error('Failed to fetch deliveries')
      }
    } catch (error) {
      console.error('Failed to load data', error)
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive"
      })
      setDeliveries([])
    }
  }, [toast, selectedStation])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Delete delivery handler
  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!confirm('Are you sure you want to delete this pending delivery? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete delivery')
      }

      toast({
        title: "Success",
        description: "Delivery deleted successfully"
      })

      // Reload data
      await loadData()
    } catch (error) {
      console.error('Failed to delete delivery:', error)
      toast({
        title: "Error",
        description: "Failed to delete delivery",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
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

  // Columns for pending deliveries (with delete button)
  const pendingColumns: Column<Delivery>[] = [
    ...columns,
    {
      key: 'actions' as keyof Delivery,
      title: 'Actions',
      render: (_: unknown, row: Delivery) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/tanks/deliveries/${row.id}/verify`)}
            disabled={deleting}
          >
            Verify
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteDelivery(row.id)}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      )
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/tanks/deliveries/new')} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            New Delivery
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending Verification
            {pendingDeliveries.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingDeliveries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verified">Verified Deliveries</TabsTrigger>
        </TabsList>

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
                    columns={pendingColumns}
                    onRowClick={(delivery) => {
                      router.push(`/tanks/deliveries/${delivery.id}/verify`)
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
                  <div className="font-mono">
                    {selectedDelivery.beforeDipReading?.toLocaleString()} cm
                    {selectedDelivery.tank?.capacity && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (≈ {depthToVolume(selectedDelivery.beforeDipReading || 0, selectedDelivery.tank.capacity as TankCapacity).toLocaleString()} L)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">After Dip</Label>
                  <div className="font-mono">
                    {selectedDelivery.afterDipReading?.toLocaleString()} cm
                    {selectedDelivery.tank?.capacity && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        (≈ {depthToVolume(selectedDelivery.afterDipReading || 0, selectedDelivery.tank.capacity as TankCapacity).toLocaleString()} L)
                      </span>
                    )}
                  </div>
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
