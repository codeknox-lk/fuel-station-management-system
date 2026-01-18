import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST: Update opening balance (daily reset)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stationId, openingBalance, countedBy } = body

    if (!stationId || openingBalance === undefined) {
      return NextResponse.json(
        { error: 'Station ID and opening balance are required' },
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
          openingBalance: parseFloat(openingBalance),
          currentBalance: parseFloat(openingBalance)
        }
      })
    }

    // Calculate balance before opening balance transaction
    // Get all transactions before this opening balance, ordered chronologically
    const transactionsBefore = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        timestamp: { lt: new Date() }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Calculate balance before opening balance transaction
    // OPENING_BALANCE transactions set the balance, they don't add/subtract
    let balanceBefore = safe.openingBalance
    for (const tx of transactionsBefore) {
      if (tx.type === 'OPENING_BALANCE') {
        // OPENING_BALANCE sets the balance to this value
        balanceBefore = tx.amount
      } else {
        // Regular transactions add or subtract
        const txIsIncome = [
          'CASH_FUEL_SALES',
          'POS_CARD_PAYMENT',
          'CREDIT_PAYMENT',
          'CHEQUE_RECEIVED',
          'LOAN_REPAID'
        ].includes(tx.type)
        
        balanceBefore += txIsIncome ? tx.amount : -tx.amount
      }
    }

    // Opening balance transaction sets balance to the new opening balance
    const newOpeningBalance = parseFloat(openingBalance)
    const balanceAfter = newOpeningBalance

    // Create opening balance transaction
    const transaction = await prisma.safeTransaction.create({
      data: {
        safeId: safe.id,
        type: 'OPENING_BALANCE',
        amount: newOpeningBalance,
        balanceBefore,
        balanceAfter,
        description: 'Opening balance set',
        performedBy: countedBy || 'System',
        timestamp: new Date()
      }
    })

    // Update safe
    const updatedSafe = await prisma.safe.update({
      where: { id: safe.id },
      data: {
        openingBalance: parseFloat(openingBalance),
        currentBalance: parseFloat(openingBalance),
        lastCounted: new Date(),
        countedBy: countedBy || null
      }
    })

    return NextResponse.json({
      ...updatedSafe,
      transaction
    })
  } catch (error) {
    console.error('Error updating safe balance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



