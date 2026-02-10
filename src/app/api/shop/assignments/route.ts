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
        const shiftId = searchParams.get('shiftId')
        const stationId = searchParams.get('stationId')

        if (shiftId) {
            const assignment = await prisma.shopAssignment.findUnique({
                where: { shiftId_organizationId: { shiftId, organizationId: user.organizationId } },
                include: {
                    items: {
                        include: { product: true }
                    }
                }
            })
            return NextResponse.json(assignment)
        }

        const where: Prisma.ShopAssignmentWhereInput = {
            organizationId: user.organizationId
        }
        if (stationId) {
            where.shift = { stationId, organizationId: user.organizationId }
        }

        const assignments = await prisma.shopAssignment.findMany({
            where,
            include: {
                shift: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(assignments)
    } catch (error) {
        console.error('Error fetching shop assignments:', error)
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
        const { shiftId, pumperId, pumperName, productIds } = body

        if (!shiftId || !pumperId || !pumperName) {
            return NextResponse.json(
                { error: 'Shift ID, pumper ID, and pumper name are required' },
                { status: 400 }
            )
        }

        const assignment = await prisma.$transaction(async (tx) => {
            // Create the main assignment
            const newAssignment = await tx.shopAssignment.create({
                data: {
                    shiftId,
                    pumperId,
                    pumperName,
                    status: 'OPEN',
                    organizationId: user.organizationId
                }
            })

            // Get current stock for all selected products
            const products = await tx.shopProduct.findMany({
                where: {
                    id: { in: productIds || [] },
                    isActive: true,
                    organizationId: user.organizationId
                }
            })

            for (const product of products) {
                const batchStock = await tx.shopPurchaseBatch.aggregate({
                    where: {
                        productId: product.id,
                        currentQuantity: { gt: 0 },
                        organizationId: user.organizationId
                    },
                    _sum: {
                        currentQuantity: true
                    }
                })

                const openingStock = batchStock._sum.currentQuantity || 0

                await tx.shopShiftItem.create({
                    data: {
                        assignmentId: newAssignment.id,
                        productId: product.id,
                        openingStock,
                        addedStock: 0,
                        soldQuantity: 0,
                        revenue: 0,
                        organizationId: user.organizationId
                    }
                })
            }

            return newAssignment
        })

        return NextResponse.json(assignment, { status: 201 })
    } catch (error) {
        console.error('Error creating shop assignment:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
