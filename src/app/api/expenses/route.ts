import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    if (id) {
      const expense = await prisma.expense.findUnique({
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
      
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json(expense)
    }

    const where: any = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (category) {
      where.category = category
    }
    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { expenseDate: 'desc' }
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { stationId, category, description, amount, fromSafe, paidBy, proof, expenseDate } = body
    
    if (!stationId || !category || !description || amount === undefined || !paidBy || !expenseDate) {
      return NextResponse.json(
        { error: 'Station ID, category, description, amount, paid by, and expense date are required' },
        { status: 400 }
      )
    }

    const newExpense = await prisma.expense.create({
      data: {
        stationId,
        category,
        description,
        amount: parseFloat(amount),
        fromSafe: fromSafe || false,
        paidBy,
        proof: proof || null,
        expenseDate: new Date(expenseDate)
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
        const expenseTimestamp = new Date(expenseDate)
        const allTransactions = await prisma.safeTransaction.findMany({
          where: { 
            safeId: safe.id,
            timestamp: { lte: expenseTimestamp }
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
            type: 'EXPENSE',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            expenseId: newExpense.id,
            description: `Expense: ${category} - ${description}`,
            performedBy: paidBy,
            timestamp: new Date(expenseDate)
          }
        })

        // Update safe balance
        await prisma.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })
      } catch (safeError) {
        console.error('Error deducting expense from safe:', safeError)
        // Don't fail expense creation if safe transaction fails
      }
    }

    // Log the expense creation
    await auditOperations.expenseRecorded(request, newExpense.id, newExpense.amount, category, stationId)

    return NextResponse.json(newExpense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    
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
