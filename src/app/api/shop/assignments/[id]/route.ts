import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { items } = body // { id: itemId, closingStock: number }[]

        const assignment = await prisma.shopAssignment.findUnique({
            where: { id },
            include: { items: { include: { product: true } } }
        })

        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        const closeResult = await prisma.$transaction(async (tx) => {
            let totalAssignmentRevenue = 0

            for (const itemUpdate of items) {
                const item = assignment.items.find(i => i.id === itemUpdate.id)
                if (!item) continue

                const closingStock = itemUpdate.closingStock
                const soldQuantity = (item.openingStock + item.addedStock) - closingStock

                if (soldQuantity < 0) {
                    throw new Error(`Invalid closing stock for ${item.product.name}. Sold quantity cannot be negative.`)
                }

                if (soldQuantity === 0) {
                    await tx.shopShiftItem.update({
                        where: { id: item.id },
                        data: { closingStock, soldQuantity: 0, revenue: 0 }
                    })
                    continue
                }

                // Calculate revenue
                const itemRevenue = soldQuantity * item.product.sellingPrice
                totalAssignmentRevenue += itemRevenue

                // FIFO Logic for Sales
                let remainingToSell = soldQuantity

                // Get batches for this product with stock, sorted by purchase date (FIFO)
                const batches = await tx.shopPurchaseBatch.findMany({
                    where: { productId: item.productId, currentQuantity: { gt: 0 } },
                    orderBy: { purchaseDate: 'asc' }
                })

                for (const batch of batches) {
                    if (remainingToSell <= 0) break

                    const sellFromBatch = Math.min(batch.currentQuantity, remainingToSell)

                    // Create ShopSale record
                    await tx.shopSale.create({
                        data: {
                            assignmentId: assignment.id,
                            productId: item.productId,
                            batchId: batch.id,
                            quantity: sellFromBatch,
                            unitPrice: item.product.sellingPrice,
                            totalAmount: sellFromBatch * item.product.sellingPrice,
                            costPrice: batch.costPrice
                        }
                    })

                    // Update batch quantity
                    await tx.shopPurchaseBatch.update({
                        where: { id: batch.id },
                        data: { currentQuantity: { decrement: sellFromBatch } }
                    })

                    remainingToSell -= sellFromBatch
                }

                // If still remainingToSell > 0, it means we sold more than we had in tracked batches
                // (inventory discrepancy). We still record the sale but without a batch link.
                if (remainingToSell > 0) {
                    await tx.shopSale.create({
                        data: {
                            assignmentId: assignment.id,
                            productId: item.productId,
                            quantity: remainingToSell,
                            unitPrice: item.product.sellingPrice,
                            totalAmount: remainingToSell * item.product.sellingPrice,
                            costPrice: 0 // Unknown cost
                        }
                    })
                }

                // Update shift item
                await tx.shopShiftItem.update({
                    where: { id: item.id },
                    data: {
                        closingStock,
                        soldQuantity,
                        revenue: itemRevenue
                    }
                })
            }

            // Update assignment status
            return await tx.shopAssignment.update({
                where: { id: assignment.id },
                data: {
                    status: 'CLOSED',
                    totalRevenue: totalAssignmentRevenue,
                    updatedAt: new Date()
                }
            })
        })

        return NextResponse.json(closeResult)
    } catch (error: unknown) {
        console.error('Error closing shop assignment:', error)
        const errorMessage = error instanceof Error ? error.message : 'Internal server error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
