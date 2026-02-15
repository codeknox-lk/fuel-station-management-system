'use client'

import { FormCard } from '@/components/ui/FormCard'

export function ShiftClosingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4" />

            <FormCard title="Shift Selection" description="Loading shift data...">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-10 bg-muted rounded" />
                    <div className="h-10 bg-muted rounded" />
                </div>
            </FormCard>

            <FormCard title="Meter Readings" description="Loading assignments...">
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 bg-muted rounded" />
                    ))}
                </div>
            </FormCard>

            <div className="h-40 bg-muted rounded-lg" />
        </div>
    )
}
