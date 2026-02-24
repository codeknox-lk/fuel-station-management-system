import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma, SupplierTransactionType } from '@prisma/client'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const { searchParams } = new URL(request.url)

        // Filters
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const typeStr = searchParams.get('type') // PURCHASE, PAYMENT, SETTLEMENT, ADJUSTMENT

        const where: Prisma.SupplierTransactionWhereInput = {
            supplierId: id,
        }

        if (startDate || endDate) {
            where.transactionDate = {}
            if (startDate) where.transactionDate.gte = new Date(startDate)
            if (endDate) where.transactionDate.lte = new Date(endDate)
        }

        if (typeStr && typeStr !== 'all') {
            where.type = typeStr as SupplierTransactionType
        }

        const [transactions, summaryData] = await Promise.all([
            prisma.supplierTransaction.findMany({
                where,
                orderBy: { transactionDate: 'desc' },
                include: {
                    delivery: {
                        select: { invoiceNumber: true, deliveryDate: true }
                    },
                    cheque: {
                        select: { chequeNumber: true, chequeDate: true, status: true }
                    }
                }
            }),
            prisma.supplierTransaction.groupBy({
                by: ['type'],
                where: { supplierId: id },
                _sum: { amount: true },
                _count: true
            })
        ])

        interface GroupingResult {
            type: SupplierTransactionType;
            _sum: { amount: number | null };
            _count: number;
        }

        const typedSummaryData = summaryData as unknown as GroupingResult[]

        // Calculate dynamic summary
        const summary = {
            totalPurchases: typedSummaryData.find(s => s.type === 'PURCHASE')?._sum.amount || 0,
            totalSettlements: typedSummaryData.find(s => s.type === 'SETTLEMENT')?._sum.amount || 0,
            totalAdjustments: typedSummaryData.find(s => s.type === 'ADJUSTMENT')?._sum.amount || 0,
            transactionCount: transactions.length
        }

        return NextResponse.json({ transactions, summary })
    } catch (error) {
        console.error('Error fetching supplier transactions:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch transactions' }, { status: 500 })
    }
}
