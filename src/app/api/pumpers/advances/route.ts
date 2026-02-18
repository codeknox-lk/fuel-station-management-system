import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date')
        const date = dateParam ? new Date(dateParam) : new Date()

        // Get start and end of the month
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

        // Fetch all closed shifts for the month
        const shifts = await prisma.shift.findMany({
            where: {
                organizationId: user.organizationId,
                status: 'CLOSED',
                startTime: {
                    gte: startOfMonth,
                    lte: endOfMonth
                },
                declaredAmounts: {
                    not: Prisma.DbNull
                }
            },
            select: {
                declaredAmounts: true
            }
        })

        const advancesByName: Record<string, number> = {}

        for (const shift of shifts) {
            // Use type assertion for the JSON field
            // Use type assertion for the JSON field
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const declared = shift.declaredAmounts as any
            // Check if pumperBreakdowns exists inside the JSON
            if (declared && declared.pumperBreakdowns && Array.isArray(declared.pumperBreakdowns)) {
                for (const breakdown of declared.pumperBreakdowns) {
                    if (breakdown.pumperName && breakdown.advanceTaken > 0) {
                        advancesByName[breakdown.pumperName] = (advancesByName[breakdown.pumperName] || 0) + breakdown.advanceTaken
                    }
                }
            }
        }

        return NextResponse.json(advancesByName)
    } catch (error) {
        console.error('Error fetching pumper advances:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
