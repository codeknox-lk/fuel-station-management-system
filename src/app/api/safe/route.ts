import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { safeParseFloat } from '@/lib/validation'

// GET: Get safe for station(s) or create if doesn't exist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    // OPTIMIZED: If no stationId, return aggregated data for all stations
    if (!stationId) {
      // Use select instead of include for faster query
      const allSafes = await prisma.safe.findMany({
        select: {
          id: true,
          currentBalance: true,
          openingBalance: true,
          station: {
            select: { name: true, city: true }
          }
        }
      })

      // Use currentBalance directly (already calculated) - No N+1!
      const totalBalance = allSafes.reduce((sum, safe) => sum + safe.currentBalance, 0)
      const totalOpeningBalance = allSafes.reduce((sum, safe) => sum + safe.openingBalance, 0)

      // Return aggregated safe data
      return NextResponse.json({
        id: 'all-stations',
        stationId: 'all',
        openingBalance: totalOpeningBalance,
        currentBalance: totalBalance,
        isAggregated: true,
        stationCount: allSafes.length
      })
    }

    // OPTIMIZED: Use select, avoid fetching all transactions
    // OPTIMIZED: Use upsert to handle race conditions
    const safe = await prisma.safe.upsert({
      where: { stationId },
      update: {}, // No updates needed if it exists
      create: {
        stationId,
        openingBalance: 0,
        currentBalance: 0
      },
      select: {
        id: true,
        stationId: true,
        openingBalance: true,
        currentBalance: true,
        lastCounted: true,
        countedBy: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Return safe with current balance (already accurate from POST operations)
    return NextResponse.json(safe)
  } catch (error) {
    console.error('Error fetching safe:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// POST: Create a safe transaction
export async function POST(request: NextRequest) {
  try {
    interface SafeTransactionBody {
      stationId?: string
      type?: string
      amount?: number
      description?: string
      shiftId?: string
      batchId?: string
      creditSaleId?: string
      chequeId?: string
      expenseId?: string
      loanId?: string
      depositId?: string
      performedBy?: string
      timestamp?: string | Date
      bankId?: string
      bankDepositNotes?: string
    }
    const body = await request.json() as SafeTransactionBody
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
      timestamp,
      bankId,
      bankDepositNotes
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
      const txIsIncome = [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'CHEQUE_RECEIVED',
        'LOAN_REPAID',
        'OPENING_BALANCE'
      ].includes(String(tx.type))

      balanceBefore += txIsIncome ? tx.amount : -tx.amount
    }

    // Calculate balance after transaction
    const isIncomeTx = [
      'CASH_FUEL_SALES',
      'POS_CARD_PAYMENT',
      'CREDIT_PAYMENT',
      'CHEQUE_RECEIVED',
      'LOAN_REPAID',
      'OPENING_BALANCE'
    ].includes(String(type))

    const amountVal = safeParseFloat(amount)
    const balanceAfter = balanceBefore + (isIncomeTx ? amountVal : -amountVal)

    // Use transaction for bank deposits to ensure atomicity
    if (type === 'BANK_DEPOSIT' && bankId) {
      const result = await prisma.$transaction(async (tx) => {
        // Create safe transaction
        const transaction = await tx.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: type as import('@prisma/client').SafeTransactionType,
            amount: amountVal,
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
            timestamp: transactionTimestamp
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
        await tx.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })

        // Create bank transaction record
        await tx.bankTransaction.create({
          data: {
            bankId,
            stationId,
            type: 'DEPOSIT',
            amount: amountVal,
            description: `Cash deposit from safe${bankDepositNotes ? `: ${bankDepositNotes}` : ''}`,
            referenceNumber: null,
            transactionDate: transactionTimestamp,
            createdBy: performedBy,
            notes: `Bank deposit recorded via safe management by ${performedBy}`
          }
        })

        return transaction
      })

      return NextResponse.json(result, { status: 201 })
    }

    // Regular transaction (non-bank deposit)
    const transaction = await prisma.safeTransaction.create({
      data: {
        safeId: safe.id,
        type: type as import('@prisma/client').SafeTransactionType,
        amount: amountVal,
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



