import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')
        const isActive = searchParams.get('isActive')

        if (!stationId) {
            return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
        }

        // Verify Station belongs to Organization
        const station = await prisma.station.findFirst({
            where: {
                id: stationId,
                organizationId: user.organizationId
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Station not found or access denied' }, { status: 404 })
        }

        const where: Prisma.ShopProductWhereInput = {
            stationId,
            organizationId: user.organizationId
        }

        if (isActive !== null) {
            where.isActive = isActive === 'true'
        }

        const products = await prisma.shopProduct.findMany({
            where,
            include: {
                batches: {
                    where: {
                        currentQuantity: { gt: 0 }
                    },
                    orderBy: {
                        purchaseDate: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json(products)
    } catch (error) {
        console.error('Error fetching shop products:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { stationId, name, category, unit, sellingPrice, reorderLevel } = body

        if (!stationId || !name || sellingPrice === undefined) {
            return NextResponse.json(
                { error: 'Station ID, name, and selling price are required' },
                { status: 400 }
            )
        }

        // Verify Station Ownership
        const station = await prisma.station.findFirst({
            where: {
                id: stationId,
                organizationId: user.organizationId
            }
        })

        if (!station) {
            return NextResponse.json({ error: 'Station not found or access denied' }, { status: 404 })
        }

        const product = await prisma.shopProduct.create({
            data: {
                organizationId: user.organizationId,
                stationId,
                name,
                category,
                unit: unit || 'piece',
                sellingPrice: parseFloat(sellingPrice),
                reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 5,
                isActive: true
            }
        })

        return NextResponse.json(product, { status: 201 })
    } catch (error) {
        console.error('Error creating shop product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
