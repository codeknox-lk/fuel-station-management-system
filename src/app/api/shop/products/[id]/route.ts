import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const product = await prisma.shopProduct.findUnique({
            where: { id },
            include: {
                batches: {
                    orderBy: { purchaseDate: 'desc' }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error) {
        console.error('Error fetching shop product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name, category, unit, sellingPrice, reorderLevel, isActive } = body

        const product = await prisma.shopProduct.update({
            where: { id },
            data: {
                name,
                category,
                unit,
                sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined,
                reorderLevel: reorderLevel !== undefined ? parseFloat(reorderLevel) : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error('Error updating shop product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // Check if there are any associations (sales, etc)
        const usageCount = await prisma.shopSale.count({
            where: { productId: id }
        })

        if (usageCount > 0) {
            // Soft delete if used
            await prisma.shopProduct.update({
                where: { id },
                data: { isActive: false }
            })
            return NextResponse.json({ message: 'Product de-activated (cannot delete due to history)' })
        }

        await prisma.shopProduct.delete({
            where: { id }
        })

        return NextResponse.json({ message: 'Product deleted successfully' })
    } catch (error) {
        console.error('Error deleting shop product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
