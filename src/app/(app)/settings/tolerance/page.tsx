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
  const [maxDipVariancePercent, setMaxDipVariancePercent] = useState<number>(2)
  const [maxDipVarianceLiters, setMaxDipVarianceLiters] = useState<number>(200)
  const [allowedShiftVariance, setAllowedShiftVariance] = useState<number>(1.5)
  const [tankWarningThreshold, setTankWarningThreshold] = useState<number>(20)
  const [tankCriticalThreshold, setTankCriticalThreshold] = useState<number>(10)
  const [creditOverdueDays, setCreditOverdueDays] = useState<number>(14)
  const [maxShiftDurationHours, setMaxShiftDurationHours] = useState<number>(24)
  const [defaultShopReorderLevel, setDefaultShopReorderLevel] = useState<number>(5)
  const [maxWaterIngressMm, setMaxWaterIngressMm] = useState<number>(50)
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
        setDeliveryToleranceCm(station.deliveryToleranceCm ?? 2)
        setSalesTolerance(station.salesTolerance ?? 20)
        setMaxDipVariancePercent(station.maxDipVariancePercent ?? 2)
        setMaxDipVarianceLiters(station.maxDipVarianceLiters ?? 200)
        setAllowedShiftVariance(station.allowedShiftVariance ?? 1.5)
        setTankWarningThreshold(station.tankWarningThreshold ?? 20)
        setTankCriticalThreshold(station.tankCriticalThreshold ?? 10)
        setCreditOverdueDays(station.creditOverdueDays ?? 14)
        setMaxShiftDurationHours(station.maxShiftDurationHours ?? 24)
        setDefaultShopReorderLevel(station.defaultShopReorderLevel ?? 5)
        setMaxWaterIngressMm(station.maxWaterIngressMm ?? 50)
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
        body: JSON.stringify({
          deliveryToleranceCm,
          salesTolerance,
          maxDipVariancePercent,
          maxDipVarianceLiters,
          allowedShiftVariance,
          tankWarningThreshold,
          tankCriticalThreshold,
          creditOverdueDays,
          maxShiftDurationHours,
          defaultShopReorderLevel,
          maxWaterIngressMm
        })
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tank Delivery Section */}
            <FormCard
              title="Delivery Intake Threshold"
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
              title="Shift Financial Variance"
              description="Configure distinct acceptable financial shift reconciliation buffers per station."
              className="h-full flex flex-col"
            >
              <div className="flex flex-col flex-1 justify-between">
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="stationVariance" className="text-sm font-semibold">Flat Amount Buffer</Label>
                      <MoneyInput
                        value={salesTolerance || 0}
                        onChange={(val) => setSalesTolerance(val)}
                        placeholder="0.00"
                        id="stationVariance"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="allowedShiftVariance" className="text-sm font-semibold">Percentage Buffer (%)</Label>
                      <div className="relative">
                        <input
                          id="allowedShiftVariance"
                          title="Percentage Buffer"
                          placeholder="1.5"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={allowedShiftVariance}
                          onChange={(e) => setAllowedShiftVariance(parseFloat(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                          %
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border flex gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Reconciliation Rule</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        A shift variance triggers a warning if it exceeds <strong>BOTH</strong> the flat amount and the percentage buffer.
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

            {/* Daily Dip Tolerance Section */}
            <FormCard
              title="Daily Dip Variance (EOD)"
              description="Configure margins of error allowed when checking daily tank dips against book stock."
              className="h-full flex flex-col lg:col-span-2"
            >
              <div className="flex flex-col flex-1 justify-between">
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="maxDipVariancePercent" className="text-sm font-semibold">Percentage Tolerance (%)</Label>
                      <div className="relative">
                        <input
                          id="maxDipVariancePercent"
                          title="Percentage Tolerance"
                          placeholder="2.0"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={maxDipVariancePercent}
                          onChange={(e) => setMaxDipVariancePercent(parseFloat(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                          %
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="maxDipVarianceLiters" className="text-sm font-semibold">Minimum Volume Tolerance (Liters)</Label>
                      <div className="relative">
                        <input
                          id="maxDipVarianceLiters"
                          title="Minimum Volume Tolerance"
                          placeholder="200"
                          type="number"
                          step="1"
                          min="0"
                          value={maxDipVarianceLiters}
                          onChange={(e) => setMaxDipVarianceLiters(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                          Ltr
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border flex gap-3">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Dip Tolerance Rules</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        The system allows a discrepancy between Book Stock and Physical Dip Stock up to the greater of <strong>{maxDipVariancePercent}%</strong> or <strong>{maxDipVarianceLiters} L</strong>. If exactly within half of this buffer, it marks as NORMAL. Above half is a WARNING, and exceeding the total limit raises a CRITICAL alert.
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
                    {updatingStation ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            </FormCard>

            {/* System Alert Thresholds Section */}
            <FormCard
              title="System Alert Thresholds"
              description="Configure automatic notification triggers and operational limits."
              className="h-full flex flex-col lg:col-span-2"
            >
              <div className="flex flex-col flex-1 justify-between">
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="tankWarningThreshold" className="text-sm font-semibold">Tank Warning Level (%)</Label>
                      <div className="relative">
                        <input
                          id="tankWarningThreshold"
                          title="Tank Warning Threshold"
                          placeholder="20"
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={tankWarningThreshold}
                          onChange={(e) => setTankWarningThreshold(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">%</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="tankCriticalThreshold" className="text-sm font-semibold">Tank Critical Level (%)</Label>
                      <div className="relative">
                        <input
                          id="tankCriticalThreshold"
                          title="Tank Critical Threshold"
                          placeholder="10"
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={tankCriticalThreshold}
                          onChange={(e) => setTankCriticalThreshold(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">%</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="creditOverdueDays" className="text-sm font-semibold">Credit Overdue Terms (Days)</Label>
                      <div className="relative">
                        <input
                          id="creditOverdueDays"
                          title="Credit Overdue Days"
                          placeholder="14"
                          type="number"
                          step="1"
                          min="0"
                          value={creditOverdueDays}
                          onChange={(e) => setCreditOverdueDays(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="maxShiftDurationHours" className="text-sm font-semibold">Max Shift Length (Hours)</Label>
                      <div className="relative">
                        <input
                          id="maxShiftDurationHours"
                          title="Max Shift Duration"
                          placeholder="24"
                          type="number"
                          step="1"
                          min="1"
                          max="72"
                          value={maxShiftDurationHours}
                          onChange={(e) => setMaxShiftDurationHours(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">Hrs</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="defaultShopReorderLevel" className="text-sm font-semibold">Default Shop Reorder Level</Label>
                      <div className="relative">
                        <input
                          id="defaultShopReorderLevel"
                          title="Default Shop Reorder Level"
                          placeholder="5"
                          type="number"
                          step="1"
                          min="0"
                          value={defaultShopReorderLevel}
                          onChange={(e) => setDefaultShopReorderLevel(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">Qty</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="maxWaterIngressMm" className="text-sm font-semibold">Max Water Ingress (mm)</Label>
                      <div className="relative">
                        <input
                          id="maxWaterIngressMm"
                          title="Max Water Ingress"
                          placeholder="50"
                          type="number"
                          step="1"
                          min="0"
                          value={maxWaterIngressMm}
                          onChange={(e) => setMaxWaterIngressMm(parseInt(e.target.value) || 0)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">mm</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/40 rounded-lg border flex gap-3 mt-4">
                    <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Notification Triggers</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        These limits govern push notifications, SMS alerts, and dashboard flags for low inventory and overdue payments. Modifying these immediately updates background monitoring systems.
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
                    {updatingStation ? 'Saving...' : 'Save Settings'}
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
          </Card >
        </>
      )
      }
    </div >
  )
}
