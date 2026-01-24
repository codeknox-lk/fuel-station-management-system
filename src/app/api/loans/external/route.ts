import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      const loan = await prisma.loanExternal.findUnique({
        where: { id },
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

    const where: Prisma.LoanExternalWhereInput = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status as any
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
    const body = await request.json()

    const { stationId, borrowerName, borrowerPhone, amount, interestRate, dueDate, notes, fromSafe } = body

    if (!stationId || !borrowerName || !borrowerPhone || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'Station ID, borrower name, borrower phone, amount, and due date are required' },
        { status: 400 }
      )
    }

    const newLoan = await prisma.loanExternal.create({
      data: {
        stationId,
        borrowerName,
        borrowerPhone,
        amount: parseFloat(amount),
        interestRate: interestRate ? parseFloat(interestRate) : null,
        dueDate: new Date(dueDate),
        notes: notes || null,
        status: 'ACTIVE'
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
              currentBalance: 0
            }
          })
        }

        // Calculate balance before transaction chronologically
        const loanTimestamp = new Date(dueDate) // Use loan date, or could use createdAt
        const allTransactions = await prisma.safeTransaction.findMany({
          where: {
            safeId: safe.id,
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

        const balanceAfter = balanceBefore - parseFloat(amount)

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'LOAN_GIVEN',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            loanId: newLoan.id,
            description: `External loan given: ${borrowerName}${notes ? ` - ${notes}` : ''}`,
            performedBy: 'System',
            timestamp: loanTimestamp
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
    console.error('Error creating external loan:', error)

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

