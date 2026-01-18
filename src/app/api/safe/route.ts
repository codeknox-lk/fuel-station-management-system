import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Get safe for station or create if doesn't exist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    let safe = await prisma.safe.findUnique({
      where: { stationId },
      include: {
        transactions: {
          take: 10,
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    // Create safe if it doesn't exist
    if (!safe) {
      safe = await prisma.safe.create({
        data: {
          stationId,
          openingBalance: 0,
          currentBalance: 0
        },
        include: {
          transactions: {
            take: 10,
            orderBy: { timestamp: 'desc' }
          }
        }
      })
    }

    // Calculate current balance from all transactions
    const allTransactions = await prisma.safeTransaction.findMany({
      where: { safeId: safe.id },
      orderBy: { timestamp: 'asc' }
    })

    // Calculate current balance from all transactions
    // OPENING_BALANCE transactions set the balance, they don't add/subtract
    let calculatedBalance = safe.openingBalance
    for (const tx of allTransactions) {
      if (tx.type === 'OPENING_BALANCE') {
        // OPENING_BALANCE sets the balance to this value
        calculatedBalance = tx.amount
      } else {
        // Regular transactions add or subtract
        const isIncome = [
          'CASH_FUEL_SALES',
          'POS_CARD_PAYMENT',
          'CREDIT_PAYMENT',
          'CHEQUE_RECEIVED',
          'LOAN_REPAID'
        ].includes(tx.type)
        
        calculatedBalance += isIncome ? tx.amount : -tx.amount
      }
    }

    // Update current balance if different
    if (calculatedBalance !== safe.currentBalance) {
      safe = await prisma.safe.update({
        where: { id: safe.id },
        data: { currentBalance: calculatedBalance },
        include: {
          transactions: {
            take: 10,
            orderBy: { timestamp: 'desc' }
          }
        }
      })
    }

    return NextResponse.json({
      ...safe,
      currentBalance: calculatedBalance
    })
  } catch (error) {
    console.error('Error fetching safe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a safe transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      type,
      amount,
      description,
      shiftId,
      batchId,
      creditSaleId,
      chequeId,
      expenseId,
      loanId,
      depositId,
      performedBy,
      timestamp
    } = body

    if (!stationId || !type || amount === undefined || !description || !performedBy) {
      return NextResponse.json(
        { error: 'Station ID, type, amount, description, and performedBy are required' },
        { status: 400 }
      )
    }

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
    const transactionTimestamp = timestamp ? new Date(timestamp) : new Date()
    const allTransactions = await prisma.safeTransaction.findMany({
      where: { 
        safeId: safe.id,
        timestamp: { lte: transactionTimestamp }
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
    })

    let balanceBefore = safe.openingBalance
    for (const tx of allTransactions) {
      const isIncome = [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'CHEQUE_RECEIVED',
        'LOAN_REPAID',
        'OPENING_BALANCE'
      ].includes(tx.type)
      
      balanceBefore += isIncome ? tx.amount : -tx.amount
    }

    // Calculate balance after transaction
    const isIncome = [
      'CASH_FUEL_SALES',
      'POS_CARD_PAYMENT',
      'CREDIT_PAYMENT',
      'CHEQUE_RECEIVED',
      'LOAN_REPAID',
      'OPENING_BALANCE'
    ].includes(type)

    const balanceAfter = balanceBefore + (isIncome ? parseFloat(amount) : -parseFloat(amount))

    // Create transaction
    const transaction = await prisma.safeTransaction.create({
      data: {
        safeId: safe.id,
        type,
        amount: parseFloat(amount),
        balanceBefore,
        balanceAfter,
        shiftId: shiftId || null,
        batchId: batchId || null,
        creditSaleId: creditSaleId || null,
        chequeId: chequeId || null,
        expenseId: expenseId || null,
        loanId: loanId || null,
        depositId: depositId || null,
        description,
        performedBy,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      },
      include: {
        safe: {
          select: {
            id: true,
            stationId: true,
            currentBalance: true
          }
        }
      }
    })

    // Update safe current balance
    await prisma.safe.update({
      where: { id: safe.id },
      data: { currentBalance: balanceAfter }
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating safe transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



