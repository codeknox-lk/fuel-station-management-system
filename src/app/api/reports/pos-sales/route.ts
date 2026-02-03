import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('[POS Sales] Starting report generation...')
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    console.log('[POS Sales] Params:', { stationId, startDate, endDate })

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Parse dates or use defaults (current business month)
    let dateStart: Date
    let dateEnd: Date

    if (startDate && endDate) {
      dateStart = new Date(startDate)
      dateStart.setHours(0, 0, 0, 0)
      dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
    } else {
      // Default to current business month (7th to 6th)
      const now = new Date()
      const currentDay = now.getDate()

      if (currentDay < 7) {
        dateStart = new Date(now.getFullYear(), now.getMonth() - 1, 7, 0, 0, 0, 0)
        dateEnd = new Date(now.getFullYear(), now.getMonth(), 6, 23, 59, 59, 999)
      } else {
        dateStart = new Date(now.getFullYear(), now.getMonth(), 7, 0, 0, 0, 0)
        dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 6, 23, 59, 59, 999)
      }
    }

    // Get all POS batches for the period
    const batches = await prisma.posBatch.findMany({
      where: {
        shift: {
          stationId,
          endTime: {
            gte: dateStart,
            lte: dateEnd
          }
        }
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true
          }
        },
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Get POS terminals for the station
    const posTerminals = await prisma.posTerminal.findMany({
      where: { stationId },
      include: { bank: true }
    })

    console.log('[POS Sales] Found', batches.length, 'batches and', posTerminals.length, 'terminals')

    // Get missing slips count
    const missingSlips = await prisma.posMissingSlip.findMany({
      where: {
        terminal: {
          stationId
        },
        timestamp: {
          gte: dateStart,
          lte: dateEnd
        }
      }
    })

    // Calculate statistics
    let totalSales = 0
    let totalTransactions = 0

    const bankSales = new Map<string, {
      bankName: string
      totalAmount: number
      transactionCount: number
      visa: number
      master: number
      amex: number
      qr: number
      dialogTouch: number
    }>()

    const terminalSales = new Map<string, {
      terminalId: string
      terminalName: string
      terminalNumber: string
      bankName: string
      totalAmount: number
      transactionCount: number
      visa: number
      master: number
      amex: number
      qr: number
      dialogTouch: number
    }>()

    const dailyBreakdown = new Map<string, {
      date: string
      totalAmount: number
      transactionCount: number
    }>()

    // Initialize daily breakdown for all days in range
    const currentDate = new Date(dateStart)
    while (currentDate <= dateEnd) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
      dailyBreakdown.set(dateKey, {
        date: dateKey,
        totalAmount: 0,
        transactionCount: 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Daily breakdown by Bank (for multi-line chart)
    const dailyByBank = new Map<string, Map<string, number>>() // bankId -> date -> amount

    // Daily breakdown by Terminal/POS Machine
    const dailyByTerminal = new Map<string, Map<string, number>>() // terminalId -> date -> amount

    // Get unique banks from terminals
    const uniqueBanks = new Map<string, string>() // bankId -> bankName
    for (const terminal of posTerminals) {
      if (terminal.bankId && terminal.bank) {
        uniqueBanks.set(terminal.bankId, terminal.bank.name)
      }
    }

    // Initialize daily by bank maps for all banks
    for (const [bankId] of uniqueBanks.entries()) {
      const bankDailyMap = new Map<string, number>()
      const currentDate = new Date(dateStart)
      while (currentDate <= dateEnd) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
        bankDailyMap.set(dateKey, 0)
        currentDate.setDate(currentDate.getDate() + 1)
      }
      dailyByBank.set(bankId, bankDailyMap)
    }

    // Initialize daily by terminal maps for all terminals
    for (const terminal of posTerminals) {
      const terminalDailyMap = new Map<string, number>()
      const currentDate = new Date(dateStart)
      while (currentDate <= dateEnd) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
        terminalDailyMap.set(dateKey, 0)
        currentDate.setDate(currentDate.getDate() + 1)
      }
      dailyByTerminal.set(terminal.id, terminalDailyMap)
    }

    // Process batches
    for (const batch of batches) {
      const batchDate = new Date(batch.shift.endTime || batch.shift.startTime)
      const dateKey = `${batchDate.getFullYear()}-${String(batchDate.getMonth() + 1).padStart(2, '0')}-${String(batchDate.getDate()).padStart(2, '0')}`

      for (const entry of batch.terminalEntries) {
        const entryTotal = entry.visaAmount + entry.masterAmount + entry.amexAmount + entry.qrAmount + entry.dialogTouchAmount
        totalSales += entryTotal
        totalTransactions += entry.transactionCount

        // Daily breakdown (total)
        if (dailyBreakdown.has(dateKey)) {
          const dayData = dailyBreakdown.get(dateKey)!
          dayData.totalAmount += entryTotal
          dayData.transactionCount += entry.transactionCount
        }

        // Daily breakdown by bank
        const bankId = entry.terminal.bankId || 'unknown'
        if (dailyByBank.has(bankId)) {
          const bankDaily = dailyByBank.get(bankId)!
          if (bankDaily.has(dateKey)) {
            const currentAmount = bankDaily.get(dateKey)!
            bankDaily.set(dateKey, currentAmount + entryTotal)
          }
        }

        // Daily breakdown by terminal
        if (dailyByTerminal.has(entry.terminalId)) {
          const terminalDaily = dailyByTerminal.get(entry.terminalId)!
          if (terminalDaily.has(dateKey)) {
            const currentAmount = terminalDaily.get(dateKey)!
            terminalDaily.set(dateKey, currentAmount + entryTotal)
          }
        }

        // By bank (for summary)
        const bankName = entry.terminal.bank?.name || 'Unknown Bank'

        if (!bankSales.has(bankId)) {
          bankSales.set(bankId, {
            bankName,
            totalAmount: 0,
            transactionCount: 0,
            visa: 0,
            master: 0,
            amex: 0,
            qr: 0,
            dialogTouch: 0
          })
        }

        const bankData = bankSales.get(bankId)!
        bankData.totalAmount += entryTotal
        bankData.transactionCount += entry.transactionCount
        bankData.visa += entry.visaAmount
        bankData.master += entry.masterAmount
        bankData.amex += entry.amexAmount
        bankData.qr += entry.qrAmount
        bankData.dialogTouch += entry.dialogTouchAmount

        // By terminal (individual POS machine)
        const terminalKey = entry.terminalId
        if (!terminalSales.has(terminalKey)) {
          terminalSales.set(terminalKey, {
            terminalId: entry.terminalId,
            terminalName: entry.terminal.name,
            terminalNumber: entry.terminal.terminalNumber,
            bankName,
            totalAmount: 0,
            transactionCount: 0,
            visa: 0,
            master: 0,
            amex: 0,
            qr: 0,
            dialogTouch: 0
          })
        }

        const terminalData = terminalSales.get(terminalKey)!
        terminalData.totalAmount += entryTotal
        terminalData.transactionCount += entry.transactionCount
        terminalData.visa += entry.visaAmount
        terminalData.master += entry.masterAmount
        terminalData.amex += entry.amexAmount
        terminalData.qr += entry.qrAmount
        terminalData.dialogTouch += entry.dialogTouchAmount
      }
    }

    console.log('[POS Sales] Found', batches.length, 'batches')
    console.log('[POS Sales] Total sales:', totalSales)
    console.log('[POS Sales] Total terminals:', terminalSales.size)
    console.log('[POS Sales] Total banks:', bankSales.size)

    // Convert maps to arrays
    const bankBreakdown = Array.from(bankSales.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const terminalBreakdown = Array.from(terminalSales.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const dailyBreakdownArray = Array.from(dailyBreakdown.values())
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build daily by bank array (for multi-line chart)
    const dailyByBankArray = Array.from(uniqueBanks.entries()).map(([bankId, bankName]) => ({
      bankId,
      bankName,
      dailySales: Array.from(dailyByBank.get(bankId)?.entries() || [])
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }))

    // Build daily by terminal array (for daily table view)
    const dailyByTerminalArray = Array.from(terminalSales.values()).map(terminal => ({
      terminalId: terminal.terminalId,
      terminalName: terminal.terminalName,
      terminalNumber: terminal.terminalNumber,
      bankName: terminal.bankName,
      dailySales: Array.from(dailyByTerminal.get(terminal.terminalId)?.entries() || [])
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }))

    return NextResponse.json({
      summary: {
        totalSales: Math.round(totalSales),
        totalTransactions,
        totalTerminals: terminalSales.size,
        totalBanks: bankSales.size,
        missingSlipsCount: missingSlips.length,
        reconciledBatches: batches.filter(b => b.isReconciled).length,
        unreconciledBatches: batches.filter(b => !b.isReconciled).length
      },
      dailyBreakdown: dailyBreakdownArray,
      dailyByBank: dailyByBankArray,
      dailyByTerminal: dailyByTerminalArray,
      terminalBreakdown,
      bankBreakdown,
      missingSlips: missingSlips.map(slip => ({
        id: slip.id,
        terminalName: 'Unknown', // Will be populated from include
        lastFourDigits: slip.lastFourDigits,
        amount: slip.amount,
        timestamp: slip.timestamp,
        reportedBy: slip.reportedBy
      })),
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      }
    })
  } catch (error) {
    console.error('[POS Sales] ERROR:', error)
    console.error('[POS Sales] Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch POS sales report',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
