'use client'

import DeliveryWizard from '../_components/DeliveryWizard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewDeliveryPage() {
    const router = useRouter()

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.push('/tanks/deliveries')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Truck className="h-8 w-8 text-orange-600" />
                        Record New Delivery
                    </h1>
                </div>
            </div>

            {/* Wizard Container */}
            <div className="border rounded-lg p-6 bg-card shadow-sm">
                <DeliveryWizard />
            </div>
        </div>
    )
}
