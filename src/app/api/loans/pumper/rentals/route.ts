import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')

        // Find all active pumper loans for this organization
        const activeLoans = await prisma.loanPumper.findMany({
            where: {
                organizationId: user.organizationId,
                status: 'ACTIVE',
                ...(stationId ? { stationId } : {})
            },
            select: {
                pumperName: true,
                monthlyRental: true
            }
        })

        // Group by pumperName and sum rentals
        const rentalsMap: Record<string, number> = {}
        activeLoans.forEach(loan => {
            const name = loan.pumperName
            rentalsMap[name] = (rentalsMap[name] || 0) + (loan.monthlyRental || 0)
        })

        return NextResponse.json(rentalsMap)
    } catch (error) {
        console.error('Error fetching pumper loan rentals:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
