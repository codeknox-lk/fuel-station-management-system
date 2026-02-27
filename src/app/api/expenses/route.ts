import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/audit'
import { CreateExpenseSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (id) {
      // OPTIMIZED: Use select
      const expense = await prisma.expense.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        select: {
          id: true,
          stationId: true,
          category: true,
          description: true,
          amount: true,
          fromSafe: true,
          paidBy: true,
          proof: true,
          expenseDate: true,
          createdAt: true,
          updatedAt: true,
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

    interface ExpenseWhereInput {
      organizationId: string
      stationId?: string
      category?: string
      expenseDate?: {
        gte: Date
        lte: Date
      }
    }
    const where: ExpenseWhereInput = {
      organizationId: user.organizationId
    }
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

    // OPTIMIZED: Use select for list
    const expenses = await prisma.expense.findMany({
      where,
      select: {
        id: true,
        stationId: true,
        category: true,
        description: true,
        amount: true,
        fromSafe: true,
        paidBy: true,
        proof: true,
        expenseDate: true,
        createdAt: true,
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

    // Zod Validation
    const result = CreateExpenseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stationId, category, description, amount, fromSafe, paidBy, proof, expenseDate } = result.data
    const validatedAmount = amount // Already a number

    // Get current user for recordedBy
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const recordedBy = user.username

    // Verify station exists and belongs to the same organization
    const station = await prisma.station.findFirst({
      where: {
        id: stationId,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json(
        { error: 'Station not found or access denied' },
        { status: 404 }
      )
    }

    const newExpense = await prisma.expense.create({
      data: {
        stationId,
        category,
        description,
        amount: validatedAmount,
        fromSafe,
        paidBy,
        proof: proof || null,
        expenseDate,
        recordedBy,
        organizationId: user.organizationId
      },
      include: {
        station: {
          select: { id: true, name: true }
        }
      }
    })

    // Deduct from safe if fromSafe is true
    if (fromSafe && validatedAmount > 0) {
      try {
        // Get or create safe
        let safe = await prisma.safe.findFirst({
          where: { stationId, organizationId: user.organizationId }
        })

        if (!safe) {
          safe = await prisma.safe.create({
            data: {
              stationId: stationId!,
              organizationId: user.organizationId,
              openingBalance: 0,
              currentBalance: 0
            }
          })
        }

        // Calculate balance before transaction chronologically
        const expenseTimestamp = new Date(expenseDate!)
        const allTransactions = await prisma.safeTransaction.findMany({
          where: {
            safeId: safe.id,
            organizationId: user.organizationId,
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

        const balanceAfter = balanceBefore - validatedAmount

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            organizationId: user.organizationId,
            type: 'EXPENSE',
            amount: validatedAmount,
            balanceBefore,
            balanceAfter,
            expenseId: newExpense.id,
            description: `Expense: ${category} - ${description}`,
            performedBy: paidBy!,
            timestamp: new Date(expenseDate!)
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
    await auditOperations.expenseRecorded(request, newExpense.id, newExpense.amount, category!, stationId!)

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
