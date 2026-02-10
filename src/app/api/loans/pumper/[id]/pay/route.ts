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
    const { stationId, amount, notes } = body

    if (!stationId || !amount) {
      return NextResponse.json({
        error: 'Station ID and amount are required'
      }, { status: 400 })
    }

    const paymentAmount = parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({
        error: 'Invalid payment amount'
      }, { status: 400 })
    }

    // Get the loan
    const loan = await prisma.loanPumper.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
    }

    if (loan.status === 'PAID') {
      return NextResponse.json({
        error: 'Loan is already paid'
      }, { status: 400 })
    }

    // Get or create safe
    let safe = await prisma.safe.findFirst({
      where: { stationId, organizationId: user.organizationId }
    })

    if (!safe) {
      safe = await prisma.safe.create({
        data: {
          stationId,
          openingBalance: 0,
          currentBalance: 0,
          organizationId: user.organizationId
        }
      })
    }

    // Calculate balance before transaction chronologically
    const paymentTimestamp = new Date()
    const allTransactions = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        organizationId: user.organizationId,
        timestamp: { lte: paymentTimestamp }
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
    })

    // Calculate balance before transaction chronologically
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

    const balanceAfter = balanceBefore + paymentAmount
    const securePerformedBy = user.username

    const safeTransaction = await prisma.safeTransaction.create({
      data: {
        safeId: safe.id,
        type: 'LOAN_REPAID',
        amount: paymentAmount,
        balanceBefore,
        balanceAfter,
        loanId: loan.id,
        description: `Loan repayment from ${loan.pumperName}${notes ? `: ${notes}` : ''}`,
        performedBy: securePerformedBy,
        timestamp: paymentTimestamp,
        organizationId: user.organizationId
      }
    })

    // Update safe balance
    await prisma.safe.update({
      where: { id_organizationId: { id: safe.id, organizationId: user.organizationId } },
      data: { currentBalance: balanceAfter }
    })

    // Calculate new paid amount
    const currentPaidAmount = loan.paidAmount || 0
    const newPaidAmount = currentPaidAmount + paymentAmount
    const remainingAmount = loan.amount - newPaidAmount

    // Update loan: increment paidAmount and update status if fully paid
    const updatedLoan = await prisma.loanPumper.update({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
      data: {
        paidAmount: newPaidAmount,
        status: newPaidAmount >= loan.amount ? 'PAID' : loan.status
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      loan: updatedLoan,
      safeTransaction,
      message: newPaidAmount >= loan.amount
        ? 'Loan fully paid and marked as PAID'
        : `Payment of Rs. ${(paymentAmount || 0).toLocaleString()} recorded. Remaining: Rs. ${(remainingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    })
  } catch (error) {
    console.error('Error processing loan payment:', error)
    return NextResponse.json({
      error: 'Failed to process loan payment',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
