'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, AlertCircle, ArrowLeft, Ruler, Calculator, Fuel, ShieldCheck, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormCard } from '@/components/ui/FormCard'

interface Tank {
  id: string
  tankNumber: string
  fuel: {
    name: string
    category: string
  }
}

export default function TolerancePage() {
  const router = useRouter()
  const { stations, fetchStations, selectedStation } = useStation()

  const [deliveryToleranceCm, setDeliveryToleranceCm] = useState<number>(2)
  const [salesTolerance, setSalesTolerance] = useState<number>(20)
  const [updatingStation, setUpdatingStation] = useState(false)

  const [tanks, setTanks] = useState<Tank[]>([])

  const { toast } = useToast()

  const fetchTanks = useCallback(async () => {
    if (!selectedStation || selectedStation === 'all') {
      setTanks([])
      return
    }

    try {
      const response = await fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
      if (response.ok) {
        const data = await response.json()
        setTanks(data)
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch station tanks",
        variant: "destructive"
      })
    }
  }, [selectedStation, toast])

  useEffect(() => {
    if (selectedStation && selectedStation !== 'all') {
      const station = stations.find(s => s.id === selectedStation)
      if (station) {
        setDeliveryToleranceCm(station.deliveryToleranceCm || 2)
        setSalesTolerance(station.salesTolerance || 20)
      }
    }
    fetchTanks()
  }, [selectedStation, stations, fetchTanks])

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStation || selectedStation === 'all') return

    setUpdatingStation(true)
    try {
      const response = await fetch(`/api/stations/${selectedStation}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryToleranceCm, salesTolerance })
      })

      if (!response.ok) throw new Error('Failed to update station configuration')

      toast({
        title: "Success",
        description: "Station tolerances updated successfully"
      })

      if (typeof fetchStations === 'function') fetchStations()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update station tolerances",
        variant: "destructive"
      })
    } finally {
      setUpdatingStation(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Tolerance Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure reconciliation buffers and delivery thresholds for the selected station.
            </p>
          </div>
        </div>
      </div>

      {selectedStation === 'all' ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="p-4 bg-background rounded-full shadow-sm border mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Select a Station</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">
              Please choose a specific station from the global picker above to configure its tolerances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Station Threshold</CardTitle>
                <Ruler className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveryToleranceCm.toFixed(2)} cm</div>
                <p className="text-xs text-muted-foreground mt-1">Global dip variance limit</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Variance</CardTitle>
                <Calculator className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(salesTolerance)}</div>
                <p className="text-xs text-muted-foreground mt-1">Acceptable buffer per shift</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tanks</CardTitle>
                <Fuel className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tanks.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Found in this station</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tank Delivery Section */}
            <FormCard
              title="Dip Measurement Threshold"
              description="Specify accepted variance for fuel delivery verification calculations."
              className="h-full flex flex-col"
            >
              <form onSubmit={handleStationSubmit} className="flex flex-col flex-1 justify-between">
                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <Label htmlFor="tankTolerance" className="text-sm font-semibold">Depth Threshold (CM)</Label>
                    <Select
                      value={deliveryToleranceCm.toString()}
                      onValueChange={(val) => setDeliveryToleranceCm(parseInt(val))}
                    >
                      <SelectTrigger id="tankTolerance" className="w-full">
                        <SelectValue placeholder="Select depth" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1.00 cm</SelectItem>
                        <SelectItem value="2">2.00 cm</SelectItem>
                        <SelectItem value="3">3.00 cm</SelectItem>
                        <SelectItem value="4">4.00 cm</SelectItem>
                        <SelectItem value="5">5.00 cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border flex gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Calculated Estimation</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For a standard 15kL underground vessel, a <span className="font-semibold text-foreground">{deliveryToleranceCm}cm</span> reading variance equates to roughly <span className="font-semibold text-foreground">{deliveryToleranceCm * 60} Liters</span>. This is applied globally to this station during delivery intake.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t">
                  <Button type="submit" disabled={updatingStation}>
                    <Save className="mr-2 h-4 w-4" />
                    {updatingStation ? 'Applying...' : 'Apply Threshold'}
                  </Button>
                </div>
              </form>
            </FormCard>

            {/* Shift Sales Section */}
            <FormCard
              title="Station Sales Variance"
              description="Configure distinct acceptable financial shift reconciliation buffers per station."
              className="h-full flex flex-col"
            >
              <div className="flex flex-col flex-1 justify-between">
                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <Label htmlFor="stationVariance" className="text-sm font-semibold">Amount Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <MoneyInput
                        value={salesTolerance || 0}
                        onChange={(val) => setSalesTolerance(val)}
                        placeholder="0.00"
                        id="stationVariance"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border flex gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Flat Amount Setting</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        This limit determines the acceptable variance on financial values when closing a shift. Shifts with discrepancies above this buffer will trigger warnings or deduct from pumper liabilities depending on config.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t">
                  <Button
                    onClick={handleStationSubmit}
                    disabled={updatingStation}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updatingStation ? 'Saving...' : 'Save Buffers'}
                  </Button>
                </div>
              </div>
            </FormCard>
          </div>

          {/* Corporate Summary & Compliance Footer */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="p-3 bg-background rounded-full shadow-sm border mt-1 sm:mt-0">
                  <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Action Audit Trail</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
                    Every tolerance modification is recorded in the permanent security audit log. These thresholds directly influence financial reconciliation accuracy and automated inventory health indicators. Ensure all changes comply with company standards.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
