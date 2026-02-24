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

        const suppliers = await prisma.supplier.findMany({
            where: {
                organizationId: user.organizationId,
                ...(stationId ? { stationId } : {})
            },
            include: {
                _count: {
                    select: { transactions: true, deliveries: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(suppliers)
    } catch (error) {
        console.error('Error fetching suppliers:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch suppliers' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, stationId } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const supplier = await prisma.supplier.create({
            data: {
                name,
                stationId: stationId || null,
                organizationId: user.organizationId,
                currentBalance: 0
            }
        })

        return NextResponse.json(supplier)
    } catch (error) {
        console.error('Error creating supplier:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create supplier' },
            { status: 500 }
        )
    }
}
