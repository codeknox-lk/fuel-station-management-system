import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const loanId = searchParams.get('loanId')
    const loanType = searchParams.get('loanType') // 'PUMPER' or 'EXTERNAL'

    const where: Prisma.SafeTransactionWhereInput = {
      type: 'LOAN_REPAID',
      loanId: { not: null }
    }

    if (stationId) {
      // Get safe for this station
      const safe = await prisma.safe.findUnique({
        where: { stationId },
        select: { id: true }
      })
      if (safe) {
        where.safeId = safe.id
      } else {
        // No safe means no transactions
        return NextResponse.json([])
      }
    }

    if (loanId) {
      where.loanId = loanId
    }

    const transactions = await prisma.safeTransaction.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        safe: {
          select: {
            station: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // If loanType is specified, filter by checking if loanId exists in LoanPumper or LoanExternal
    let filteredTransactions = transactions
    if (loanType && loanId) {
      if (loanType === 'PUMPER') {
        const pumperLoan = await prisma.loanPumper.findUnique({
          where: { id: loanId }
        })
        if (!pumperLoan) {
          filteredTransactions = []
        }
      } else if (loanType === 'EXTERNAL') {
        const externalLoan = await prisma.loanExternal.findUnique({
          where: { id: loanId }
        })
        if (!externalLoan) {
          filteredTransactions = []
        }
      }
    }

    return NextResponse.json(filteredTransactions)
  } catch (error) {
    console.error('Error fetching loan payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
