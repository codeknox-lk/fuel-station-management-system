import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')
        const productId = searchParams.get('productId')

        const where: Prisma.ShopPurchaseBatchWhereInput = {}
        if (stationId) {
            where.product = { stationId }
        }
        if (productId) {
            where.productId = productId
        }

        const purchases = await prisma.shopPurchaseBatch.findMany({
            where,
            include: {
                product: true
            },
            orderBy: {
                purchaseDate: 'desc'
            }
        })

        return NextResponse.json(purchases)
    } catch (error) {
        console.error('Error fetching shop purchases:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            productId,
            costPrice,
            quantity,
            expiryDate,
            supplierId,
            createExpense,
            bankId, // Required if createExpense is true
            stationId // Required if createExpense is true
        } = body

        if (!productId || costPrice === undefined || quantity === undefined) {
            return NextResponse.json(
                { error: 'Product ID, cost price, and quantity are required' },
                { status: 400 }
            )
        }

        const currentUser = await getServerUser()
        const username = currentUser ? currentUser.username : 'System'

        // Create the batch in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const batch = await tx.shopPurchaseBatch.create({
                data: {
                    productId,
                    costPrice: parseFloat(costPrice),
                    originalQuantity: parseFloat(quantity),
                    currentQuantity: parseFloat(quantity),
                    expiryDate: expiryDate ? new Date(expiryDate) : null,
                    supplierId,
                    recordedBy: username
                }
            })

            // Financial integration
            if (createExpense && stationId) {
                await tx.expense.create({
                    data: {
                        stationId,
                        category: 'Shop Inventory',
                        description: `Stock Purchase: ${batch.id}`,
                        amount: parseFloat(costPrice) * parseFloat(quantity),
                        expenseDate: new Date(),
                        paidBy: username,
                        fromSafe: !bankId // This logic might need review if bankId is not stored on Expense
                    }
                })
            }

            return batch
        })

        return NextResponse.json(result, { status: 201 })
    } catch (error) {
        console.error('Error recording shop purchase:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
