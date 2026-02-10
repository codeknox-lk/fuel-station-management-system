import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function POST(
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
    const { amount, notes } = body
    const performedBy = user.username

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    // Get the loan
    const loan = await prisma.loanOfficeStaff.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
      include: {
        station: true
      }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Office staff loan not found' }, { status: 404 })
    }

    if (loan.status === 'PAID') {
      return NextResponse.json({ error: 'Loan is already fully paid' }, { status: 400 })
    }

    const currentPaid = loan.paidAmount || 0
    const newPaidAmount = currentPaid + parseFloat(amount)
    const remainingAmount = loan.amount - newPaidAmount

    if (newPaidAmount > loan.amount) {
      return NextResponse.json(
        { error: `Payment amount (Rs. ${amount}) exceeds remaining balance (Rs. ${remainingAmount})` },
        { status: 400 }
      )
    }

    // Update loan
    const updatedLoan = await prisma.loanOfficeStaff.update({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
      data: {
        paidAmount: newPaidAmount,
        status: newPaidAmount >= loan.amount ? 'PAID' : 'ACTIVE'
      }
    })

    // Add to safe
    try {
      let safe = await prisma.safe.findFirst({
        where: { stationId: loan.stationId, organizationId: user.organizationId }
      })

      if (!safe) {
        safe = await prisma.safe.create({
          data: {
            stationId: loan.stationId,
            openingBalance: 0,
            currentBalance: 0,
            organizationId: user.organizationId
          }
        })
      }

      const paymentTimestamp = new Date()
      const allTransactions = await prisma.safeTransaction.findMany({
        where: {
          safeId: safe.id,
          organizationId: user.organizationId,
          timestamp: { lte: paymentTimestamp }
        },
        orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
      })

      let balanceBefore = safe.openingBalance
      for (const tx of allTransactions) {
        if (tx.type === 'OPENING_BALANCE') {
          balanceBefore = tx.amount
        } else {
          const isIncome = [
            'CASH_FUEL_SALES',
            'POS_CARD_PAYMENT',
            'CREDIT_PAYMENT',
            'CHEQUE_RECEIVED',
            'LOAN_REPAID'
          ].includes(tx.type)
          balanceBefore += isIncome ? tx.amount : -tx.amount
        }
      }

      const balanceAfter = balanceBefore + parseFloat(amount)

      await prisma.safeTransaction.create({
        data: {
          safeId: safe.id,
          type: 'LOAN_REPAID',
          amount: parseFloat(amount),
          balanceBefore,
          balanceAfter,
          loanId: loan.id,
          description: `Office staff loan repayment: ${loan.staffName}${notes ? ` - ${notes}` : ''}`,
          performedBy,
          timestamp: paymentTimestamp,
          organizationId: user.organizationId
        }
      })

      await prisma.safe.update({
        where: { id_organizationId: { id: safe.id, organizationId: user.organizationId } },
        data: { currentBalance: balanceAfter }
      })
    } catch (safeError) {
      console.error('Error adding payment to safe:', safeError)
    }

    return NextResponse.json(updatedLoan)
  } catch (error) {
    console.error('Error processing office staff loan payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
