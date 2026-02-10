import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateShiftSummary, classifyVariance } from '@/lib/calc'
import { getServerUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            shiftId,
            nozzleId,
            litres,
            reason,
            testTime,
            testedBy,
            returned,
            notes
        } = body

        // Validation
        if (!shiftId || !nozzleId || !litres || !testedBy) {
            return NextResponse.json(
                { error: 'Shift ID, nozzle ID, litres, and tested by are required' },
                { status: 400 }
            )
        }

        // Create the test pour entry
        const testPour = await prisma.testPour.create({
            data: {
                shiftId,
                organizationId: user.organizationId,
                nozzleId,
                amount: parseFloat(litres),
                testType: reason === 'L5' ? 'L5' : reason === 'L50' ? 'L50' : 'L100', // Basic mapping to enum
                timestamp: testTime ? new Date(testTime) : new Date(),
                performedBy: testedBy,
                returned: returned !== undefined ? returned : true,
                notes: notes || reason // Store reason in notes if it doesn't match enum exactly
            }
        })

        return NextResponse.json(testPour, { status: 201 })
    } catch (error) {
        console.error('API Test Pour Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
