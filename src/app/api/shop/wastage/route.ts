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
        const stationId = searchParams.get('stationId')

        const where: Prisma.ShopWastageWhereInput = {
            organizationId: user.organizationId
        }
        if (stationId) {
            where.product = { stationId, organizationId: user.organizationId }
        }

        const wastage = await prisma.shopWastage.findMany({
            where,
            include: {
                product: true
            },
            orderBy: {
                timestamp: 'desc'
            }
        })

        return NextResponse.json(wastage)
    } catch (error) {
        console.error('Error fetching shop wastage:', error)
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
        const { productId, quantity, reason } = body

        if (!productId || quantity === undefined || !reason) {
            return NextResponse.json(
                { error: 'Product ID, quantity, and reason are required' },
                { status: 400 }
            )
        }

        const username = user.username

        const result = await prisma.$transaction(async (tx) => {
            // Get the product
            const product = await tx.shopProduct.findUnique({
                where: { id_organizationId: { id: productId, organizationId: user.organizationId } }
            })

            if (!product) throw new Error('Product not found')

            // Record wastage
            const wastage = await tx.shopWastage.create({
                data: {
                    productId,
                    quantity: parseFloat(quantity),
                    reason,
                    costPrice: product.sellingPrice,
                    recordedBy: username,
                    organizationId: user.organizationId
                }
            })

            let remainingToWaste = parseFloat(quantity)
            const activeBatches = await tx.shopPurchaseBatch.findMany({
                where: {
                    productId,
                    organizationId: user.organizationId,
                    currentQuantity: { gt: 0 }
                },
                orderBy: { purchaseDate: 'asc' }
            })

            for (const batch of activeBatches) {
                if (remainingToWaste <= 0) break

                const wasteFromBatch = Math.min(batch.currentQuantity, remainingToWaste)
                await tx.shopPurchaseBatch.update({
                    where: { id_organizationId: { id: batch.id, organizationId: user.organizationId } },
                    data: {
                        currentQuantity: { decrement: wasteFromBatch }
                    }
                })
                remainingToWaste -= wasteFromBatch
            }

            return wastage
        })

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        console.error('Error recording shop wastage:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
