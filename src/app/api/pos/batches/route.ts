import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')
    const limit = searchParams.get('limit')

    if (id) {
      // OPTIMIZED: Use select for single batch
      const batch = await prisma.posBatch.findUnique({
        where: { id },
        select: {
          id: true,
          shiftId: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
          terminalEntries: {
            select: {
              id: true,
              terminalId: true,
              startNumber: true,
              endNumber: true,
              transactionCount: true,
              visaAmount: true,
              masterAmount: true,
              amexAmount: true,
              qrAmount: true,
              dialogTouchAmount: true,
              createdAt: true,
              terminal: {
                select: {
                  id: true,
                  name: true,
                  terminalNumber: true,
                  bank: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!batch) {
        return NextResponse.json({ error: 'POS batch not found' }, { status: 404 })
      }
      return NextResponse.json(batch)
    }

    interface PosBatchWhereInput {
      shiftId?: string
    }
    const where: PosBatchWhereInput = {}
    if (shiftId) {
      where.shiftId = shiftId
    }

    // OPTIMIZED: Use select for batch list
    const batches = await prisma.posBatch.findMany({
      where,
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
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {})
    })

    // Filter by terminal if specified
    if (terminalId) {
      const filteredBatches = batches.filter(batch =>
        batch.terminalEntries.some(entry => entry.terminalId === terminalId)
      )
      return NextResponse.json(filteredBatches)
    }

    return NextResponse.json(batches)
  } catch (error) {
    console.error('Error fetching POS batches:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // New format: Accept terminalEntries array OR legacy single terminal format
    const {
      shiftId,
      terminalId, // Legacy field
      startNumber, // Legacy fields
      endNumber,
      transactionCount,
      visaAmount,
      masterAmount,
      amexAmount,
      qrAmount,
      dialogTouchAmount,
      terminalEntries, // New field: array of terminal entries
      totalAmount,
      notes,
      addToSafe
    } = body

    // Support both formats: array of entries OR single terminal
    let entries = []
    if (terminalEntries && Array.isArray(terminalEntries) && terminalEntries.length > 0) {
      entries = terminalEntries
    } else if (terminalId && startNumber && endNumber) {
      // Legacy format: create single entry from old fields
      entries = [{
        terminalId,
        startNumber,
        endNumber,
        transactionCount: transactionCount || 0,
        visaAmount: visaAmount || 0,
        masterAmount: masterAmount || 0,
        amexAmount: amexAmount || 0,
        qrAmount: qrAmount || 0,
        dialogTouchAmount: dialogTouchAmount || 0
      }]
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'At least one terminal entry is required' },
        { status: 400 }
      )
    }

    if (totalAmount === undefined) {
      return NextResponse.json(
        { error: 'Total amount is required' },
        { status: 400 }
      )
    }

    // Validate all terminals exist and get station
    const terminalIds = entries.map(e => e.terminalId)
    const terminals = await prisma.posTerminal.findMany({
      where: { id: { in: terminalIds } },
      include: { station: true }
    })

    if (terminals.length !== terminalIds.length) {
      return NextResponse.json({ error: 'One or more terminals not found' }, { status: 404 })
    }

    const station = terminals[0].station

    // Use provided shiftId or find/create active shift
    let shift = null
    if (shiftId) {
      shift = await prisma.shift.findUnique({
        where: { id: shiftId }
      })
    }

    if (!shift) {
      // Find or create active shift
      shift = await prisma.shift.findFirst({
        where: {
          stationId: station.id,
          status: 'OPEN'
        },
        orderBy: { startTime: 'desc' }
      })
    }

    if (!shift) {
      // Find or create default template
      let template = await prisma.shiftTemplate.findFirst({
        where: {
          stationId: station.id,
          isActive: true
        }
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            stationId: station.id,
            name: 'Default Template',
            startTime: '00:00',
            endTime: '23:59',
            isActive: true
          }
        })
      }

      // Create new shift
      shift = await prisma.shift.create({
        data: {
          stationId: station.id,
          templateId: template.id,
          startTime: new Date(),
          openedBy: 'System',
          status: 'OPEN'
        }
      })
    }

    // Create batch with multiple terminal entries
    const newBatch = await prisma.posBatch.create({
      data: {
        shiftId: shift.id,
        totalAmount: parseFloat(totalAmount),
        notes: notes || null,
        isReconciled: false,
        terminalEntries: {
          create: entries.map(entry => ({
            terminalId: entry.terminalId,
            startNumber: entry.startNumber,
            endNumber: entry.endNumber,
            transactionCount: entry.transactionCount || 0,
            visaAmount: parseFloat(entry.visaAmount || 0),
            masterAmount: parseFloat(entry.masterAmount || 0),
            amexAmount: parseFloat(entry.amexAmount || 0),
            qrAmount: parseFloat(entry.qrAmount || 0),
            dialogTouchAmount: parseFloat(entry.dialogTouchAmount || 0)
          }))
        }
      },
      include: {
        terminalEntries: {
          include: {
            terminal: {
              select: {
                id: true,
                name: true,
                terminalNumber: true,
                bank: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Add to safe if requested
    if (addToSafe && newBatch.totalAmount > 0) {
      try {
        // Get or create safe
        const shift = await prisma.shift.findUnique({
          where: { id: newBatch.shiftId },
          select: { stationId: true }
        })

        if (shift) {
          let safe = await prisma.safe.findUnique({
            where: { stationId: shift.stationId }
          })

          if (!safe) {
            safe = await prisma.safe.create({
              data: {
                stationId: shift.stationId,
                openingBalance: 0,
                currentBalance: 0
              }
            })
          }

          // Calculate balance before transaction chronologically
          const batchTimestamp = newBatch.createdAt || new Date()
          const allTransactions = await prisma.safeTransaction.findMany({
            where: {
              safeId: safe.id,
              timestamp: { lte: batchTimestamp }
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

          const balanceAfter = balanceBefore + newBatch.totalAmount

          // Create description from terminal entries
          interface BatchEntryWithTerminal {
            terminalNumber?: string
            terminal?: {
              terminalNumber: string
            }
          }
          const terminalList = newBatch.terminalEntries
            .map((entry) => {
              const e = entry as unknown as BatchEntryWithTerminal
              return `${e.terminal?.terminalNumber || e.terminalNumber || 'Unknown'}`
            })
            .join(', ')

          // Create safe transaction
          await prisma.safeTransaction.create({
            data: {
              safeId: safe.id,
              type: 'POS_CARD_PAYMENT',
              amount: newBatch.totalAmount,
              balanceBefore,
              balanceAfter,
              batchId: newBatch.id,
              shiftId: newBatch.shiftId,
              description: `POS batch (Terminals: ${terminalList})`,
              performedBy: 'System',
              timestamp: batchTimestamp
            }
          })

          // Update safe balance
          await prisma.safe.update({
            where: { id: safe.id },
            data: { currentBalance: balanceAfter }
          })
        }
      } catch (safeError) {
        console.error('Error adding POS batch to safe:', safeError)
        // Don't fail batch creation if safe transaction fails
      }
    }

    return NextResponse.json(newBatch, { status: 201 })
  } catch (error) {
    console.error('Error creating POS batch:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid shift or terminal ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

