import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
      const enriched: any = { ...transaction }

      // Fetch shift data if shiftId exists
      if (transaction.shiftId) {
        try {
          const shift = await prisma.shift.findUnique({
            where: { id: transaction.shiftId },
            include: {
              template: true,
              assignments: {
                include: {
                  nozzle: {
                    include: {
                      tank: true,
                      pump: true
                    }
                  }
                }
              }
            }
          })
          if (shift) {
            enriched.shift = {
              ...shift,
              assignments: shift.assignments.map(a => ({
                ...a,
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

    // If shiftId is provided, fetch all transactions for that shift
    if (shiftId) {
      const shiftTransactions = await prisma.safeTransaction.findMany({
        where: { shiftId },
        orderBy: [
          { timestamp: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      // Enrich each transaction
      const enrichedTransactions = await Promise.all(
        shiftTransactions.map(async (tx) => {
          const enriched: any = { ...tx }

          // Fetch shift data
          if (tx.shiftId) {
            try {
              const shift = await prisma.shift.findUnique({
                where: { id: tx.shiftId },
                include: {
                  template: true,
                  assignments: {
                    include: {
                      nozzle: {
                        include: {
                          tank: true,
                          pump: true
                        }
                      }
                    }
                  }
                }
              })
              if (shift) {
                enriched.shift = {
                  ...shift,
                  assignments: shift.assignments.map(a => ({
                    ...a,
                    pumper: { name: a.pumperName }
                  }))
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch shift ${tx.shiftId}:`, err)
            }
          }

          // Fetch POS batch data if batchId exists
          if (tx.batchId) {
            try {
              const batch = await prisma.posBatch.findUnique({
                where: { id: tx.batchId },
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
              console.warn(`Failed to fetch batch ${tx.batchId}:`, err)
            }
          }

          // Fetch cheque data if chequeId exists
          if (tx.chequeId) {
            try {
              const cheque = await prisma.cheque.findUnique({
                where: { id: tx.chequeId },
                include: {
                  bank: true
                }
              })
              enriched.cheque = cheque
            } catch (err) {
              console.warn(`Failed to fetch cheque ${tx.chequeId}:`, err)
            }
          }

          return enriched
        })
      )

      return NextResponse.json(enrichedTransactions)
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
      safeIds = [safe.id]
    }

    const where: any = { 
      safeId: safeIds.length === 1 ? safeIds[0] : { in: safeIds }
    }

    if (type) {
      where.type = type
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

    // Fetch related data manually since Prisma relations aren't defined
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const enriched: any = { ...tx }

        // Fetch shift data if shiftId exists
        if (tx.shiftId) {
          try {
            const shift = await prisma.shift.findUnique({
              where: { id: tx.shiftId },
              include: {
                template: true,
                assignments: {
                  include: {
                    nozzle: {
                      include: {
                        tank: true,
                        pump: true
                      }
                    }
                  }
                }
              }
            })
            // Add pumper info to assignments (pumperName is a string field, not a relation)
            if (shift) {
              enriched.shift = {
                ...shift,
                assignments: shift.assignments.map(a => ({
                  ...a,
                  pumper: { name: a.pumperName } // Convert pumperName string to pumper object for frontend
                }))
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch shift ${tx.shiftId}:`, err)
          }
        }

        // Fetch POS batch data if batchId exists
        if (tx.batchId) {
          try {
            const batch = await prisma.posBatch.findUnique({
              where: { id: tx.batchId },
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
            console.warn(`Failed to fetch batch ${tx.batchId}:`, err)
          }
        }

        // Fetch cheque data if chequeId exists
        if (tx.chequeId) {
          try {
            const cheque = await prisma.cheque.findUnique({
              where: { id: tx.chequeId },
              include: {
                bank: true
              }
            })
            enriched.cheque = cheque
          } catch (err) {
            console.warn(`Failed to fetch cheque ${tx.chequeId}:`, err)
          }
        }

        return enriched
      })
    )

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

    if (!stationId || !type || amount === undefined || !description) {
      return NextResponse.json(
        { error: 'Station ID, type, amount, and description are required' },
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
    // Get transaction timestamp (default to now if not provided)
    const transactionTimestamp = timestamp ? new Date(timestamp) : new Date()
    
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
          'CHEQUE_RECEIVED',
          'LOAN_REPAID'
        ].includes(tx.type)
        
        balanceBefore += txIsIncome ? tx.amount : -tx.amount
      }
    }

    // Calculate balance after transaction
    // For OPENING_BALANCE, the balanceAfter should be the amount (it sets the balance)
    let balanceAfter: number
    if (type === 'OPENING_BALANCE') {
      balanceAfter = parseFloat(amount) // Opening balance sets the balance to this value
    } else {
      const isIncome = [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'CHEQUE_RECEIVED',
        'LOAN_REPAID'
      ].includes(type)

      balanceAfter = balanceBefore + (isIncome ? parseFloat(amount) : -parseFloat(amount))
    }

    // Validate: Log warning for negative balance (allowing overdraft scenarios)
    // Negative balances are allowed but logged for audit purposes
    if (balanceAfter < 0 && type !== 'OPENING_BALANCE') {
      console.warn(`⚠️ Safe balance going negative: ${balanceBefore} -> ${balanceAfter} (Transaction: ${type}, Amount: ${amount})`)
    }

    // Validate: Ensure amount is positive
    if (parseFloat(amount) < 0) {
      return NextResponse.json(
        { error: 'Transaction amount must be positive' },
        { status: 400 }
      )
    }

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

