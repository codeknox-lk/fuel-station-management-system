import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { getOrganizationPlan } from '@/lib/plans'

export async function GET() {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const orgId = user.organizationId

        // 1. Get Plan & Subscription Details
        const planDetails = await getOrganizationPlan(orgId)

        // 2. Get Usage Data
        const stationCount = await prisma.station.count({
            where: { organizationId: orgId, isActive: true }
        })

        // 3. Get Payment History
        const payments = await prisma.subscriptionPayment.findMany({
            where: { organizationId: orgId },
            orderBy: { billingDate: 'desc' },
            take: 10
        })

        return NextResponse.json({
            ...planDetails,
            usage: {
                stations: {
                    current: stationCount,
                    max: planDetails.maxStations
                }
            },
            payments
        })
    } catch (error) {
        console.error('Failed to fetch subscription:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * Mock Upgrade Endpoint
 * In production, this would initiate a Stripe/PayHere session
 */
export async function POST(request: Request) {
    try {
        const user = await getServerUser()
        if (!user || (user.role !== 'OWNER' && user.role !== 'DEVELOPER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { planId, interval } = body

        if (!planId || !interval) {
            return NextResponse.json({ error: 'Plan and interval are required' }, { status: 400 })
        }

        // Mocking a successful upgrade logic
        // In reality, this would return a checkout URL
        const updatedSub = await prisma.subscription.upsert({
            where: { organizationId: user.organizationId },
            update: {
                planId,
                billingInterval: interval,
                status: 'ACTIVE',
                amount: planId === 'PREMIUM' ? 5000 : 2500,
                maxStations: planId === 'PREMIUM' ? 10 : 2
            },
            create: {
                organizationId: user.organizationId,
                planId,
                billingInterval: interval,
                status: 'ACTIVE',
                amount: planId === 'PREMIUM' ? 5000 : 2500,
                maxStations: planId === 'PREMIUM' ? 10 : 2
            }
        })

        // Also update the organization plan field for simplicity/legacy support
        await prisma.organization.update({
            where: { id: user.organizationId },
            data: { plan: planId }
        })

        return NextResponse.json({ success: true, subscription: updatedSub })
    } catch (error) {
        console.error('Upgrade failed:', error)
        return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 })
    }
}
