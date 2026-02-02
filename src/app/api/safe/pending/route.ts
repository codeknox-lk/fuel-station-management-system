import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Get shifts with cash that hasn't been deposited to safe yet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Get all closed shifts for this station
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED'
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        closedBy: true,
        statistics: true,
        declaredAmounts: true
      },
      orderBy: { endTime: 'desc' }
    })

    // Get safe transactions for these shifts
    const shiftIds = shifts.map(s => s.id)
    const depositedShifts = await prisma.safeTransaction.findMany({
      where: {
        shiftId: { in: shiftIds },
        type: 'CASH_FUEL_SALES'
      },
      select: {
        shiftId: true,
        amount: true
      }
    })

    // Map deposited amounts by shift ID
    const depositedMap = new Map<string, number>()
    for (const deposit of depositedShifts) {
      if (deposit.shiftId) {
        depositedMap.set(deposit.shiftId, (depositedMap.get(deposit.shiftId) || 0) + deposit.amount)
      }
    }

    // Filter shifts that have undeposited cash
    // Filter shifts that have undeposited cash
    interface DeclaredAmounts {
      cash: number
      credit?: number
      cheque?: number
      card?: number
      expenses?: number
    }

    interface ShiftStats {
      totalSales: number
      totalTransactions?: number
      stockVariance?: number
      cashSales?: number
    }

    const pendingShifts = shifts.filter(shift => {
      const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
      const cashAmount = declaredAmounts?.cash || 0
      const deposited = depositedMap.get(shift.id) || 0
      return cashAmount > 0 && deposited < cashAmount
    })

    // Calculate pending amounts
    const result = pendingShifts.map(shift => {
      const declaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts
      const statistics = shift.statistics as unknown as ShiftStats
      const cashAmount = declaredAmounts?.cash || 0
      const deposited = depositedMap.get(shift.id) || 0
      const pending = cashAmount - deposited

      return {
        shiftId: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        closedBy: shift.closedBy,
        totalSales: statistics?.totalSales || 0,
        cashAmount,
        deposited,
        pending
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching pending shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
