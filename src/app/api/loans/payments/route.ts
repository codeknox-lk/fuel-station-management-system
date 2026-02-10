import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const loanId = searchParams.get('loanId')
    const loanType = searchParams.get('loanType') // 'PUMPER' or 'EXTERNAL'

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: Prisma.SafeTransactionWhereInput = {
      organizationId: user.organizationId,
      type: 'LOAN_REPAID',
      loanId: { not: null }
    }

    if (stationId) {
      // Get safe for this station
      const safe = await prisma.safe.findFirst({
        where: { stationId, organizationId: user.organizationId },
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
        const pumperLoan = await prisma.loanPumper.findFirst({
          where: { id: loanId, organizationId: user.organizationId }
        })
        if (!pumperLoan) {
          filteredTransactions = []
        }
      } else if (loanType === 'EXTERNAL') {
        const externalLoan = await prisma.loanExternal.findFirst({
          where: { id: loanId, organizationId: user.organizationId }
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
