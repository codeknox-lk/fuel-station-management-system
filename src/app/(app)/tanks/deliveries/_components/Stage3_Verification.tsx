'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowRight, CheckCircle2, Ruler } from 'lucide-react'
import { DeliveryData } from './types'
import { Card, CardContent } from '@/components/ui/card'
import { depthToVolume, TankCapacity } from '@/lib/tank-calibration'

interface Nozzle {
    id: string
    nozzleNumber: string
}

interface Props {
    data: DeliveryData
    onUpdate: (data: Partial<DeliveryData>) => void
    onNext: () => void
    onBack: () => void
}

export default function Stage3_Verification({ data, onUpdate, onNext }: Props) {
    const { selectedStation } = useStation()
    const [nozzles, setNozzles] = useState<Nozzle[]>([])
    const [tankCapacity, setTankCapacity] = useState<TankCapacity | null>(null)
    const [variance, setVariance] = useState<{ diff: number, percent: number } | null>(null)

    // Load nozzles and tank info
    useEffect(() => {
        if (data.tankId && selectedStation && nozzles.length === 0) {
            // Fetch nozzles
            fetch(`/api/nozzles?stationId=${selectedStation}&tankId=${data.tankId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setNozzles(data)
                })

            // Fetch tank to get capacity
            fetch(`/api/tanks?id=${data.tankId}`)
                .then(res => res.json())
                .then(response => {
                    // Handle both Array (legacy) and Single Object (by ID) responses
                    let tank = null;
                    if (Array.isArray(response) && response.length > 0) {
                        tank = response[0]
                    } else if (response && response.id) {
                        tank = response
                    }

                    if (tank) {
                        const cap = Number(tank.capacity) // Ensure number

                        if ([9000, 15000, 22500].includes(cap)) {
                            setTankCapacity(cap as TankCapacity)
                        } else {
                            console.error('Unsupported tank capacity:', cap)
                        }
                    } else {
                        console.error('API returned empty/invalid tank data for ID:', data.tankId)
                    }
                })
                .catch(err => console.error(`Fetch error: ${err.message}`))
        }
    }, [data.tankId, selectedStation, nozzles.length])

    // Calculate Variance whenever inputs change
    useEffect(() => {
        if (data.afterDipReading !== undefined && data.afterDipReading !== null && data.beforeDipReading !== undefined && data.beforeDipReading !== null && tankCapacity) {
            // Convert dip readings (cm) to volume (liters)
            const volumeBefore = depthToVolume(data.beforeDipReading, tankCapacity)
            const volumeAfter = depthToVolume(data.afterDipReading, tankCapacity)

            // 1. Physical Difference
            const physicalDiff = volumeAfter - volumeBefore

            // 2. Sales during drop
            let sales = 0
            if (data.afterMeterReadings && data.beforeMeterReadings) {
                Object.entries(data.afterMeterReadings).forEach(([nid, current]) => {
                    const start = data.beforeMeterReadings?.[nid]
                    if (typeof start === 'number') {
                        sales += Math.max(0, current - start)
                    }
                })
            }

            // 3. Gross Delivered
            const actualReceived = physicalDiff + sales

            // 4. Variance
            const diff = (data.invoiceQuantity || 0) - actualReceived
            const percent = data.invoiceQuantity > 0 ? (Math.abs(diff) / data.invoiceQuantity) * 100 : 0

            setVariance({ diff, percent })
        }
    }, [data.afterDipReading, data.afterMeterReadings, data.beforeDipReading, data.invoiceQuantity, data.beforeMeterReadings, tankCapacity])

    const handleMeterChange = (nozzleId: string, val: string) => {
        const readings = { ...(data.afterMeterReadings || {}) }
        readings[nozzleId] = parseFloat(val)
        onUpdate({ afterMeterReadings: readings })
    }

    const canProceed = !!data.afterDipReading && (!nozzles.length || !!data.afterMeterReadings)

    return (

        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold">Verification</h2>
                <p className="text-muted-foreground">Record after-dip and ending meters to verify quantity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>After Dip Reading (cm)</Label>
                    <div className="relative">
                        <Input
                            type="number"
                            step="0.5"
                            value={data.afterDipReading || ''}
                            onChange={e => onUpdate({ afterDipReading: parseFloat(e.target.value) })}
                            className="pl-10 font-bold"
                            placeholder="Enter depth in cm"
                        />
                        <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    {data.afterDipReading && tankCapacity && (
                        <p className="text-sm text-muted-foreground mt-1">
                            ≈ {depthToVolume(data.afterDipReading, tankCapacity).toLocaleString()} liters
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>Water Level After (mm)</Label>
                    <Input
                        type="number"
                        value={data.waterLevelAfter || ''}
                        onChange={e => onUpdate({ waterLevelAfter: parseFloat(e.target.value) })}
                        placeholder="0"
                    />
                    {data.waterLevelAfter !== undefined && (data.waterLevelBefore || 0) < data.waterLevelAfter && (
                        data.waterLevelAfter - (data.waterLevelBefore || 0) > 50 && (
                            <div className="flex items-center gap-2 text-red-600 text-sm mt-1 animate-pulse">
                                <AlertCircle className="h-4 w-4" />
                                <span>High Water Ingress Detected (+{(data.waterLevelAfter - (data.waterLevelBefore || 0))}mm)</span>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Calibration Warning */}
            {!tankCapacity && data.tankId && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Warning: Tank calibration data not loaded.<br />
                                Check if tank capacity matches supported sizes (9KL, 15KL, 22.5KL).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* End Meters Section */}
            <div className="space-y-2">
                <Label>Ending Pump Meter Readings</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nozzles.filter(n => data.beforeMeterReadings && data.beforeMeterReadings[n.id] !== undefined).map(nozzle => (
                        <div key={nozzle.id} className="bg-muted p-3 rounded-md border flex justify-between items-center">
                            <div>
                                <div className="text-sm font-medium">{nozzle.nozzleNumber}</div>
                                <div className="text-xs text-muted-foreground">Start: {data.beforeMeterReadings?.[nozzle.id]}</div>
                            </div>
                            <Input
                                type="number"
                                className="w-32"
                                placeholder="End Reading"
                                value={data.afterMeterReadings?.[nozzle.id] || ''}
                                onChange={(e) => handleMeterChange(nozzle.id, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                {nozzles.filter(n => data.beforeMeterReadings && data.beforeMeterReadings[n.id] !== undefined).length === 0 && (
                    <div className="p-4 border rounded-md bg-muted text-muted-foreground text-sm text-center">
                        No active pumps were recorded in Stage 1. No meter readings required.
                    </div>
                )}
            </div>



            {/* Verification Result */}
            {
                variance && tankCapacity && data.afterDipReading !== undefined && data.beforeDipReading !== undefined && (
                    <Card
                        className={`border transition-all ${variance.diff > 0
                            ? 'border-red-500/30 bg-red-500/5'
                            : variance.diff < 0
                                ? 'border-green-500/30 bg-green-500/5'
                                : 'border-border bg-card'
                            }`}
                    >
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-start border-b border-dashed border-gray-300 pb-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Physical Received</div>
                                    <div className="text-3xl font-mono font-bold text-foreground mt-1">
                                        {/* Calculate Physical Volume Difference */}
                                        {(depthToVolume(data.afterDipReading, tankCapacity) - depthToVolume(data.beforeDipReading, tankCapacity)).toLocaleString()} <span className="text-lg text-muted-foreground">L</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        (After Dip Vol - Before Dip Vol)
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Invoice Quantity</div>
                                    <div className="text-xl font-mono font-semibold text-foreground mt-1">
                                        {data.invoiceQuantity.toLocaleString()} L
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div>
                                    <Label className="text-sm font-semibold text-muted-foreground mb-1 block">Variance Analysis</Label>
                                    <div className="flex items-center gap-3">
                                        <div className={`text-2xl font-mono font-bold ${variance.diff > 0 ? "text-red-600 dark:text-red-500" : variance.diff < 0 ? "text-green-600 dark:text-green-500" : "text-foreground"}`}>
                                            {Math.abs(variance.diff).toFixed(1)} L
                                        </div>
                                        <Badge
                                            variant={variance.diff > 0 ? "destructive" : variance.diff < 0 ? "default" : "outline"}
                                            className={
                                                variance.diff > 0
                                                    ? "bg-red-600 dark:bg-red-500 hover:bg-red-700 text-white"
                                                    : variance.diff < 0
                                                        ? "bg-green-600 dark:bg-green-500 hover:bg-green-700 text-white"
                                                        : ""
                                            }
                                        >
                                            {variance.diff > 0 ? "SHORTAGE (Loss)" : variance.diff < 0 ? "SURPLUS (Gain)" : "EXACT MATCH"}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {variance.percent.toFixed(2)}% discrepancy from invoice
                                    </div>
                                </div>

                                {variance.diff > 0 ? (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/20 px-3 py-2 rounded-md">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="font-semibold text-sm">Check Discrepancy</span>
                                    </div>
                                ) : variance.diff < 0 ? (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/20 px-3 py-2 rounded-md">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-semibold text-sm">Gain Verified</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-3 py-2 rounded-md">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-semibold text-sm">Perfect Match</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            <div className="flex justify-between pt-4">
                {/* <Button variant="outline" onClick={onBack}>Back</Button> */}
                <Button variant="ghost" disabled>Processing...</Button>
                <Button onClick={onNext} disabled={!canProceed} size="lg">
                    Proceed to Settlement (Stage 4)
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div >
    )
}
