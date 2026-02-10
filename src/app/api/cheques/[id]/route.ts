import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getServerUser } from '@/lib/auth-server'

const UpdateChequeSchema = z.object({
    chequeNumber: z.string().optional(),
    chequeDate: z.string().optional(),
    bankId: z.string().optional(),
    amount: z.number().optional()
})

export async function PATCH(
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
        const result = UpdateChequeSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }

        const cheque = await prisma.cheque.findUnique({
            where: { id_organizationId: { id, organizationId: user.organizationId } }
        })

        if (!cheque) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })

        if (cheque.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only PENDING cheques can be edited' }, { status: 400 })
        }

        const { chequeDate, ...rest } = result.data

        await prisma.cheque.update({
            where: { id_organizationId: { id, organizationId: user.organizationId } },
            data: {
                ...rest,
                chequeDate: chequeDate ? new Date(chequeDate) : undefined
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating cheque:', error)
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

        const cheque = await prisma.cheque.findUnique({
            where: { id_organizationId: { id, organizationId: user.organizationId } },
            include: { creditPayment: true }
        })

        if (!cheque) return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })

        if (cheque.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only PENDING cheques can be deleted' }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
            // Delete Credit Payment if linked
            if (cheque.creditPaymentId) {
                await tx.creditPayment.delete({
                    where: { id_organizationId: { id: cheque.creditPaymentId, organizationId: user.organizationId } }
                })
            }

            // Delete Cheque
            await tx.cheque.delete({
                where: { id_organizationId: { id, organizationId: user.organizationId } }
            })
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting cheque:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
