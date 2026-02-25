import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (id) {
      const loan = await prisma.loanPumper.findFirst({
        where: {
          id,
          organizationId: user.organizationId
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

      if (!loan) {
        return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    const pumperName = searchParams.get('pumperName')

    const where: Prisma.LoanPumperWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status as import('@prisma/client').LoanStatus
    }
    if (pumperName) {
      // Case-insensitive match for pumper name using Prisma's case-insensitive filter
      // Note: This works with PostgreSQL. For other databases, might need different approach
      where.pumperName = {
        equals: pumperName,
        mode: 'insensitive'
      }
    }

    const loans = await prisma.loanPumper.findMany({
      where,
      select: {
        id: true,
        pumperName: true,
        amount: true,
        paidAmount: true,
        monthlyRental: true,
        reason: true,
        givenBy: true,
        dueDate: true,
        status: true,
        createdAt: true,
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching pumper loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface LoanBody {
      stationId?: string
      pumperName?: string
      amount?: string | number
      monthlyRental?: string | number
      reason?: string
      dueDate?: string | Date
      givenBy?: string
      fromSafe?: boolean
      transactionType?: 'ADVANCE' | 'LOAN'
    }
    const body = await request.json() as LoanBody

    const { stationId, pumperName, amount, monthlyRental, reason, dueDate, fromSafe, transactionType } = body

    if (!stationId || !pumperName || !amount || !reason || !dueDate) {
      return NextResponse.json(
        { error: 'Station ID, pumper name, amount, reason, and due date are required' },
        { status: 400 }
      )
    }

    // Get current user for givenBy and organizationId
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const secureGivenBy = user.username

    const newLoan = await prisma.loanPumper.create({
      data: {
        stationId,
        pumperName,
        amount: parseFloat(String(amount)),
        monthlyRental: monthlyRental !== undefined && monthlyRental !== null ? parseFloat(String(monthlyRental)) : 0,
        reason,
        givenBy: secureGivenBy,
        dueDate: new Date(dueDate),
        status: 'ACTIVE',
        organizationId: user.organizationId
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

    // Deduct from safe if fromSafe is true
    if (fromSafe && parseFloat(String(amount)) > 0) {
      try {
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
        const loanTimestamp = new Date(dueDate) // Use loan date
        const allTransactions = await prisma.safeTransaction.findMany({
          where: {
            safeId: safe.id,
            organizationId: user.organizationId,
            timestamp: { lte: loanTimestamp }
          },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        // Calculate balance before transaction chronologically
        // OPENING_BALANCE transactions set the balance, they don't add/subtract
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

        const balanceAfter = balanceBefore - parseFloat(String(amount))

        const typeLabel = transactionType === 'ADVANCE' ? 'advance' : 'loan'

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'LOAN_GIVEN',
            amount: parseFloat(String(amount)),
            balanceBefore,
            balanceAfter,
            loanId: newLoan.id,
            description: `Pumper ${typeLabel} given: ${pumperName} - ${reason}`,
            performedBy: secureGivenBy,
            timestamp: loanTimestamp,
            organizationId: user.organizationId
          }
        })

        // Update safe balance
        await prisma.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })
      } catch (safeError) {
        console.error('Error deducting loan from safe:', safeError)
        // Don't fail loan creation if safe transaction fails
      }
    }

    return NextResponse.json(newLoan, { status: 201 })
  } catch (error) {
    console.error('Error creating pumper loan:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

