import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id

        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { transactionDate: 'desc' },
                    take: 50,
                    include: {
                        delivery: {
                            select: { invoiceNumber: true, deliveryDate: true }
                        },
                        cheque: {
                            select: { chequeNumber: true, chequeDate: true, status: true }
                        }
                    }
                },
                _count: {
                    select: { deliveries: true }
                }
            }
        })

        if (!supplier) {
            return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
        }

        return NextResponse.json(supplier)
    } catch (error: any) {
        console.error('Error fetching supplier details:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch supplier details' }, { status: 500 })
    }
}
