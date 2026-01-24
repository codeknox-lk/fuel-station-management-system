import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Repay a pumper loan (mark as paid)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loanId, repaidBy, repaymentDate, notes } = body

    if (!loanId || !repaidBy) {
      return NextResponse.json(
        { error: 'Loan ID and repaid by are required' },
        { status: 400 }
      )
    }

    // Find the loan
    const loan = await prisma.loanPumper.findUnique({
      where: { id: loanId }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    if (loan.status === 'PAID') {
      return NextResponse.json({ error: 'Loan is already paid' }, { status: 400 })
    }

    // Update loan status to PAID and create safe transaction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update loan status
      const updatedLoan = await tx.loanPumper.update({
        where: { id: loanId },
        data: {
          status: 'PAID',
          updatedAt: repaymentDate ? new Date(repaymentDate) : new Date()
        }
      })

      // 2. Handle Safe Transaction if pumper belongs to a station
      let safeTransaction = null
      if (updatedLoan.stationId) {
        // Find safe for the station
        const safe = await tx.safe.findUnique({
          where: { stationId: updatedLoan.stationId }
        })

        if (safe) {
          // Calculate new balance
          const balanceBefore = safe.currentBalance
          const balanceAfter = balanceBefore + loan.amount

          // Create safe transaction
          safeTransaction = await tx.safeTransaction.create({
            data: {
              safeId: safe.id,
              type: 'LOAN_REPAID',
              amount: loan.amount,
              description: `Loan repayment from ${updatedLoan.pumperName} - ${notes || 'Loan fully repaid'}`,
              performedBy: repaidBy,
              timestamp: repaymentDate ? new Date(repaymentDate) : new Date(),
              balanceBefore,
              balanceAfter,
              shiftId: null // Optional: could link to active shift if we wanted to find it
            }
          })

          // Update safe balance
          await tx.safe.update({
            where: { id: safe.id },
            data: { currentBalance: balanceAfter }
          })
        }
      }

      return updatedLoan
    })

    return NextResponse.json({
      message: 'Loan marked as paid and safe transaction recorded',
      loan: result
    })
  } catch (error) {
    console.error('Error repaying loan:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



