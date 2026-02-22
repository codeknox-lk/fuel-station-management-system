'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle, Droplets, Loader2, Fuel } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { DeliveryData } from './types'
import { depthToVolume, TankCapacity, validateDepth, getMaxDepth } from '@/lib/tank-calibration'
import { Badge } from '@/components/ui/badge'

interface Tank {
    id: string
    stationId: string
    tankNumber: string
    capacity: number
    currentLevel: number
    fuel?: { code: string; name: string; icon?: string | null }
}

interface ShiftAssignment {
    id: string
    nozzleId: string
    pumperName: string
    startMeterReading: number
    endMeterReading: number | null
    status: string
    nozzle: {
        id: string
        nozzleNumber: string
        tankId: string
    }
}

interface Props {
    data: DeliveryData
    onUpdate: (data: Partial<DeliveryData>) => void
    onNext: () => void
    loading?: boolean
}

export default function Stage1_Arrival({ data, onUpdate, onNext, loading }: Props) {
    const { selectedStation } = useStation()
    const [tanks, setTanks] = useState<Tank[]>([])
    const [tanksLoading, setTanksLoading] = useState(false)
    const [activeAssignments, setActiveAssignments] = useState<ShiftAssignment[]>([])
    const [error, setError] = useState('')

    // Local state for validation
    const [formValid, setFormValid] = useState(false)

    // Fetch Tanks
    useEffect(() => {
        if (selectedStation) {
            setTanksLoading(true)
            fetch(`/api/tanks?stationId=${selectedStation}&type=tanks`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        // Filter out any invalid tank objects
                        const validTanks = data.filter(t => t && t.id)
                        setTanks(validTanks)
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch tanks:', err)
                    setTanks([])
                })
                .finally(() => setTanksLoading(false))
        }
    }, [selectedStation])

    // Fetch active shift assignments when tank selected
    useEffect(() => {
        if (data.tankId && selectedStation) {
            // Fetch active shifts with assignments for this station
            fetch(`/api/shifts?stationId=${selectedStation}&active=true&includeAssignments=true`)
                .then(res => res.json())
                .then(response => {
                    if (response.shifts && Array.isArray(response.shifts)) {
                        // Filter assignments for the selected tank
                        const allAssignments: ShiftAssignment[] = []
                        response.shifts.forEach((shift: { assignments?: ShiftAssignment[] }) => {
                            if (shift.assignments) {
                                shift.assignments.forEach(assignment => {
                                    // Check if this assignment's nozzle belongs to the selected tank
                                    if (assignment.nozzle && assignment.nozzle.tankId === data.tankId) {
                                        allAssignments.push(assignment)
                                    }
                                })
                            }
                        })

                        setActiveAssignments(allAssignments)

                        // Auto-populate meter readings with the last reading from each assignment
                        const readings: Record<string, number> = {}
                        allAssignments.forEach(assignment => {
                            // Use endMeterReading if available (last reading), otherwise startMeterReading
                            readings[assignment.nozzleId] = assignment.endMeterReading || assignment.startMeterReading
                        })

                        if (Object.keys(readings).length > 0) {
                            onUpdate({ beforeMeterReadings: readings })
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch active shifts:', err)
                })
        } else {
            setActiveAssignments([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.tankId, selectedStation])

    // Validate form
    useEffect(() => {
        const isValid =
            !!data.tankId &&
            !!data.supplier &&
            !!data.invoiceNumber && // NOW REQUIRED
            (data.invoiceQuantity !== undefined && data.invoiceQuantity >= 0) &&
            (data.beforeDipReading !== undefined && data.beforeDipReading >= 0) // Allow 0

        setFormValid(isValid)
    }, [data])

    const handleNext = () => {
        // Validate invoice number
        if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
            setError('Invoice number is required')
            return
        }

        // Validate dip reading
        const tank = tanks.find(t => t?.id === data.tankId)
        if (tank && data.beforeDipReading !== undefined) {
            const tankCapacity = tank.capacity as TankCapacity
            const validation = validateDepth(data.beforeDipReading, tankCapacity)
            if (!validation.valid) {
                setError(`Invalid dip reading: ${validation.message}`)
                return
            }
        }

        // Client side Ullage Check - using actual volume calculation
        if (tank && data.beforeDipReading !== undefined) {
            const tankCapacity = tank.capacity as TankCapacity
            const currentVolume = depthToVolume(data.beforeDipReading, tankCapacity)
            const availableSpace = tank.capacity - currentVolume

            if (data.invoiceQuantity > availableSpace * 1.05) {
                setError(`High Overfill Risk! Quantity (${data.invoiceQuantity.toLocaleString()}L) exceeds available space (${availableSpace.toFixed(0)}L)`)
                return
            }
        }

        onNext()
    }

    const handleMeterChange = (nozzleId: string, val: string) => {
        const readings = { ...(data.beforeMeterReadings || {}) }
        readings[nozzleId] = parseFloat(val) || 0
        onUpdate({ beforeMeterReadings: readings })
    }

    // Get selected tank for volume calculation
    const selectedTank = tanks.find(t => t?.id === data.tankId)
    const tankCapacity = selectedTank?.capacity as TankCapacity | undefined
    const calculatedVolume = data.beforeDipReading && tankCapacity
        ? depthToVolume(data.beforeDipReading, tankCapacity)
        : null

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Arrival & Safety</h2>
                <p className="text-muted-foreground">Record initial readings and verify safety checks.</p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {/* Tank Selection */}
                <div>
                    <Label htmlFor="tank">Tank *</Label>
                    <Select
                        value={data.tankId}
                        onValueChange={(val) => {
                            const selectedTank = tanks.find(t => t?.id === val)
                            onUpdate({
                                tankId: val,
                                stationId: selectedTank?.stationId || selectedStation || ''
                            })
                            setError('')
                        }}
                        disabled={tanksLoading || loading}
                    >
                        <SelectTrigger id="tank">
                            <SelectValue placeholder={tanksLoading ? "Loading tanks..." : "Choose a tank"} />
                        </SelectTrigger>
                        <SelectContent>
                            {tanks.filter(t => t && t.id).map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                    <div className="flex items-center gap-2">
                                        <Fuel className="h-4 w-4 text-muted-foreground" />
                                        <span>Tank {t.tankNumber}</span>
                                        {t.fuel && <Badge variant="outline">{t.fuel.icon} {t.fuel.code}</Badge>}
                                        <span className="text-muted-foreground text-sm">({t.capacity.toLocaleString()}L)</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedTank && (
                        <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                            <span>Current: {selectedTank.currentLevel.toLocaleString()}L</span>
                            <span>Capacity: {selectedTank.capacity.toLocaleString()}L</span>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Supplier & Invoice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="supplier">Supplier *</Label>
                        <Input
                            id="supplier"
                            value={data.supplier}
                            onChange={(e) => onUpdate({ supplier: e.target.value })}
                            placeholder="e.g., Lanka IOC PLC"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                        <Input
                            id="invoiceNumber"
                            value={data.invoiceNumber}
                            onChange={(e) => onUpdate({ invoiceNumber: e.target.value })}
                            placeholder="e.g., INV-12345678"
                            disabled={loading}
                            required
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="invoiceQuantity">Invoice Quantity (Liters) *</Label>
                    <Input
                        id="invoiceQuantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.invoiceQuantity !== undefined && data.invoiceQuantity !== null ? data.invoiceQuantity : ''}
                        onChange={(e) => onUpdate({ invoiceQuantity: parseFloat(e.target.value) || 0 })}
                        placeholder="Enter quantity from invoice"
                        disabled={loading}
                        required
                    />
                </div>

                <Separator />

                {/* Safety & Pre-Dip */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        <h3 className="font-semibold">Safety & Pre-Dip</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="beforeDipReading">Before Dip Reading (cm) *</Label>
                            <Input
                                id="beforeDipReading"
                                type="number"
                                min="0"
                                max={tankCapacity ? getMaxDepth(tankCapacity) : undefined}
                                step="0.5"
                                value={data.beforeDipReading !== undefined && data.beforeDipReading !== null ? data.beforeDipReading : ''}
                                onChange={(e) => onUpdate({ beforeDipReading: parseFloat(e.target.value) || 0 })}
                                placeholder="Enter depth in cm"
                                disabled={loading || !data.tankId}
                                required
                            />
                            {calculatedVolume !== null && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    ≈ {calculatedVolume.toLocaleString()} liters
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="waterLevel">Water Level Check (mm)</Label>
                            <Input
                                id="waterLevel"
                                type="number"
                                min="0"
                                value={data.waterLevelBefore ?? ''}
                                onChange={(e) => onUpdate({ waterLevelBefore: parseFloat(e.target.value) || 0 })}
                                placeholder="0 if clean"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Active Pump Assignments */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Droplets className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold">Active Pump Assignments (Current Meter Readings)</h3>
                    </div>

                    {activeAssignments.length > 0 ? (
                        <div className="space-y-3">
                            {activeAssignments.map(assignment => {
                                const currentReading = data.beforeMeterReadings?.[assignment.nozzleId] ??
                                    assignment.endMeterReading ??
                                    assignment.startMeterReading ?? 0
                                const shiftStart = assignment.startMeterReading ?? 0
                                const litersPumped = Math.max(0, currentReading - shiftStart)

                                return (
                                    <div key={assignment.id} className="bg-muted p-4 rounded-md border space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Nozzle {assignment.nozzle.nozzleNumber}</Badge>
                                                <span className="text-sm font-medium">{assignment.pumperName}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                Shift start: {shiftStart.toLocaleString()}L
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min={shiftStart}
                                                step="0.01"
                                                value={currentReading !== undefined && currentReading !== null ? currentReading : ''}
                                                onChange={(e) => handleMeterChange(assignment.nozzleId, e.target.value)}
                                                placeholder="Current meter reading"
                                                className="flex-1"
                                            />
                                            {litersPumped > 0 && (
                                                <span className="text-sm font-semibold text-orange-600 whitespace-nowrap">
                                                    {litersPumped.toLocaleString()}L pumped
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                                No active shifts found for this tank. Meter readings will not be tracked.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleNext}
                    disabled={!formValid || loading}
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Delivery...
                        </>
                    ) : (
                        'Start Delivery Drop'
                    )}
                </Button>
            </div>
        </div>
    )
}
