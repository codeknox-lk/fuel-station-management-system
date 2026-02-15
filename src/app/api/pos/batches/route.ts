import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')
    const limit = searchParams.get('limit')

    if (id) {
      const batch = await prisma.posBatch.findUnique({
        where: { id_organizationId: { id, organizationId: user.organizationId } },
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

    const where: Prisma.PosBatchWhereInput = {
      organizationId: user.organizationId
    }
    if (shiftId) {
      where.shiftId = shiftId
    }

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
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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

    let entries = []
    if (terminalEntries && Array.isArray(terminalEntries) && terminalEntries.length > 0) {
      entries = terminalEntries
    } else if (terminalId && startNumber && endNumber) {
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
      return NextResponse.json({ error: 'At least one terminal entry is required' }, { status: 400 })
    }

    if (totalAmount === undefined) {
      return NextResponse.json({ error: 'Total amount is required' }, { status: 400 })
    }

    const terminalIds = entries.map(e => e.terminalId)
    const terminals = await prisma.posTerminal.findMany({
      where: { id: { in: terminalIds }, organizationId: user.organizationId },
      include: { station: true }
    })

    if (terminals.length !== terminalIds.length) {
      return NextResponse.json({ error: 'One or more terminals not found' }, { status: 404 })
    }

    const station = terminals[0].station
    let shift = null
    if (shiftId) {
      shift = await prisma.shift.findFirst({
        where: { id: shiftId, organizationId: user.organizationId }
      })
    }

    if (!shift) {
      shift = await prisma.shift.findFirst({
        where: { stationId: station.id, status: 'OPEN', organizationId: user.organizationId },
        orderBy: { startTime: 'desc' }
      })
    }

    if (!shift) {
      let template = await prisma.shiftTemplate.findFirst({
        where: { stationId: station.id, isActive: true, organizationId: user.organizationId }
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            stationId: station.id,
            name: 'Default Template',
            startTime: '00:00',
            endTime: '23:59',
            isActive: true,
            organizationId: user.organizationId
          }
        })
      }

      shift = await prisma.shift.create({
        data: {
          stationId: station.id,
          templateId: template.id,
          startTime: new Date(),
          openedBy: 'System',
          status: 'OPEN',
          organizationId: user.organizationId
        }
      })
    }

    const newBatch = await prisma.posBatch.create({
      data: {
        shiftId: shift.id,
        totalAmount: parseFloat(totalAmount),
        notes: notes || null,
        isReconciled: false,
        organizationId: user.organizationId,
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
            dialogTouchAmount: parseFloat(entry.dialogTouchAmount || 0),
            organizationId: user.organizationId
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
                bank: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    })

    if (addToSafe && newBatch.totalAmount > 0) {
      try {
        let safe = await prisma.safe.findFirst({
          where: { stationId: station.id, organizationId: user.organizationId }
        })

        if (!safe) {
          safe = await prisma.safe.create({
            data: {
              stationId: station.id,
              openingBalance: 0,
              currentBalance: 0,
              organizationId: user.organizationId
            }
          })
        }

        const batchTimestamp = newBatch.createdAt || new Date()
        const allTransactions = await prisma.safeTransaction.findMany({
          where: { safeId: safe.id, organizationId: user.organizationId, timestamp: { lte: batchTimestamp } },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        let balanceBefore = safe.openingBalance
        for (const tx of allTransactions) {
          if (tx.type === 'OPENING_BALANCE') balanceBefore = tx.amount
          else {
            const isIncome = ['CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'CHEQUE_RECEIVED', 'LOAN_REPAID'].includes(tx.type)
            balanceBefore += isIncome ? tx.amount : -tx.amount
          }
        }

        const balanceAfter = balanceBefore + newBatch.totalAmount

        interface TerminalEntryWithTerminal {
          terminal?: {
            terminalNumber: string | null
          } | null
        }

        const terminalList = (newBatch.terminalEntries as unknown as TerminalEntryWithTerminal[])
          .map(e => e.terminal?.terminalNumber || 'Unknown')
          .join(', ')

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
            performedBy: user.username || 'System',
            timestamp: batchTimestamp,
            organizationId: user.organizationId
          }
        })

        await prisma.safe.update({
          where: { id_organizationId: { id: safe.id, organizationId: user.organizationId } },
          data: { currentBalance: balanceAfter }
        })
      } catch (safeError) {
        console.error('Error adding POS batch to safe:', safeError)
      }
    }

    return NextResponse.json(newBatch, { status: 201 })
  } catch (error) {
    console.error('Error creating POS batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
