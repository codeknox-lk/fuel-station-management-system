'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    CreditCard,
    Check,
    Zap,
    Clock,
    ChevronRight,
    History,
    AlertCircle,
    ArrowLeft,
    Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Payment {
    id: string
    amount: number
    currency: string
    status: string
    billingDate: string
}

interface SubscriptionData {
    plan: 'BASIC' | 'PREMIUM'
    status: string
    maxStations: number
    trialEndDate: string | null
    nextBillingDate: string | null
    amount: number
    currency: string
    billingInterval: string
    usage: {
        stations: {
            current: number
            max: number
        }
    }
    payments: Payment[]
}

export default function SubscriptionPage() {
    const router = useRouter()
    const { refreshOrganization } = useOrganization()
    const [data, setData] = useState<SubscriptionData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/subscriptions')
            if (res.ok) {
                const subData = await res.json()
                setData(subData)
            }
        } catch (error) {
            console.error('Failed to load subscription:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpgrade = async (planId: string) => {
        setIsActionLoading(true)
        try {
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, interval: 'MONTH' })
            })

            if (res.ok) {
                await refreshOrganization()
                await fetchData()
            }
        } catch (error) {
            console.error('Upgrade failed:', error)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleBuyStation = async () => {
        if (!confirm('Are you sure you want to purchase an additional station slot for LKR 100,000? This will also increase your monthly subscription proportionally.')) return

        setIsActionLoading(true)
        try {
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ADD_STATION' })
            })

            if (res.ok) {
                await refreshOrganization()
                await fetchData()
            }
        } catch (error) {
            console.error('Purchase failed:', error)
        } finally {
            setIsActionLoading(false)
        }
    }

    if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading subscription details...</div>

    const PLAN_TIERS = [
        {
            id: 'BASIC',
            name: 'Basic',
            price: '2,500',
            description: 'Core operations for small stations.',
            features: [
                '1 Station Included',
                'Extra stations: LKR 100,000 each',
                'Standard Reporting',
                'Staff Management',
                'Fuel Inventory',
                'Basic Safe Management'
            ],
            color: 'bg-slate-500'
        },
        {
            id: 'PREMIUM',
            name: 'Premium',
            price: '5,000',
            description: 'Full suite for growing businesses & networks.',
            features: [
                '1 Station Included',
                'Extra stations: LKR 100,000 each',
                'Profit Analysis',
                'Station Comparison',
                'Credit Management',
                'Audit History',
                'Full API Access',
                'Priority Support'
            ],
            color: 'bg-orange-600'
        }
    ]

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.push('/settings')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <CreditCard className="h-8 w-8 text-primary" />
                            Subscription & Billing
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your business plan, usage limits, and payment history.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm border">
                    <CardHeader className="pb-4 border-b bg-muted/30">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-bold">
                                    Active Plan: <span className="text-primary">{data?.plan}</span>
                                </CardTitle>
                                <CardDescription>
                                    Enterprise Business Account
                                </CardDescription>
                            </div>
                            <Badge className={cn(
                                "px-3 py-1 font-semibold",
                                data?.status === 'ACTIVE' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    data?.status === 'TRIALING' ? "bg-primary/10 text-primary border-primary/20" :
                                        "bg-red-500/10 text-red-600 border-red-500/20"
                            )} variant="outline">
                                {data?.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-primary/10 rounded-xl">
                                        <Clock className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Renewal Date</p>
                                        <p className="text-base font-bold">
                                            {data?.nextBillingDate ? format(new Date(data.nextBillingDate), 'MMMM d, yyyy') : 'Manual Renewal'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-primary/10 rounded-xl">
                                        <CreditCard className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Billing Amount</p>
                                        <p className="text-base font-bold">{data?.currency} {data?.amount?.toLocaleString()} / {data?.billingInterval}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Monitor */}
                            <div className="space-y-4 bg-muted/20 p-6 rounded-xl border">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stations Usage</span>
                                    <span className="text-base font-bold">{data?.usage.stations.current ?? 0} / {data?.usage.stations.max ?? 0}</span>
                                </div>
                                <Progress
                                    value={((data?.usage.stations.current ?? 0) / (data?.usage.stations.max || 1)) * 100}
                                    className="h-2"
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-primary" />
                                    {Math.max(0, (data?.usage.stations.max || 0) - (data?.usage.stations.current || 0))} slots remaining
                                </p>
                            </div>
                        </div>

                        {data?.status === 'TRIALING' && data?.trialEndDate && (
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <Zap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-primary">Free Trial Period</p>
                                        <p className="text-xs text-muted-foreground">Expires on {format(new Date(data.trialEndDate), 'MMMM d, yyyy')}</p>
                                    </div>
                                </div>
                                <Button size="sm" className="w-full sm:w-auto font-bold bg-primary hover:bg-primary/90">Upgrade Now</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm border">
                        <CardHeader className="pb-3 border-b bg-muted/30">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary" />
                                Station Slots
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/10">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Station slots</p>
                                    <p className="text-xl font-black text-primary">{data?.usage.stations.max || 0}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Base: 1 | Paid: {(data?.usage.stations.max || 1) - 1}</p>
                                </div>
                            </div>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold">LKR 100,000 / Station</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">One-time setup fee + proportional increase in monthly billing.</p>
                                </div>
                                <Button
                                    className="w-full font-bold h-10 text-[10px] uppercase tracking-widest"
                                    onClick={handleBuyStation}
                                    disabled={isActionLoading}
                                >
                                    Purchase Extra Slot
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-primary text-white overflow-hidden relative shadow-lg">
                        <div className="relative z-10 p-6 space-y-4">
                            <h3 className="text-xl font-bold tracking-tight">PREMIUM</h3>
                            <p className="text-xs opacity-90 font-medium leading-relaxed">Unlock profit analysis, station comparison, credit management, and priority support.</p>
                            <Button
                                variant="secondary"
                                className="w-full h-10 text-xs font-bold uppercase tracking-wider transition-all"
                                onClick={() => handleUpgrade('PREMIUM')}
                                disabled={data?.plan === 'PREMIUM' || isActionLoading}
                            >
                                {data?.plan === 'PREMIUM' ? 'ALL ACCESS GRANTED' : 'Upgrade Now'}
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <Zap className="absolute -bottom-6 -right-6 w-32 h-32 text-white/10 rotate-12" />
                    </Card>
                </div>
            </div>

            {/* Plan Selector */}
            <section className="space-y-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1.5 bg-primary rounded-full" />
                    <h2 className="text-2xl font-bold tracking-tight uppercase">Service Plans</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {PLAN_TIERS.map((tier) => (
                        <Card
                            key={tier.id}
                            className={cn(
                                "relative overflow-hidden transition-all duration-300 border",
                                data?.plan === tier.id
                                    ? "border-primary ring-1 ring-primary shadow-md"
                                    : "hover:border-primary/50"
                            )}
                        >
                            {data?.plan === tier.id && (
                                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 text-[10px] font-bold uppercase tracking-widest">
                                    Current
                                </div>
                            )}
                            <CardHeader className="space-y-2">
                                <CardTitle className="text-xl font-bold uppercase flex items-center gap-2">
                                    <div className={cn("w-2 h-6 rounded-full", tier.color)} title={tier.id} />
                                    {tier.name}
                                </CardTitle>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">LKR {tier.price}</span>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase">/ Month</span>
                                </div>
                                <CardDescription className="text-sm font-medium">{tier.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ul className="space-y-3 min-h-[180px]">
                                    {tier.features.map(f => (
                                        <li key={f} className="flex items-start text-xs gap-3 font-semibold text-muted-foreground">
                                            <div className="bg-primary/10 p-1 rounded-full shrink-0">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className={cn(
                                        "w-full font-bold text-xs h-12 uppercase tracking-widest",
                                        data?.plan === tier.id
                                            ? "bg-muted text-muted-foreground cursor-default hover:bg-muted"
                                            : "bg-primary hover:bg-primary/90 text-white"
                                    )}
                                    disabled={data?.plan === tier.id || isActionLoading}
                                    onClick={() => handleUpgrade(tier.id)}
                                >
                                    {data?.plan === tier.id ? 'Active' : `Activate ${tier.name}`}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Billing History */}
            <section className="space-y-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1.5 bg-primary rounded-full" />
                    <h2 className="text-2xl font-bold tracking-tight uppercase">Billing History</h2>
                </div>
                <Card className="shadow-sm border overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Invoice</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data?.payments && data.payments.length > 0 ? data.payments.map((p: Payment) => (
                                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-bold">{format(new Date(p.billingDate || new Date()), 'MMM d, yyyy')}</td>
                                            <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{p.id.substring(0, 8).toUpperCase()}</td>
                                            <td className="px-6 py-4 font-bold">{p.currency} {p.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="outline" className="font-bold bg-green-500/10 text-green-600 border-green-500/20 px-2 py-0 text-[10px] uppercase">
                                                    {p.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-primary font-bold uppercase text-[10px] h-8">
                                                    Receipt
                                                </Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                <History className="w-10 h-10 mx-auto mb-4 opacity-10" />
                                                <p className="font-bold uppercase tracking-widest text-[10px] opacity-50">No history found</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    )
}
