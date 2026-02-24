import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function getAuthenticatedStationContext(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return { errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
        }

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')

        if (!stationId) {
            return { errorResponse: NextResponse.json({ error: 'Station ID is required' }, { status: 400 }) }
        }

        // Handle "all" station context (organization level reports)
        if (stationId !== 'all') {
            const station = await prisma.station.findUnique({
                where: { id: stationId },
                select: { organizationId: true }
            })

            if (!station || station.organizationId !== user.organizationId) {
                return { errorResponse: NextResponse.json({ error: 'Station not found or access denied' }, { status: 403 }) }
            }
        }

        return {
            user,
            stationId,
            organizationId: user.organizationId,
            searchParams,
            errorResponse: null
        }
    } catch (error) {
        console.error('API Context Error:', error)
        return { errorResponse: NextResponse.json({ error: 'Internal server error checking auth' }, { status: 500 }) }
    }
}
