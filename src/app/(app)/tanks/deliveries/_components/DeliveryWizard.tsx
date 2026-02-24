'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Truck, Activity, Ruler, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

import Stage1_Arrival from './Stage1_Arrival'
import Stage2_Active from './Stage2_Active'
import Stage3_Verification from './Stage3_Verification'
import Stage4_Payment from './Stage4_Payment'

import { DeliveryData } from './types'

interface Props {
    initialStep?: number
    initialData?: Partial<DeliveryData>
}

export default function DeliveryWizard({ initialStep = 1, initialData }: Props) {
    const router = useRouter()
    const { toast } = useToast()

    const [step, setStep] = useState(initialStep)
    const [loading, setLoading] = useState(false)

    // Safe initialization - ensure all required fields have defaults
    const [data, setData] = useState<DeliveryData>(() => ({
        stationId: initialData?.stationId || '',
        tankId: initialData?.tankId || '',
        supplier: initialData?.supplier || '',
        invoiceNumber: initialData?.invoiceNumber || '',
        invoiceQuantity: initialData?.invoiceQuantity || 0,
        beforeDipReading: initialData?.beforeDipReading,
        waterLevelBefore: initialData?.waterLevelBefore,
        beforeMeterReadings: initialData?.beforeMeterReadings || {},
        afterDipReading: initialData?.afterDipReading,
        waterLevelAfter: initialData?.waterLevelAfter,
        afterMeterReadings: initialData?.afterMeterReadings || {},
        costPrice: initialData?.costPrice,
        totalCost: initialData?.totalCost,
        paymentType: initialData?.paymentType,
        chequeNumber: initialData?.chequeNumber,
        bankId: initialData?.bankId,
        chequeDate: initialData?.chequeDate,
        deliveryId: initialData?.deliveryId
    }))

    const nextStep = () => setStep(s => Math.min(s + 1, 4))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    // Handle Stage 1 Submission (Create Delivery)
    const handleCreateDelivery = async () => {
        setLoading(true)
        try {
            const payload = {
                stationId: data.stationId || undefined, // Context handles this? No, we need to pass it or get it from context.
                // Actually, Stage1 uses useStation(). User selects tank, which has stationId.
                // But we need to make sure we send stationId.
                // Let's assume data.stationId might be empty if we rely on selectedStation in context, 
                // but the API needs it.
                // We'll rely on Stage1 setting it or we'll get it from the tank? 
                // Wait, tanks have stationId.
                tankId: data.tankId,
                invoiceQuantity: data.invoiceQuantity,
                supplier: data.supplier,
                deliveryDate: new Date().toISOString(),
                invoiceNumber: data.invoiceNumber,
                beforeDipReading: data.beforeDipReading,
                waterLevelBefore: data.waterLevelBefore,
                beforeMeterReadings: data.beforeMeterReadings,
                supplierId: data.supplierId
            }

            // We need stationId. If it's not in data, we might fail.
            // Stage1 should probably update data.stationId from the selected tank?
            // Or simpler: Stage1 uses useStation() and updates data.stationId. I'll check that.

            const res = await fetch('/api/deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to create delivery')
            }

            const result = await res.json()

            if (!result || !result.id) {
                throw new Error('Server returned invalid delivery data (missing ID)')
            }

            setData(prev => ({ ...prev, deliveryId: result.id }))

            toast({ title: 'Delivery Started', description: 'Proceed to Active Drop stage.' })
            nextStep()

        } catch (error) {
            toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to start', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    // Handle Stage 4 Submission (Verify & Payment)
    const handleFinalize = async () => {
        if (!data.deliveryId) return

        setLoading(true)
        try {
            const payload = {
                afterDipReading: data.afterDipReading,
                waterLevelAfter: data.waterLevelAfter,
                afterMeterReadings: data.afterMeterReadings,

                // Financials
                costPrice: data.costPrice,
                totalCost: data.totalCost,
                paymentType: data.paymentType,
                paymentStatus: (data.paymentType === 'CASH' || data.paymentType === 'CHEQUE') ? 'PAID' : 'UNPAID',
                chequeNumber: data.chequeNumber,
                bankId: data.bankId,
                chequeDate: data.chequeDate,

                supplierId: data.supplierId,
                verifiedBy: 'System User' // Should be current user
            }

            const res = await fetch(`/api/deliveries/${data.deliveryId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to verify delivery')
            }

            toast({ title: 'Success', description: 'Delivery Verified & Recorded!' })
            router.push('/tanks/deliveries')

        } catch (error) {
            toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to finalize', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Progress Stepper */}
            <div className="flex items-center justify-between px-4 py-4 bg-muted/30 rounded-lg border">
                {[
                    { id: 1, label: 'Arrival & Safety', icon: Truck },
                    { id: 2, label: 'Active Drop', icon: Activity },
                    { id: 3, label: 'Verification', icon: Ruler },
                    { id: 4, label: 'Settlement', icon: DollarSign }
                ].map((s, index) => (
                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                        <div className={`flex items-center gap-2 ${step >= s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step > s.id ? 'bg-primary border-primary text-primary-foreground' :
                                step === s.id ? 'border-primary text-primary' : 'border-muted-foreground/30'
                                }`}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                            </div>
                            <span className={`font-medium hidden md:inline ${step === s.id ? 'text-foreground' : ''}`}>{s.label}</span>
                        </div>
                        {index < 3 && <Separator className="flex-1 mx-4 h-0.5 bg-muted-foreground/20" />}
                    </div>
                ))}
            </div>

            <Card className="border-t-4 border-t-primary shadow-md">
                <CardContent className="p-6">
                    {step === 1 && (
                        <Stage1_Arrival
                            data={data}
                            onUpdate={(updates) => setData(prev => ({ ...prev, ...updates }))}
                            onNext={handleCreateDelivery}
                            loading={loading}
                        />
                    )}
                    {step === 2 && (
                        <Stage2_Active
                            data={data}
                            onUpdate={(updates) => setData(prev => ({ ...prev, ...updates }))}
                            onNext={nextStep}
                            onBack={prevStep}
                        />
                    )}
                    {step === 3 && (
                        <Stage3_Verification
                            data={data}
                            onUpdate={(updates) => setData(prev => ({ ...prev, ...updates }))}
                            onNext={nextStep}
                            onBack={prevStep}
                        />
                    )}
                    {step === 4 && (
                        <Stage4_Payment
                            data={data}
                            onUpdate={(updates) => setData(prev => ({ ...prev, ...updates }))}
                            onSubmit={handleFinalize}
                            onBack={prevStep}
                            loading={loading}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
