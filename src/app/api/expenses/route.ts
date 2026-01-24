import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'
import { safeParseFloat, validateAmount, validateRequired, validateDate } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    if (id) {
      // OPTIMIZED: Use select
      const expense = await prisma.expense.findUnique({
        where: { id },
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
      stationId?: string
      category?: string
      expenseDate?: {
        gte: Date
        lte: Date
      }
    }
    const where: ExpenseWhereInput = {}
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
    interface ExpenseBody {
      stationId?: string
      category?: string
      description?: string
      amount?: string | number
      fromSafe?: boolean
      paidBy?: string
      proof?: string
      expenseDate?: string | Date
    }
    const body = await request.json() as ExpenseBody

    const { stationId, category, description, amount, fromSafe, paidBy, proof, expenseDate } = body

    // Validate required fields
    const errors: string[] = []
    if (validateRequired(stationId, 'Station ID')) errors.push(validateRequired(stationId, 'Station ID')!)
    if (validateRequired(category, 'Category')) errors.push(validateRequired(category, 'Category')!)
    if (validateRequired(description, 'Description')) errors.push(validateRequired(description, 'Description')!)
    if (validateRequired(paidBy, 'Paid by')) errors.push(validateRequired(paidBy, 'Paid by')!)
    if (validateDate(String(expenseDate), 'Expense date')) errors.push(validateDate(String(expenseDate), 'Expense date')!)

    // Validate amount
    const amountError = validateAmount(amount, 'Amount')
    if (amountError) errors.push(amountError)

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      )
    }

    const validatedAmount = safeParseFloat(amount)

    const newExpense = await prisma.expense.create({
      data: {
        stationId: stationId!,
        category: category!,
        description: description!,
        amount: validatedAmount,
        fromSafe: fromSafe || false,
        paidBy: paidBy!,
        proof: proof || null,
        expenseDate: new Date(expenseDate!)
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
        let safe = await prisma.safe.findUnique({
          where: { stationId }
        })

        if (!safe) {
          safe = await prisma.safe.create({
            data: {
              stationId: stationId!,
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
