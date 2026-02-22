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
        const { planId, interval, action } = body

        // 1. Handle "ADD_STATION" (One-time 1 Lakh charge)
        if (action === 'ADD_STATION') {
            const updatedSub = await prisma.subscription.upsert({
                where: { organizationId: user.organizationId },
                update: {
                    paidStations: { increment: 1 }
                },
                create: {
                    organizationId: user.organizationId,
                    planId: 'BASIC',
                    paidStations: 1,
                    status: 'ACTIVE'
                }
            })

            // Record the ONE-TIME setup fee payment
            await prisma.subscriptionPayment.create({
                data: {
                    organizationId: user.organizationId,
                    amount: 100000,
                    currency: 'LKR',
                    status: 'SUCCESS',
                    provider: 'STRIPE', // Simplified for demo
                    billingDate: new Date(),
                }
            })

            return NextResponse.json({ success: true, subscription: updatedSub })
        }

        if (!planId || !interval) {
            return NextResponse.json({ error: 'Plan and interval are required' }, { status: 400 })
        }

        // Mocking a successful upgrade logic
        // In reality, this would return a checkout URL
        const currentSub = await prisma.subscription.findUnique({
            where: { organizationId: user.organizationId }
        })

        const paidStations = currentSub?.paidStations || 0
        const baseAmount = planId === 'PREMIUM' ? 5000 : 2500
        const totalAmount = baseAmount * (1 + paidStations)

        const updatedSub = await prisma.subscription.upsert({
            where: { organizationId: user.organizationId },
            update: {
                planId,
                billingInterval: interval,
                status: 'ACTIVE',
                amount: totalAmount,
                maxStations: 1 + paidStations
            },
            create: {
                organizationId: user.organizationId,
                planId,
                billingInterval: interval,
                status: 'ACTIVE',
                amount: totalAmount,
                maxStations: 1 + paidStations,
                paidStations: 0
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
