import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check if delivery exists and is pending
        const delivery = await prisma.delivery.findUnique({
            where: { id }
        })

        if (!delivery) {
            return NextResponse.json(
                { error: 'Delivery not found' },
                { status: 404 }
            )
        }

        if (delivery.verificationStatus !== 'PENDING_VERIFICATION') {
            return NextResponse.json(
                { error: 'Only pending deliveries can be deleted' },
                { status: 400 }
            )
        }

        // Delete the delivery
        await prisma.delivery.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete delivery:', error)
        return NextResponse.json(
            { error: 'Failed to delete delivery' },
            { status: 500 }
        )
    }
}
