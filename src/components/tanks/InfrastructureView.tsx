'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Fuel,
    Droplets,
    Plus,
    ChevronDown,
    ChevronRight,
    Network,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TankWithDetails } from '@/types/db'
import { useRouter } from 'next/navigation'

interface Pump {
    id: string
    pumpNumber: string
    stationId: string
}

interface Nozzle {
    id: string
    nozzleNumber: string
    pump: Pump
}

interface Infrastructure {
    station: { id: string; name: string }
    tanks: (TankWithDetails & { nozzles: Nozzle[] })[]
    pumps: Pump[]
}

interface InfrastructureViewProps {
    stationId: string | null
    className?: string
}

export function InfrastructureView({ stationId, className }: InfrastructureViewProps) {
    const router = useRouter()
    const { toast } = useToast()

    const [infrastructure, setInfrastructure] = useState<Infrastructure | null>(null)
    const [loading, setLoading] = useState(false)
    const [expandedTanks, setExpandedTanks] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)

    const loadInfrastructure = useCallback(async (id: string) => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/tanks/infrastructure?stationId=${id}`)
            const data = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            setInfrastructure(data)
            // Expand all tanks by default
            if (data.tanks && Array.isArray(data.tanks)) {
                setExpandedTanks(new Set(data.tanks.map((t: TankWithDetails) => t.id)))
            }
        } catch (err) {
            console.error('Failed to load infrastructure:', err)
            const message = err instanceof Error ? err.message : 'Failed to load infrastructure'
            setError(message)
            toast({
                title: "Error",
                description: message,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => {
        if (stationId) {
            loadInfrastructure(stationId)
        } else {
            setInfrastructure(null)
        }
    }, [stationId, loadInfrastructure])

    const toggleTankExpand = (tankId: string) => {
        setExpandedTanks(prev => {
            const newSet = new Set(prev)
            if (newSet.has(tankId)) {
                newSet.delete(tankId)
            } else {
                newSet.add(tankId)
            }
            return newSet
        })
    }

    if (!stationId) {
        return (
            <FormCard
                className={className}
                title="Infrastructure Detail"
                description="Select a station to view its infrastructure tree."
            >
                <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                    <div className="text-center">
                        <Network className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No station selected</p>
                    </div>
                </div>
            </FormCard>
        )
    }

    if (loading) {
        return (
            <FormCard title="Loading Infrastructure..." className={className}>
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
            </FormCard>
        )
    }

    if (error) {
        return (
            <FormCard title="Error Loading Infrastructure" className={className}>
                <div className="p-6 text-center text-red-500">
                    <p>{error}</p>
                    <Button variant="outline" onClick={() => loadInfrastructure(stationId)} className="mt-4">Retry</Button>
                </div>
            </FormCard>
        )
    }

    if (!infrastructure) return null

    return (
        <FormCard title={`Infrastructure: ${infrastructure.station.name}`} className={className}>
            <div className="space-y-4">
                {/* Tanks Section */}
                {infrastructure.tanks.length > 0 ? (
                    <div>
                        <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            Tanks ({infrastructure.tanks.length})
                        </h4>
                        <div className="space-y-2 border-l-2 border-border pl-4">
                            {infrastructure.tanks.map((tank) => {
                                const isExpanded = expandedTanks.has(tank.id)
                                const fillPercentage = tank.capacity > 0 ? Math.round(((tank.currentLevel || 0) / tank.capacity) * 100) : 0
                                return (
                                    <div key={tank.id} className="space-y-1">
                                        <button
                                            onClick={() => toggleTankExpand(tank.id)}
                                            className="flex items-center gap-2 w-full text-left hover:bg-muted p-2 rounded-md transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                            <span className="font-semibold">{tank.fuel?.icon} {tank.fuel?.name || 'Unknown'}</span>
                                            <Badge variant="outline">
                                                {fillPercentage}% full
                                            </Badge>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {(tank.currentLevel || 0).toLocaleString()}L / {(tank.capacity || 0).toLocaleString()}L
                                            </span>
                                        </button>
                                        {isExpanded && tank.nozzles.length > 0 && (
                                            <div className="ml-8 space-y-1 border-l-2 border-orange-500/20 dark:border-orange-500/30 pl-4">
                                                {tank.nozzles.map((nozzle) => (
                                                    <div key={nozzle.id} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                                        <Droplets className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                        Nozzle {nozzle.nozzleNumber}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isExpanded && tank.nozzles.length === 0 && (
                                            <div className="ml-8 text-sm text-muted-foreground italic">
                                                No nozzles connected
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <Network className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p>No infrastructure found for this station.</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => router.push('/settings/tanks')}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Infrastructure
                        </Button>
                    </div>
                )}
            </div>
        </FormCard>
    )
}
