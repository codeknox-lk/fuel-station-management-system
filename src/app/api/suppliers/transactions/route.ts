import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CreateSupplierTransactionSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'
import { BankTransactionType, SupplierTransactionType } from '@prisma/client'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Zod Validation
        const validation = CreateSupplierTransactionSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid input data', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const {
            supplierId,
            type, // SETTLEMENT or ADJUSTMENT
            amount,
            description,
            paymentMethod, // SAFE (CASH), CHEQUE, BANK_TRANSFER, OTHER
            bankId,
            chequeNumber,
            chequeDate,
            stationId,
            recordedBy
        } = validation.data

        const currentUser = await getServerUser()
        const organizationId = currentUser?.organizationId || null
        const userName = currentUser?.username || recordedBy || 'System'

        const result = await prisma.$transaction(async (tx) => {
            const supplier = await tx.supplier.findUnique({
                where: { id: supplierId },
                select: { currentBalance: true }
            })

            if (!supplier) throw new Error('Supplier not found')

            const balanceBefore = supplier.currentBalance
            // Logic: PURCHASE/ADJUSTMENT adds to debt (+), SETTLEMENT reduces debt (-)
            const balanceAfter = type === 'SETTLEMENT'
                ? balanceBefore - amount
                : balanceBefore + amount

            const supplierTransaction = await tx.supplierTransaction.create({
                data: {
                    supplierId,
                    type: type as SupplierTransactionType,
                    amount,
                    balanceBefore,
                    balanceAfter,
                    description: description || null,
                    recordedBy: userName,
                    organizationId,
                    transactionDate: new Date(),
                }
            })

            await tx.supplier.update({
                where: { id: supplierId },
                data: { currentBalance: balanceAfter }
            })

            if (type === 'SETTLEMENT' && paymentMethod) {
                if (paymentMethod === 'CHEQUE') {
                    if (!bankId || !chequeNumber || !chequeDate || !stationId) {
                        throw new Error('Cheque details and Station ID are required for cheque payment')
                    }
                    const cheque = await tx.cheque.create({
                        data: {
                            chequeNumber,
                            amount,
                            bankId,
                            receivedFrom: `Payment to Supplier: ${supplierId}`,
                            receivedDate: new Date(),
                            chequeDate: new Date(chequeDate),
                            recordedBy: userName,
                            stationId: stationId,
                            organizationId,
                            status: 'PENDING'
                        }
                    })

                    await tx.supplierTransaction.update({
                        where: { id: supplierTransaction.id },
                        data: { chequeId: cheque.id }
                    })
                } else if (paymentMethod === 'CASH' || paymentMethod === 'SAFE') {
                    if (!stationId) throw new Error('Station ID required for cash payment')

                    const safe = await tx.safe.findUnique({ where: { stationId } })
                    if (!safe) throw new Error('Safe not found for station')

                    const safeBalanceBefore = safe.currentBalance
                    const safeBalanceAfter = safeBalanceBefore - amount

                    await tx.safeTransaction.create({
                        data: {
                            safeId: safe.id,
                            type: 'FUEL_DELIVERY_PAYMENT',
                            amount,
                            balanceBefore: safeBalanceBefore,
                            balanceAfter: safeBalanceAfter,
                            description: description || `Payment to Supplier: ${supplierId}`,
                            performedBy: userName,
                            timestamp: new Date(),
                            organizationId,
                        }
                    })

                    await tx.safe.update({
                        where: { id: safe.id },
                        data: { currentBalance: safeBalanceAfter }
                    })
                } else if (paymentMethod === 'BANK_TRANSFER') {
                    if (!bankId) throw new Error('Bank ID required for bank transfer')

                    const bank = await tx.bank.findUnique({ where: { id: bankId } })
                    if (!bank) throw new Error('Bank account not found')

                    const bankBalanceBefore = bank.currentBalance || 0
                    const bankBalanceAfter = bankBalanceBefore - amount

                    await tx.bankTransaction.create({
                        data: {
                            bankId,
                            stationId: stationId || null,
                            type: 'WITHDRAWAL' as BankTransactionType,
                            amount,
                            balanceBefore: bankBalanceBefore,
                            balanceAfter: bankBalanceAfter,
                            description: description || `Bank Transfer to Supplier: ${supplierId}`,
                            createdBy: userName,
                            transactionDate: new Date(),
                            organizationId,
                            notes: `Direct settlement for supplier ${supplierId}`
                        }
                    })

                    await tx.bank.update({
                        where: { id: bankId },
                        data: { currentBalance: bankBalanceAfter }
                    })
                }
            }

            return supplierTransaction
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error recording supplier transaction:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to record transaction' },
            { status: 500 }
        )
    }
}
