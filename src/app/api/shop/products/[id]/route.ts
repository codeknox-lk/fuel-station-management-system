import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const product = await prisma.shopProduct.findUnique({
            where: { id_organizationId: { id, organizationId: user.organizationId } },
            include: {
                batches: {
                    where: { organizationId: user.organizationId },
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
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, category, unit, sellingPrice, reorderLevel, isActive } = body

        // Verify product existence and ownership
        const existing = await prisma.shopProduct.findUnique({
            where: { id_organizationId: { id, organizationId: user.organizationId } }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = await prisma.shopProduct.update({
            where: { id_organizationId: { id, organizationId: user.organizationId } },
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
        const user = await getServerUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if there are any associations (sales, etc)
        const usageCount = await prisma.shopSale.count({
            where: { productId: id, organizationId: user.organizationId }
        })

        if (usageCount > 0) {
            // Soft delete if used
            await prisma.shopProduct.update({
                where: { id_organizationId: { id, organizationId: user.organizationId } },
                data: { isActive: false }
            })
            return NextResponse.json({ message: 'Product de-activated (cannot delete due to history)' })
        }

        await prisma.shopProduct.delete({
            where: { id_organizationId: { id, organizationId: user.organizationId } }
        })

        return NextResponse.json({ message: 'Product deleted successfully' })
    } catch (error) {
        console.error('Error deleting shop product:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
