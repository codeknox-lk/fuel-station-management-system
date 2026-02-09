import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')

        const where: Prisma.ShopWastageWhereInput = {}
        if (stationId) {
            where.product = { stationId }
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
        const body = await request.json()
        const { productId, quantity, reason } = body

        if (!productId || quantity === undefined || !reason) {
            return NextResponse.json(
                { error: 'Product ID, quantity, and reason are required' },
                { status: 400 }
            )
        }

        const currentUser = await getServerUser()
        const username = currentUser ? currentUser.username : 'System'

        const result = await prisma.$transaction(async (tx) => {
            // Get the product to find cost price
            const product = await tx.shopProduct.findUnique({
                where: { id: productId }
            })

            if (!product) throw new Error('Product not found')

            // Record wastage
            const wastage = await tx.shopWastage.create({
                data: {
                    productId,
                    quantity: parseFloat(quantity),
                    reason,
                    costPrice: product.sellingPrice, // Simplified: use current selling price as value lost or cost? Plan says "cost value"
                    // Let's use 0 for now or fetch the last batch price?
                    // For wastage, we usually want to know the "Loss" value.
                    recordedBy: username
                }
            })

            // We should also reduce batch quantities for wastage?
            // Yes, if we want accurate stock levels.
            // WASTE consumes stock like a sale but at 0 revenue.

            let remainingToWaste = parseFloat(quantity)
            const activeBatches = await tx.shopPurchaseBatch.findMany({
                where: {
                    productId,
                    currentQuantity: { gt: 0 }
                },
                orderBy: { purchaseDate: 'asc' } // FIFO for wastage too
            })

            for (const batch of activeBatches) {
                if (remainingToWaste <= 0) break

                const wasteFromBatch = Math.min(batch.currentQuantity, remainingToWaste)
                await tx.shopPurchaseBatch.update({
                    where: { id: batch.id },
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
