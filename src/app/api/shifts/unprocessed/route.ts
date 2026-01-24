import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET: Get closed shifts that haven't been added to the safe yet
 * Returns shifts with their cash amounts that need to be processed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Get closed shifts from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED',
        endTime: {
          gte: today
        }
      },
      orderBy: { endTime: 'desc' },
      take: 20,
      include: {
        template: {
          select: {
            name: true
          }
        },
        assignments: {
          select: {
            id: true,
            pumperName: true
          }
        }
      }
    })

    // Check which tenders have already been added to safe
    const shiftIds = shifts.map(s => s.id)
    const safeTransactions = await prisma.safeTransaction.findMany({
      where: {
        shiftId: {
          in: shiftIds
        },
        type: {
          in: ['CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT', 'CHEQUE_RECEIVED']
        }
      },
      select: {
        shiftId: true,
        type: true
      }
    })

    // Create a map of processed types per shift
    const processedTypes = new Map<string, Set<string>>()
    safeTransactions.forEach(tx => {
      if (!tx.shiftId) return
      if (!processedTypes.has(tx.shiftId)) {
        processedTypes.set(tx.shiftId, new Set())
      }
      processedTypes.get(tx.shiftId)!.add(tx.type)
    })

    // Get batch totals for each shift to check if card tenders are fully processed
    const allBatches = await prisma.posBatch.findMany({
      where: { shiftId: { in: shiftIds } },
      select: {
        shiftId: true,
        totalAmount: true
      }
    })

    const batchTotalsByShift = new Map<string, number>()
    allBatches.forEach(batch => {
      const current = batchTotalsByShift.get(batch.shiftId) || 0
      batchTotalsByShift.set(batch.shiftId, current + batch.totalAmount)
    })

    interface DeclaredAmounts {
      cash: number
      card: number
      credit: number
      cheque: number
    }
    interface ShiftStatistics {
      totalSales: number
    }

    // Format shifts with all tender types
    const unprocessedShifts = shifts.map(shift => {
      const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
      const statistics = shift.statistics as unknown as ShiftStatistics
      const processedForShift = processedTypes.get(shift.id) || new Set()

      const cashAmount = declaredAmounts?.cash || 0
      const cardAmount = declaredAmounts?.card || 0
      const creditAmount = declaredAmounts?.credit || 0
      const chequeAmount = declaredAmounts?.cheque || 0
      const totalSales = statistics?.totalSales || 0

      // Check if card tender is fully processed (all batches added to safe)
      const cardProcessed = processedForShift.has('POS_CARD_PAYMENT')
      const batchTotal = batchTotalsByShift.get(shift.id) || 0
      // Card is only considered processed if there's a safe transaction AND batch total matches card amount
      const isCardFullyProcessed = cardProcessed && (batchTotal >= cardAmount || cardAmount === 0)

      return {
        id: shift.id,
        templateName: shift.template.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        totalSales,
        tenderTypes: {
          cash: { amount: cashAmount, processed: processedForShift.has('CASH_FUEL_SALES') },
          card: { amount: cardAmount, processed: isCardFullyProcessed },
          credit: { amount: creditAmount, processed: processedForShift.has('CREDIT_PAYMENT') },
          cheque: { amount: chequeAmount, processed: processedForShift.has('CHEQUE_RECEIVED') }
        },
        pumperName: shift.assignments[0]?.pumperName || 'Unknown',
        assignmentCount: shift.assignments.length
      }
    }).filter(shift => {
      // Only show shifts with at least one unprocessed tender type
      const hasUnprocessed = Object.values(shift.tenderTypes).some(tt => tt.amount > 0 && !tt.processed)
      return hasUnprocessed
    })

    return NextResponse.json(unprocessedShifts)
  } catch (error) {
    console.error('Error fetching unprocessed shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

