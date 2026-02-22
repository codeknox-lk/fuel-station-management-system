'use client'

import { useOrganization } from '@/contexts/OrganizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, CreditCard, ShieldCheck, Crown } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export default function OrganizationSettingsPage() {
    const { organization, isLoading } = useOrganization()

    if (isLoading) {
        return <div className="p-8">Loading organization details...</div>
    }

    if (!organization) {
        return <div className="p-8">Organization not found.</div>
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-primary" />
                    Organization Profile
                </h1>
                <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
                    Manage your organization details and subscription.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Profile Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">{organization.name}</h3>
                                <p className="text-sm text-muted-foreground">ID: {organization.slug}</p>
                            </div>
                            <Badge
                                className={cn(
                                    "text-sm px-3 py-1 border-none shadow-none",
                                    organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE'
                                        ? "bg-orange-500 text-white hover:bg-orange-600"
                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                )}
                            >
                                {(organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE') && (
                                    <Crown className="w-3 h-3 mr-1.5 fill-white" />
                                )}
                                {organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE'
                                    ? (organization.plan as string) === 'ENTERPRISE'
                                        ? 'Enterprise Plan'
                                        : 'Premium Plan'
                                    : 'Basic Plan'}
                            </Badge>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Organization ID</label>
                                <div className="font-mono text-sm bg-muted p-2 rounded mt-1">{organization.id}</div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Slug</label>
                                <div className="font-mono text-sm bg-muted p-2 rounded mt-1">{organization.slug}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Plan / Subscription Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            Subscription
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className={cn(
                            "p-4 rounded-lg border",
                            organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE'
                                ? "bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900"
                                : "bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className={cn(
                                    "h-4 w-4",
                                    organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE'
                                        ? "text-orange-600"
                                        : "text-slate-500"
                                )} />
                                <span className={cn(
                                    "font-semibold",
                                    organization.plan === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE'
                                        ? "text-orange-700 dark:text-orange-400"
                                        : "text-slate-700 dark:text-slate-400"
                                )}>Active</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Your <strong>{organization.plan}</strong> plan is active.
                            </p>
                        </div>

                        <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Next Billing Date</span>
                                <span className="font-medium">--</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount</span>
                                <span className="font-medium">--</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
