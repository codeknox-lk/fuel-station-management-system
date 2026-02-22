import { prisma } from '@/lib/db'

// PLAN_FEATURES and hasFeature moved to @/lib/features for client-side compatibility

export async function getOrganizationPlan(organizationId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            plan: true,
            subscription: {
                select: {
                    maxStations: true,
                    paidStations: true,
                    planId: true,
                    status: true,
                    trialEndDate: true,
                    nextBillingDate: true,
                    amount: true,
                    currency: true,
                    billingInterval: true
                }
            }
        }
    })

    // Default to BASIC if no plan found, but respect DB plan
    // If subscription exists, use its planId, otherwise use organization level plan field
    const planType = org?.subscription?.planId || org?.plan || 'BASIC'
    const sub = org?.subscription

    // New Per-Station Logic:
    // Base is 1 station. Total stations = 1 + paidStations.
    // Price = Base Price * Total Stations
    const baseAmount = planType === 'PREMIUM' ? 5000 : 2500
    const totalStations = 1 + (sub?.paidStations || 0)
    const computedAmount = baseAmount * totalStations

    return {
        plan: planType,
        maxStations: totalStations,
        paidStations: sub?.paidStations || 0,
        status: sub?.status || 'ACTIVE',
        trialEndDate: sub?.trialEndDate || null,
        nextBillingDate: sub?.nextBillingDate || null,
        amount: computedAmount,
        currency: sub?.currency || 'LKR',
        billingInterval: sub?.billingInterval || 'MONTH'
    }
}

export async function canAddStation(organizationId: string): Promise<{ allowed: boolean; currentCount: number; maxStations: number }> {
    const { maxStations } = await getOrganizationPlan(organizationId)

    const currentCount = await prisma.station.count({
        where: { organizationId, isActive: true }
    })

    return {
        allowed: currentCount < maxStations,
        currentCount,
        maxStations
    }
}

// hasFeature moved to @/lib/features
