'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Organization {
    id: string
    name: string
    slug: string
    plan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
}

interface OrganizationContextType {
    organization: Organization | null
    isLoading: boolean
    refreshOrganization: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const [organization, setOrganization] = useState<Organization | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadOrganization = async () => {
        try {
            setIsLoading(true)

            // 1. Try to get from Local Storage first (fastest)
            const storedId = localStorage.getItem('organizationId')

            if (storedId) {
                // We have at least the ID. In a real app we might want to fetch full details
                // For now, we'll construct what we can from storage and potentially fetch more if needed
                // If we need the full object including Plan, we should fetch it from an API.
                // For now, let's assume we can rely on what's stored or fetch lightweight details.

                // Let's implement a verified fetch to ensure the org is valid and get its plan
                // This validates the session organisation against the server
                const res = await fetch(`/api/organizations/${storedId}`)

                if (res.ok) {
                    const orgData = await res.json()
                    setOrganization(orgData)
                } else {
                    // Fallback or handle error (e.g., org deleted)
                    console.warn("Failed to fetch organization details")
                    // If fetch fails, we might still want to use stored ID if we are offline, 
                    // but for security it's better to fail or require re-login if critical.
                    // For this implementation, we will clear if invalid.
                    if (res.status === 404 || res.status === 401) {
                        setOrganization(null)
                        localStorage.removeItem('organizationId')
                        localStorage.removeItem('organizationSlug')
                    }
                }
            } else {
                setOrganization(null)
            }
        } catch (error) {
            console.error('Failed to load organization:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadOrganization()
    }, [])

    return (
        <OrganizationContext.Provider
            value={{
                organization,
                isLoading,
                refreshOrganization: loadOrganization
            }}
        >
            {children}
        </OrganizationContext.Provider>
    )
}

export function useOrganization() {
    const context = useContext(OrganizationContext)
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider')
    }
    return context
}
