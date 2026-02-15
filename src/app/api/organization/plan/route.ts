import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth-server'
import { getOrganizationPlan, canAddStation } from '@/lib/plans'

export async function GET() {
    try {
        const user = await getServerUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const plan = await getOrganizationPlan(user.organizationId)
        const limits = await canAddStation(user.organizationId)

        return NextResponse.json({
            plan: plan.plan,
            status: plan.status,
            limits: {
                currentStations: limits.currentCount,
                maxStations: limits.maxStations,
                canAdd: limits.allowed
            }
        })
    } catch (error) {
        console.error('Error fetching plan details:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
