import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateSafeTransactionSchema } from '@/lib/schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const shiftId = searchParams.get('shiftId')
    const stationId = searchParams.get('stationId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')

    // If ID is provided, fetch single transaction
    if (id) {
      const transaction = await prisma.safeTransaction.findUnique({
        where: { id }
      })

      if (!transaction) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }

      // Get safe to get stationId
      const safe = await prisma.safe.findUnique({
        where: { id: transaction.safeId }
      })

      if (!safe) {
        return NextResponse.json({ error: 'Safe not found' }, { status: 404 })
      }

      // Enrich transaction with related data (same logic as below)
      // Enrich transaction with related data (same logic as below)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched = { ...transaction } as any

      // OPTIMIZED: Fetch minimal shift data with select
      if (transaction.shiftId) {
        try {
          const shift = await prisma.shift.findUnique({
            where: { id: transaction.shiftId },
            select: {
              id: true,
              status: true,
              startTime: true,
              endTime: true,
              openedBy: true,
              declaredAmounts: true,
              statistics: true,
              shopAssignment: {
                select: {
                  id: true,
                  pumperName: true
                }
              },
              template: {
                select: {
                  id: true,
                  name: true
                }
              },
              assignments: {
                select: {
                  pumperName: true
                }
              }
            }
          })
          if (shift) {
            enriched.shift = {
              ...shift,
              assignments: shift.assignments.map(a => ({
                pumperName: a.pumperName,
                pumper: { name: a.pumperName }
              }))
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch shift ${transaction.shiftId}:`, err)
        }
      }

      // Fetch POS batch data if batchId exists
      if (transaction.batchId) {
        try {
          const batch = await prisma.posBatch.findUnique({
            where: { id: transaction.batchId },
            include: {
              terminalEntries: {
                include: {
                  terminal: {
                    include: {
                      bank: true
                    }
                  }
                }
              }
            }
          })
          enriched.batch = batch
        } catch (err) {
          console.warn(`Failed to fetch batch ${transaction.batchId}:`, err)
        }
      }

      // Fetch cheque data if chequeId exists
      if (transaction.chequeId) {
        try {
          const cheque = await prisma.cheque.findUnique({
            where: { id: transaction.chequeId },
            include: {
              bank: true
            }
          })
          enriched.cheque = cheque
        } catch (err) {
          console.warn(`Failed to fetch cheque ${transaction.chequeId}:`, err)
        }
      }

      return NextResponse.json([enriched])
    }

    // OPTIMIZED: If shiftId is provided, fetch all transactions for that shift
    if (shiftId) {
      const shiftTransactions = await prisma.safeTransaction.findMany({
        where: { shiftId },
        select: {
          id: true,
          safeId: true,
          type: true,
          amount: true,
          balanceBefore: true,
          balanceAfter: true,
          shiftId: true,
          batchId: true,
          creditSaleId: true,
          chequeId: true,
          expenseId: true,
          loanId: true,
          depositId: true,
          description: true,
          performedBy: true,
          timestamp: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { timestamp: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      // Fetch shift data once for all transactions (not N+1!)
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        select: {
          id: true,
          template: {
            select: {
              name: true
            }
          },
          shopAssignment: {
            select: {
              id: true,
              pumperName: true
            }
          },
          assignments: {
            select: {
              pumperName: true
            }
          }
        }
      })

      // Attach shift to each transaction
      const enriched = shiftTransactions.map(tx => ({
        ...tx,
        shift: shift ? {
          ...shift,
          assignments: shift.assignments.map(a => ({
            pumperName: a.pumperName,
            pumper: { name: a.pumperName }
          }))
        } : undefined
      }))

      return NextResponse.json(enriched)
    }

    // If no stationId, get transactions from all safes
    let safeIds: string[] = []

    if (!stationId) {
      const allSafes = await prisma.safe.findMany({
        select: { id: true }
      })
      safeIds = allSafes.map(s => s.id)
    } else {
      // Get or create safe for specific station
      const safe = await prisma.safe.upsert({
        where: { stationId },
        update: {},
        create: {
          stationId,
          openingBalance: 0,
          currentBalance: 0
        }
      })
      safeIds = [safe.id]
    }

    const where: Prisma.SafeTransactionWhereInput = {
      safeId: safeIds.length === 1 ? safeIds[0] : { in: safeIds }
    }

    if (type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.type = type as any
    }

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const transactions = await prisma.safeTransaction.findMany({
      where,
      orderBy: [
        { timestamp: 'desc' },
        { createdAt: 'desc' } // Secondary sort for same-timestamp transactions
      ],
      ...(limit ? { take: parseInt(limit) } : {})
    })

    // OPTIMIZED: Batch-fetch all unique shifts to avoid N+1 queries
    const uniqueShiftIds = [...new Set(transactions.map(tx => tx.shiftId).filter(Boolean))] as string[]

    const shiftsMap = new Map()
    if (uniqueShiftIds.length > 0) {
      const shifts = await prisma.shift.findMany({
        where: { id: { in: uniqueShiftIds } },
        select: {
          id: true,
          template: {
            select: {
              name: true
            }
          },
          shopAssignment: {
            select: {
              id: true,
              pumperName: true
            }
          },
          assignments: {
            select: {
              pumperName: true
            }
          }
        }
      })

      shifts.forEach(shift => {
        shiftsMap.set(shift.id, {
          ...shift,
          assignments: shift.assignments.map(a => ({
            pumperName: a.pumperName,
            pumper: { name: a.pumperName }
          }))
        })
      })
    }

    // Enrich transactions with cached shift data (no N+1!)
    const enrichedTransactions = transactions.map(tx => ({
      ...tx,
      shift: tx.shiftId ? shiftsMap.get(tx.shiftId) : undefined
    }))

    return NextResponse.json(enrichedTransactions)
  } catch (error) {
    console.error('Error fetching safe transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a safe transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod Validation
    const result = CreateSafeTransactionSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

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
    } = result.data

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

    // VALIDATION: Check for potential duplicate transactions
    const transactionTimestamp = timestamp ? new Date(timestamp) : new Date()
    const oneMinuteBefore = new Date(transactionTimestamp.getTime() - 60000)
    const oneMinuteAfter = new Date(transactionTimestamp.getTime() + 60000)

    const recentDuplicate = await prisma.safeTransaction.findFirst({
      where: {
        safeId: safe.id,
        type: type as import('@prisma/client').SafeTransactionType,
        amount,
        timestamp: {
          gte: oneMinuteBefore,
          lte: oneMinuteAfter
        }
      }
    })

    if (recentDuplicate) {
      console.warn(`⚠️ Possible duplicate transaction detected: ${type} Rs.${amount} at ${transactionTimestamp.toISOString()}`)
      // Allow but log warning - user may intentionally create duplicate
    }

    // VALIDATION: Check for future timestamps (max 1 hour in future)
    const maxFutureTime = new Date(Date.now() + 3600000) // 1 hour from now
    if (transactionTimestamp > maxFutureTime) {
      return NextResponse.json(
        { error: 'Transaction timestamp cannot be more than 1 hour in the future' },
        { status: 400 }
      )
    }

    // VALIDATION: Check for excessively large amounts (potential data entry error)
    const MAX_SAFE_AMOUNT = 10000000 // Rs. 10 million
    if (amount > MAX_SAFE_AMOUNT) {
      console.warn(`⚠️ Large transaction amount detected: Rs.${amount.toLocaleString()} (${type})`)
      // Allow but log warning - legitimate large transactions may occur
    }

    // Calculate balance before transaction chronologically
    // Get transaction timestamp (default to now if not provided)


    // Get all transactions that occurred before or at the same time as this transaction
    // Order by timestamp ASC to calculate balance chronologically
    const allTransactions = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        timestamp: { lte: transactionTimestamp }
      },
      orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
    })

    // Calculate balance from opening balance up to this point
    // IMPORTANT: OPENING_BALANCE transactions set the balance, they don't add/subtract
    // So we need to track the balance properly, resetting when we encounter OPENING_BALANCE
    let balanceBefore = safe.openingBalance
    for (const tx of allTransactions) {
      if (tx.type === 'OPENING_BALANCE') {
        // OPENING_BALANCE sets the balance to this value
        balanceBefore = tx.amount
      } else {
        // Regular transactions add or subtract
        const txIsIncome = [
          'CASH_FUEL_SALES',
          'POS_CARD_PAYMENT',
          'CREDIT_PAYMENT',
          'LOAN_REPAID'
        ].includes(tx.type)

        balanceBefore += txIsIncome ? tx.amount : -tx.amount
      }
    }

    // Calculate balance after transaction
    // For OPENING_BALANCE, the balanceAfter should be the amount (it sets the balance)
    let balanceAfter: number
    if (type === 'OPENING_BALANCE') {
      balanceAfter = amount // Opening balance sets the balance to this value
    } else {
      const isIncome = [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'LOAN_REPAID'
      ].includes(type)

      balanceAfter = balanceBefore + (isIncome ? amount : -amount)
    }

    // Validate: Log warning for negative balance (allowing overdraft scenarios)
    // Negative balances are allowed but logged for audit purposes
    if (balanceAfter < 0 && type !== 'OPENING_BALANCE') {
      console.warn(`⚠️ Safe balance going negative: ${balanceBefore} -> ${balanceAfter} (Transaction: ${type}, Amount: ${amount})`)
    }

    // Validate: Ensure amount is positive
    if (amount < 0) {
      return NextResponse.json(
        { error: 'Transaction amount must be positive' },
        { status: 400 }
      )
    }

    // Create transaction
    const transaction = await prisma.safeTransaction.create({
      data: {
        safeId: safe.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: type as any,
        amount: amount,
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
        performedBy: performedBy || 'System',
        timestamp: timestamp ? new Date(timestamp) : new Date()
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
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

