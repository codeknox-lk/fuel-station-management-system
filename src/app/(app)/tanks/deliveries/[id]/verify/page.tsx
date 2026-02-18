'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DeliveryWizard, { DeliveryData } from '../../_components/DeliveryWizard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'


export default function VerifyDeliveryPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [deliveryData, setDeliveryData] = useState<Partial<DeliveryData> | null>(null)

    useEffect(() => {
        const fetchDelivery = async () => {
            try {
                const id = params?.id
                if (!id) return

                const res = await fetch(`/api/deliveries?id=${id}`)
                if (!res.ok) {
                    throw new Error('Failed to fetch delivery')
                }

                const delivery = await res.json()

                if (delivery) {
                    // Map to DeliveryData
                    const mappedData: Partial<DeliveryData> = {
                        deliveryId: delivery.id,
                        stationId: delivery.tank?.stationId || delivery.stationId || '',
                        tankId: delivery.tankId,
                        supplier: delivery.supplier,
                        invoiceNumber: delivery.invoiceNumber || '',
                        invoiceQuantity: delivery.invoiceQuantity,
                        beforeDipReading: delivery.beforeDipReading,
                        waterLevelBefore: delivery.waterLevelBefore,
                        beforeMeterReadings: delivery.beforeMeterReadings
                            ? (delivery.beforeMeterReadings as unknown as Record<string, number>)
                            : {},
                        deliveryStartTime: new Date(delivery.createdAt)
                    }
                    setDeliveryData(mappedData)
                } else {
                    toast({ title: 'Error', description: 'Delivery not found', variant: 'destructive' })
                    router.push('/tanks/deliveries')
                }
            } catch (error) {
                console.error(error)
                toast({ title: 'Error', description: 'Failed to load delivery', variant: 'destructive' })
            } finally {
                setLoading(false)
            }
        }
        fetchDelivery()
    }, [params?.id, router, toast])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!deliveryData) return null

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Deliveries
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Verify Delivery</h1>
                <p className="text-muted-foreground mt-2">
                    Complete verification including After Dip, Meter Readings, and Payment.
                </p>
            </div>

            <DeliveryWizard initialStep={3} initialData={deliveryData} />
        </div>
    )
}
