import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET: Reconcile bank balance
 * Calculates balance from transactions and compares with expected balance
 * Returns discrepancies if any
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const bankId = searchParams.get('bankId')
        const stationId = searchParams.get('stationId')

        if (!bankId) {
            return NextResponse.json(
                { error: 'Bank ID is required' },
                { status: 400 }
            )
        }

        // Get bank
        const bank = await prisma.bank.findUnique({
            where: { id: bankId },
            include: {
                deposits: true,
                cheques: true
            }
        })

        if (!bank) {
            return NextResponse.json(
                { error: 'Bank not found' },
                { status: 404 }
            )
        }

        // Get credit payments for this bank
        const creditPayments = await prisma.creditPayment.findMany({
            where: {
                bankId,
                ...(stationId ? { stationId } : {})
            }
        })

        // Get manual bank transactions
        const bankTransactions = await prisma.bankTransaction.findMany({
            where: {
                bankId,
                ...(stationId ? { stationId } : {})
            }
        })

        // Calculate components
        const totalDeposits = bank.deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

        const clearedCheques = bank.cheques
            .filter(cheque => cheque.status === 'CLEARED')
            .reduce((sum, cheque) => sum + cheque.amount, 0)

        const pendingCheques = bank.cheques
            .filter(cheque => cheque.status === 'PENDING' || cheque.status === 'DEPOSITED')
            .reduce((sum, cheque) => sum + cheque.amount, 0)

        const bouncedCheques = bank.cheques
            .filter(cheque => cheque.status === 'BOUNCED')
            .reduce((sum, cheque) => sum + cheque.amount, 0)

        const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + payment.amount, 0)

        const manualDeposits = bankTransactions
            .filter(t => ['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(t.type) && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0)

        const manualWithdrawals = bankTransactions
            .filter(t => ['WITHDRAWAL', 'TRANSFER_OUT', 'FEE'].includes(t.type))
            .reduce((sum, t) => sum + t.amount, 0)

        // Calculate current balance (only cleared cheques count)
        const calculatedBalance = totalDeposits + clearedCheques + totalCreditPayments + manualDeposits - manualWithdrawals

        // Calculate expected balance if all pending cheques clear
        const expectedBalanceIfCleared = calculatedBalance + pendingCheques

        const result = {
            bankId,
            bankName: bank.name,
            accountNumber: bank.accountNumber,
            reconciliation: {
                currentBalance: calculatedBalance,
                expectedBalanceIfCleared,
                pendingAmount: pendingCheques
            },
            breakdown: {
                deposits: {
                    count: bank.deposits.length,
                    total: totalDeposits
                },
                cheques: {
                    cleared: {
                        count: bank.cheques.filter(c => c.status === 'CLEARED').length,
                        total: clearedCheques
                    },
                    pending: {
                        count: bank.cheques.filter(c => c.status === 'PENDING' || c.status === 'DEPOSITED').length,
                        total: pendingCheques
                    },
                    bounced: {
                        count: bank.cheques.filter(c => c.status === 'BOUNCED').length,
                        total: bouncedCheques
                    }
                },
                creditPayments: {
                    count: creditPayments.length,
                    total: totalCreditPayments
                },
                manualTransactions: {
                    deposits: {
                        count: bankTransactions.filter(t => ['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(t.type)).length,
                        total: manualDeposits
                    },
                    withdrawals: {
                        count: bankTransactions.filter(t => ['WITHDRAWAL', 'TRANSFER_OUT', 'FEE'].includes(t.type)).length,
                        total: manualWithdrawals
                    }
                }
            },
            formula: `${totalDeposits} (deposits) + ${clearedCheques} (cleared cheques) + ${totalCreditPayments} (credit payments) + ${manualDeposits} (manual deposits) - ${manualWithdrawals} (withdrawals) = ${calculatedBalance}`,
            warnings: [] as string[]
        }

        // Add warnings
        if (bouncedCheques > 0) {
            result.warnings.push(`${bank.cheques.filter(c => c.status === 'BOUNCED').length} bounced cheque(s) totaling Rs.${(bouncedCheques || 0).toLocaleString()}`)
        }

        if (pendingCheques > 0) {
            result.warnings.push(`${bank.cheques.filter(c => c.status === 'PENDING' || c.status === 'DEPOSITED').length} pending cheque(s) totaling Rs.${(pendingCheques || 0).toLocaleString()}`)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error reconciling bank balance:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
