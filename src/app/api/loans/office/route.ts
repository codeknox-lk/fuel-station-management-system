import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
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
      const loan = await prisma.loanOfficeStaff.findFirst({
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
        return NextResponse.json({ error: 'Office staff loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    const where: Prisma.LoanOfficeStaffWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status as 'ACTIVE' | 'PAID' | 'OVERDUE'
    }

    const loans = await prisma.loanOfficeStaff.findMany({
      where,
      select: {
        id: true,
        staffName: true,
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
    console.error('Error fetching office staff loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { stationId, staffName, amount, monthlyRental, reason, dueDate, fromSafe, transactionType } = body

    if (!stationId || !staffName || !amount || !reason || !dueDate) {
      return NextResponse.json(
        { error: 'Station ID, staff name, amount, reason, and due date are required' },
        { status: 400 }
      )
    }

    // Get current user for organizationId and secureGivenBy
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const secureGivenBy = user.username

    const newLoan = await prisma.loanOfficeStaff.create({
      data: {
        stationId,
        staffName,
        amount: parseFloat(amount),
        monthlyRental: monthlyRental !== undefined && monthlyRental !== null ? parseFloat(monthlyRental) : 0,
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
    if (fromSafe && parseFloat(amount) > 0) {
      try {
        // Get or create safe
        let safe = await prisma.safe.findUnique({
          where: { stationId }
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
        const loanTimestamp = new Date(dueDate)
        const allTransactions = await prisma.safeTransaction.findMany({
          where: {
            safeId: safe.id,
            timestamp: { lte: loanTimestamp }
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

        const balanceAfter = balanceBefore - parseFloat(amount)

        const typeLabel = transactionType === 'ADVANCE' ? 'advance' : 'loan'

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'LOAN_GIVEN',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            loanId: newLoan.id,
            description: `Office staff ${typeLabel} given: ${staffName} - ${reason}`,
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
    console.error('Error creating office staff loan:', error)

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
