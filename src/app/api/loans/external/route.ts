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
      const loan = await prisma.loanExternal.findFirst({
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
        return NextResponse.json({ error: 'External loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    const where: Prisma.LoanExternalWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status as 'ACTIVE' | 'PAID' | 'OVERDUE'
    }

    const loans = await prisma.loanExternal.findMany({
      where,
      include: {
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
    console.error('Error fetching external loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stationId, borrowerName, borrowerPhone, amount, interestRate, dueDate, notes, fromSafe } = body

    if (!stationId || !borrowerName || !borrowerPhone || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Station ID, borrower name, borrower phone, amount, and due date are required' },
        { status: 400 }
      )
    }

    const validatedAmount = parseFloat(String(amount))
    const loanTimestamp = new Date(dueDate)
    const securePerformedBy = user.username

    const newLoan = await prisma.loanExternal.create({
      data: {
        stationId,
        borrowerName,
        borrowerPhone,
        amount: validatedAmount,
        interestRate: interestRate ? parseFloat(String(interestRate)) : null,
        dueDate: loanTimestamp,
        notes: notes || null,
        status: 'ACTIVE',
        organizationId: user.organizationId
      },
      include: {
        station: { select: { id: true, name: true } }
      }
    })

    // Deduct from safe if fromSafe is true
    if (fromSafe && validatedAmount > 0) {
      try {
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

        // Calculate balance before transaction
        const allTransactions = await prisma.safeTransaction.findMany({
          where: {
            safeId: safe.id,
            organizationId: user.organizationId,
            timestamp: { lte: loanTimestamp }
          },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        let balanceBefore = safe.openingBalance
        for (const tx of allTransactions) {
          if (tx.type === 'OPENING_BALANCE') balanceBefore = tx.amount
          else {
            const isIncome = ['CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'CHEQUE_RECEIVED', 'LOAN_REPAID'].includes(tx.type)
            balanceBefore += isIncome ? tx.amount : -tx.amount
          }
        }

        const balanceAfter = balanceBefore - validatedAmount

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'LOAN_GIVEN',
            amount: validatedAmount,
            balanceBefore,
            balanceAfter,
            loanId: newLoan.id,
            description: `External loan given: ${borrowerName}${notes ? ` - ${notes}` : ''}`,
            performedBy: securePerformedBy,
            timestamp: loanTimestamp,
            organizationId: user.organizationId
          }
        })

        // Update safe balance
        await prisma.safe.update({
          where: { id_organizationId: { id: safe.id, organizationId: user.organizationId } },
          data: { currentBalance: balanceAfter }
        })
      } catch (safeError) {
        console.error('Error deducting loan from safe:', safeError)
      }
    }

    return NextResponse.json(newLoan, { status: 201 })
  } catch (error) {
    console.error('Error creating external loan:', error)
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ error: 'Invalid station ID' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
