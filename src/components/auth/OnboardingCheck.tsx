'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
    const { stations, isLoading, error } = useStation()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Only check once loading is done
        if (!isLoading && !error) {
            // If user has NO stations, redirect to onboarding
            if (stations.length === 0) {
                console.log('OnboardingCheck: No stations found, redirecting to /onboarding')
                router.push('/onboarding')
            }
        }
    }, [stations, isLoading, error, router, pathname])

    // While loading or if redirecting, we might want to show a spinner or nothing
    // But to avoid flash of content, we can return null if we know we are redirecting
    if (!isLoading && stations.length === 0) {
        return null
    }

    return <>{children}</>
}
