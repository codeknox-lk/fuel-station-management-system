'use client'

import { useOrganization } from '@/contexts/OrganizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, CreditCard, ShieldCheck } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

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
                <h1 className="text-3xl font-bold text-foreground">Organization Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your organization details and subscription
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Profile Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-purple-600" />
                            Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">{organization.name}</h3>
                                <p className="text-sm text-muted-foreground">ID: {organization.slug}</p>
                            </div>
                            <Badge variant={organization.plan === 'ENTERPRISE' ? 'default' : 'secondary'} className="text-sm">
                                {organization.plan} PLAN
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
                            <CreditCard className="h-5 w-5 text-green-600" />
                            Subscription
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-700 dark:text-green-400">Active</span>
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
