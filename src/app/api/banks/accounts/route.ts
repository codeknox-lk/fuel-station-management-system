import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const bankId = searchParams.get('bankId')

    // Get all banks with their transaction summaries
    const banks = await prisma.bank.findMany({
      where: bankId ? { id: bankId, isActive: true } : { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        deposits: stationId
          ? {
            where: { stationId },
            orderBy: { depositDate: 'desc' }
          }
          : { orderBy: { depositDate: 'desc' } },
        cheques: stationId
          ? {
            where: { stationId },
            orderBy: { receivedDate: 'desc' }
          }
          : { orderBy: { receivedDate: 'desc' } },
        posTerminals: {
          where: { isActive: true }
        }
      }
    })

    // Fetch credit payments separately for each bank
    const creditPaymentsByBank = await Promise.all(
      banks.map(async (bank) => {
        const creditPayments = await prisma.creditPayment.findMany({
          where: {
            bankId: bank.id
          },
          orderBy: { paymentDate: 'desc' }
        })
        return { bankId: bank.id, creditPayments }
      })
    )

    // Fetch manual bank transactions for each bank
    const bankTransactionsByBank = await Promise.all(
      banks.map(async (bank) => {
        const bankTransactions = await prisma.bankTransaction.findMany({
          where: {
            bankId: bank.id
          },
          orderBy: { transactionDate: 'desc' }
        })
        return { bankId: bank.id, bankTransactions }
      })
    )

    // Calculate balances and summaries for each bank
    const bankAccounts = banks.map(bank => {
      // Get credit payments for this bank
      const bankCreditPayments = creditPaymentsByBank.find(cp => cp.bankId === bank.id)?.creditPayments || []

      // Get manual bank transactions for this bank
      const bankManualTransactions = bankTransactionsByBank.find(bt => bt.bankId === bank.id)?.bankTransactions || []

      // Total deposits
      const totalDeposits = bank.deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

      // Total cheques (received)
      const totalCheques = bank.cheques.reduce((sum, cheque) => sum + cheque.amount, 0)

      // Cleared cheques
      const clearedCheques = bank.cheques
        .filter(cheque => cheque.status === 'CLEARED')
        .reduce((sum, cheque) => sum + cheque.amount, 0)

      // Pending cheques (includes PENDING and DEPOSITED - awaiting clearance)
      const pendingCheques = bank.cheques
        .filter(cheque => cheque.status === 'PENDING' || cheque.status === 'DEPOSITED')
        .reduce((sum, cheque) => sum + cheque.amount, 0)

      // Bounced cheques
      const bouncedCheques = bank.cheques
        .filter(cheque => cheque.status === 'BOUNCED')
        .reduce((sum, cheque) => sum + cheque.amount, 0)

      // Credit payments received
      const totalCreditPayments = bankCreditPayments.reduce((sum, payment) => sum + payment.amount, 0)

      // Manual transactions (deposits add, withdrawals subtract)
      const manualDeposits = bankManualTransactions
        .filter(t => ['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(t.type) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

      const manualWithdrawals = bankManualTransactions
        .filter(t => ['WITHDRAWAL', 'TRANSFER_OUT', 'FEE'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

      // Current balance (deposits + cleared cheques + credit payments + manual deposits - manual withdrawals)
      const currentBalance = totalDeposits + clearedCheques + totalCreditPayments + manualDeposits - manualWithdrawals

      // Transaction count
      const transactionCount = bank.deposits.length + bank.cheques.length + bankCreditPayments.length + bankManualTransactions.length

      // Recent transactions (last 10)
      const allTransactions: Array<{
        id: string
        type: 'DEPOSIT' | 'CHEQUE' | 'CREDIT_PAYMENT' | 'MANUAL'
        amount: number
        date: Date
        status?: string
        description: string
      }> = [
          ...bank.deposits.map(d => ({
            id: d.id,
            type: 'DEPOSIT' as const,
            amount: d.amount,
            date: d.depositDate,
            description: `Deposit by ${d.depositedBy}${d.depositSlip ? ` - Slip: ${d.depositSlip}` : ''}`
          })),
          ...bank.cheques.map(c => ({
            id: c.id,
            type: 'CHEQUE' as const,
            amount: c.amount,
            date: c.receivedDate,
            status: c.status,
            description: `Cheque ${c.chequeNumber} from ${c.receivedFrom}`
          })),
          ...bankCreditPayments.map(cp => ({
            id: cp.id,
            type: 'CREDIT_PAYMENT' as const,
            amount: cp.amount,
            date: cp.paymentDate,
            description: `Credit payment${cp.chequeNumber ? ` - Cheque: ${cp.chequeNumber}` : ''}`
          })),
          ...bankManualTransactions.map(mt => ({
            id: mt.id,
            type: 'MANUAL' as const,
            amount: mt.amount,
            date: mt.transactionDate,
            status: mt.type,
            description: mt.description
          }))
        ]

      // Sort by date descending and take last 10
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)

      return {
        id: bank.id,
        name: bank.name,
        branch: bank.branch,
        accountNumber: bank.accountNumber,
        isActive: bank.isActive,
        currentBalance,
        totalDeposits,
        totalCheques,
        clearedCheques,
        pendingCheques,
        bouncedCheques,
        totalCreditPayments,
        manualDeposits,
        manualWithdrawals,
        transactionCount,
        recentTransactions,
        posTerminals: bank.posTerminals,
        createdAt: bank.createdAt,
        updatedAt: bank.updatedAt
      }
    })

    return NextResponse.json({ bankAccounts })
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
