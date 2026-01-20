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
      // Update loan status
      const updatedLoan = await tx.loanPumper.update({
        where: { id: loanId },
        data: {
          status: 'PAID',
          updatedAt: repaymentDate ? new Date(repaymentDate) : new Date()
        },
        include: {
          pumper: true
        }
      })

      // Create safe transaction record for the loan repayment (money returning to safe)
      await tx.safeTransaction.create({
        data: {
          type: 'INCOME',
          category: 'LOAN_REPAYMENT',
          amount: loan.amount,
          description: `Loan repayment from ${updatedLoan.pumper?.name || 'Pumper'} - ${notes || 'Loan fully repaid'}`,
          performedBy: repaidBy,
          transactionDate: repaymentDate ? new Date(repaymentDate) : new Date()
        }
      })

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



