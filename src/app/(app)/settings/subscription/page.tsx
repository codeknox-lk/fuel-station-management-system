'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    CreditCard,
    Check,
    Zap,
    Shield,
    Clock,
    ChevronRight,
    History,
    AlertCircle,
    ArrowLeft
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
    const { organization, refreshOrganization } = useOrganization()
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

    if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading subscription details...</div>

    const PLAN_TIERS = [
        {
            id: 'BASIC',
            name: 'Basic',
            price: '2,500',
            description: 'Core operations for small stations.',
            features: [
                'Up to 2 Stations',
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
                'Up to 10 Stations',
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
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Subscription & Billing</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage your business plan, usage limits, and payment history.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 overflow-hidden shadow-sm">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                    Active Plan: <span className="text-orange-600">{data?.plan}</span>
                                </CardTitle>
                                <CardDescription className="text-base font-medium">
                                    Member since {organization?.id ? 'February 2026' : '...'}
                                </CardDescription>
                            </div>
                            <Badge className={cn(
                                "px-4 py-1.5 text-xs font-bold transition-colors uppercase",
                                data?.status === 'ACTIVE' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                    data?.status === 'TRIALING' ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                        "bg-red-500/10 text-red-600 border-red-500/20"
                            )} variant="outline">
                                {data?.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                        <Clock className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Renewal Date</div>
                                        <div className="text-lg font-bold">
                                            {data?.nextBillingDate ? format(new Date(data.nextBillingDate), 'MMMM d, yyyy') : 'Manual Renewal'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                        <CreditCard className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Billing Amount</div>
                                        <div className="text-lg font-bold">{data?.currency} {data?.amount?.toLocaleString()} / {data?.billingInterval}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Usage Monitor */}
                            <div className="space-y-4 bg-muted/40 p-6 rounded-2xl border-2 border-dashed border-border/60">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Stations Usage</span>
                                    <span className="text-lg font-bold text-foreground">{data?.usage.stations.current ?? 0} / {data?.usage.stations.max ?? 0}</span>
                                </div>
                                <Progress
                                    value={((data?.usage.stations.current ?? 0) / (data?.usage.stations.max || 1)) * 100}
                                    className="h-3 ring-2 ring-background ring-offset-2 ring-offset-muted/40 shadow-inner"
                                    indicatorClassName={cn(
                                        "bg-gradient-to-r transition-all duration-1000",
                                        ((data?.usage.stations.current ?? 0) / (data?.usage.stations.max || 1)) > 0.9 ? "from-red-500 to-red-600" :
                                            ((data?.usage.stations.current ?? 0) / (data?.usage.stations.max || 1)) > 0.7 ? "from-amber-500 to-amber-600" :
                                                "from-emerald-500 to-emerald-600"
                                    )}
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    You have {Math.max(0, (data?.usage.stations.max || 0) - (data?.usage.stations.current || 0))} slots remaining.
                                </p>
                            </div>
                        </div>

                        {data?.status === 'TRIALING' && data?.trialEndDate && (
                            <div className="p-6 bg-orange-600/5 border-2 border-orange-600/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 text-center sm:text-left">
                                    <div className="p-2 bg-orange-600/10 rounded-full animate-pulse shadow-lg shadow-orange-600/10">
                                        <Zap className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <span className="text-lg font-bold text-orange-600 leading-none">Free Trial Period</span>
                                        <p className="text-sm text-muted-foreground font-medium mt-1">Expires on {format(new Date(data.trialEndDate), 'MMMM d, yyyy')}</p>
                                    </div>
                                </div>
                                <Button className="w-full sm:w-auto font-bold h-11 px-8 rounded-xl bg-orange-600 hover:bg-orange-700">Subscribe Now</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Shield className="w-6 h-6 text-orange-600 leading-none" />
                                Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm font-medium text-muted-foreground space-y-4">
                            <p>Payments are processed securely via encrypted gateways (PayHere). We do not store your full card details on our servers.</p>
                            <div className="flex items-center gap-1.5 p-2 bg-green-500/5 text-green-600 rounded-lg border border-green-500/10 text-xs">
                                <Check className="w-3.5 h-3.5" />
                                PCI DSS Compliant Processors
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-600 bg-orange-600 text-white overflow-hidden relative shadow-xl shadow-orange-600/20">
                        <div className="relative z-10 p-6 space-y-4">
                            <h3 className="text-2xl font-bold italic tracking-tighter">PREMIUM</h3>
                            <p className="text-sm font-medium opacity-90">Unlock all features including profit analysis, credit management, and full API access.</p>
                            <Button
                                variant="secondary"
                                className="w-full h-12 font-bold text-orange-600 uppercase tracking-widest hover:bg-white hover:text-orange-700 transition-all border-none"
                                onClick={() => handleUpgrade('PREMIUM')}
                                disabled={data?.plan === 'PREMIUM' || isActionLoading}
                            >
                                {data?.plan === 'PREMIUM' ? 'ALL ACCESS GRANTED' : 'Upgrade Now'}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                        <Zap className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12" />
                    </Card>
                </div>
            </div>

            {/* Plan Selector */}
            <section className="space-y-8 pt-8">
                <div className="flex items-center justify-center gap-4">
                    <div className="h-1 w-20 bg-gradient-to-r from-transparent to-orange-600/30 rounded-full" />
                    <div className="text-center space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground uppercase">Service Plans</h2>
                        <p className="text-muted-foreground font-medium">Simplified pricing for focus and growth.</p>
                    </div>
                    <div className="h-1 w-20 bg-gradient-to-l from-transparent to-orange-600/30 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {PLAN_TIERS.map((tier) => (
                        <Card
                            key={tier.id}
                            className={cn(
                                "relative overflow-hidden transition-all duration-500 hover:shadow-2xl border-2",
                                data?.plan === tier.id
                                    ? "border-orange-600 ring-[6px] ring-orange-600/10 shadow-orange-600/10"
                                    : "border-border hover:border-orange-600/50"
                            )}
                        >
                            {data?.plan === tier.id && (
                                <div className="absolute top-0 right-0 bg-orange-600 text-white px-5 py-1.5 rounded-bl-2xl text-[10px] font-bold uppercase tracking-[0.2em]">
                                    Active
                                </div>
                            )}
                            <CardHeader className="space-y-4">
                                <CardTitle className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
                                    <div className={cn("w-3 h-8 rounded-full shadow-sm", tier.color)} title={tier.id} />
                                    {tier.name}
                                </CardTitle>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-foreground">LKR {tier.price}</span>
                                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">/ mo</span>
                                </div>
                                <CardDescription className="text-base font-medium leading-relaxed">{tier.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 p-6 pt-0">
                                <ul className="space-y-4 min-h-[220px]">
                                    {tier.features.map(f => (
                                        <li key={f} className="flex items-start text-sm gap-3 font-semibold text-muted-foreground">
                                            <div className="bg-orange-600/10 p-1 rounded-full shrink-0 group">
                                                <Check className="w-3.5 h-3.5 text-orange-600" />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className={cn(
                                        "w-full font-bold text-sm h-14 rounded-2xl uppercase tracking-[0.1em] transition-all",
                                        data?.plan === tier.id
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-none cursor-default"
                                            : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
                                    )}
                                    disabled={data?.plan === tier.id || isActionLoading}
                                    onClick={() => handleUpgrade(tier.id)}
                                >
                                    {data?.plan === tier.id ? 'Current Plan' : `Activate ${tier.name}`}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Billing History */}
            <section className="space-y-6 pt-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1.5 bg-orange-600 rounded-full" />
                    <h2 className="text-2xl font-bold tracking-tight uppercase">Billing History</h2>
                </div>
                <Card className="shadow-sm overflow-hidden rounded-2xl">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-[11px] font-bold tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5">Invoice ID</th>
                                        <th className="px-8 py-5">Amount</th>
                                        <th className="px-8 py-5 text-center">Status</th>
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data?.payments && data.payments.length > 0 ? data.payments.map((p: Payment) => (
                                        <tr key={p.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-8 py-6 font-bold">{format(new Date(p.billingDate), 'MMM d, yyyy')}</td>
                                            <td className="px-8 py-6 font-mono text-xs text-muted-foreground">{p.id.substring(0, 8).toUpperCase()}</td>
                                            <td className="px-8 py-6 font-bold text-foreground">{p.currency} {p.amount.toLocaleString()}</td>
                                            <td className="px-8 py-6 text-center">
                                                <Badge variant="outline" className="font-bold bg-green-500/5 text-green-600 border-green-500/20 px-3 uppercase text-[10px]">
                                                    {p.status}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-6 text-right font-bold text-orange-600 cursor-pointer group-hover:underline uppercase tracking-tighter text-xs">
                                                Get Receipt
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-16 text-center text-muted-foreground">
                                                <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                <p className="font-bold uppercase tracking-widest text-xs opacity-50">No billing history found</p>
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
