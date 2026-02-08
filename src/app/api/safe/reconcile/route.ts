import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET: Reconcile safe balance
 * Calculates balance from transactions and compares with stored balance
 * Returns discrepancies if any
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const stationId = searchParams.get('stationId')

        if (!stationId) {
            return NextResponse.json(
                { error: 'Station ID is required' },
                { status: 400 }
            )
        }

        // Get safe
        const safe = await prisma.safe.findUnique({
            where: { stationId }
        })

        if (!safe) {
            return NextResponse.json(
                { error: 'Safe not found for this station' },
                { status: 404 }
            )
        }

        // Get all transactions for this safe, ordered chronologically
        const allTransactions = await prisma.safeTransaction.findMany({
            where: { safeId: safe.id },
            orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        // Calculate balance from transactions
        let calculatedBalance = safe.openingBalance
        let lastOpeningBalance = safe.openingBalance

        for (const tx of allTransactions) {
            if (tx.type === 'OPENING_BALANCE') {
                // OPENING_BALANCE sets the balance to this value
                calculatedBalance = tx.amount
                lastOpeningBalance = tx.amount
            } else {
                // Regular transactions add or subtract
                const txIsIncome = [
                    'CASH_FUEL_SALES',
                    'POS_CARD_PAYMENT',
                    'CREDIT_PAYMENT',
                    'LOAN_REPAID'
                ].includes(tx.type)

                calculatedBalance += txIsIncome ? tx.amount : -tx.amount
            }
        }

        // Compare calculated balance with stored balance
        const storedBalance = safe.currentBalance
        const discrepancy = calculatedBalance - storedBalance

        // Calculate transaction summary
        const incomeTransactions = allTransactions.filter(tx =>
            ['CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'LOAN_REPAID'].includes(tx.type)
        )
        const expenseTransactions = allTransactions.filter(tx =>
            ['EXPENSE', 'BANK_DEPOSIT', 'LOAN_GIVEN'].includes(tx.type)
        )

        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
        const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)

        const result = {
            stationId,
            safeId: safe.id,
            reconciliation: {
                storedBalance,
                calculatedBalance,
                discrepancy,
                isBalanced: Math.abs(discrepancy) < 0.01, // Allow for floating point precision
                lastOpeningBalance
            },
            summary: {
                totalTransactions: allTransactions.length,
                totalIncome,
                totalExpenses,
                incomeCount: incomeTransactions.length,
                expenseCount: expenseTransactions.length
            },
            formula: `${lastOpeningBalance} + ${totalIncome} - ${totalExpenses} = ${calculatedBalance}`,
            message: Math.abs(discrepancy) < 0.01
                ? 'Balance is reconciled ✓'
                : `Discrepancy found: Rs.${discrepancy.toFixed(2)}`
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error reconciling safe balance:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
