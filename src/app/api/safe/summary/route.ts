import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const date = new Date(dateStr)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    // Get shifts for the day to calculate sales
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
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

    // Get actual safe transactions for the day (not calculated from shifts)
    // This ensures we get the actual cash amounts that were declared/added to safe
    const safe = await prisma.safe.findUnique({
      where: { stationId }
    })

    if (!safe) {
      return NextResponse.json({
        date: dateStr,
        stationId,
        totalCashIn: 0,
        totalExpenses: 0,
        totalLoansGiven: 0,
        totalCreditRepayments: 0,
        totalChequeEncashed: 0,
        totalDeposits: 0,
        netCash: 0,
        openingBalance: 0,
        closingBalance: 0
      })
    }

    // Get all transactions for the day
    const dayTransactions = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Calculate actual cash in from safe transactions (only CASH_FUEL_SALES type)
    const totalCashIn = dayTransactions
      .filter(tx => tx.type === 'CASH_FUEL_SALES')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Also get POS card payments (should be in safe)
    const totalPosCardIn = dayTransactions
      .filter(tx => tx.type === 'POS_CARD_PAYMENT')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Get expenses from safe transactions (EXPENSE type) or expense records
    const totalExpensesFromSafe = dayTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Also get from expense records (if not from safe)
    const expenses = await prisma.expense.findMany({
      where: {
        stationId,
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        fromSafe: false // Only count expenses not yet deducted from safe
      }
    })
    const totalExpenses = totalExpensesFromSafe + expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Get loans given from safe transactions
    const totalLoansGiven = dayTransactions
      .filter(tx => tx.type === 'LOAN_GIVEN')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Get credit repayments from safe transactions
    const totalCreditRepayments = dayTransactions
      .filter(tx => tx.type === 'CREDIT_PAYMENT')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Get cheques received (not encashed - those are when they clear)
    const totalChequeReceived = dayTransactions
      .filter(tx => tx.type === 'CHEQUE_RECEIVED')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Get deposits from safe transactions
    const totalDeposits = dayTransactions
      .filter(tx => tx.type === 'BANK_DEPOSIT')
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate opening balance (balance at start of day)
    // Get all transactions before start of day, ordered chronologically
    const transactionsBeforeDay = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        timestamp: { lt: startOfDay }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Calculate opening balance (balance at start of day)
    // OPENING_BALANCE transactions set the balance, they don't add/subtract
    let openingBalance = safe.openingBalance
    for (const tx of transactionsBeforeDay) {
      if (tx.type === 'OPENING_BALANCE') {
        // OPENING_BALANCE sets the balance to this value
        openingBalance = tx.amount
      } else {
        // Regular transactions add or subtract
        const txIsIncome = [
          'CASH_FUEL_SALES',
          'POS_CARD_PAYMENT',
          'CREDIT_PAYMENT',
          'CHEQUE_RECEIVED',
          'LOAN_REPAID'
        ].includes(tx.type)

        openingBalance += txIsIncome ? tx.amount : -tx.amount
      }
    }

    // Calculate total income for the day
    const totalIncome = dayTransactions
      .filter(tx => [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'CHEQUE_RECEIVED',
        'LOAN_REPAID'
      ].includes(tx.type))
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate total outflow for the day
    const totalOutflow = dayTransactions
      .filter(tx => [
        'EXPENSE',
        'BANK_DEPOSIT',
        'LOAN_GIVEN'
      ].includes(tx.type))
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Calculate closing balance and net cash
    const closingBalance = openingBalance + totalIncome - totalOutflow
    const netCash = totalIncome - totalOutflow
    // expectedBalance is the same as closingBalance, no need to calculate twice
    const expectedBalance = closingBalance

    // Get actual balance from safe (current balance at end of day)
    // Calculate actual balance at end of day
    const allTransactions = await prisma.safeTransaction.findMany({
      where: {
        safeId: safe.id,
        timestamp: { lte: endOfDay }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Calculate actual balance at end of day
    // OPENING_BALANCE transactions set the balance, they don't add/subtract
    let actualBalance = safe.openingBalance
    for (const tx of allTransactions) {
      if (tx.type === 'OPENING_BALANCE') {
        // OPENING_BALANCE sets the balance to this value
        actualBalance = tx.amount
      } else {
        // Regular transactions add or subtract
        const txIsIncome = [
          'CASH_FUEL_SALES',
          'POS_CARD_PAYMENT',
          'CREDIT_PAYMENT',
          'CHEQUE_RECEIVED',
          'LOAN_REPAID'
        ].includes(tx.type)
        actualBalance += txIsIncome ? tx.amount : -tx.amount
      }
    }

    const variance = actualBalance - expectedBalance
    const isBalanced = Math.abs(variance) <= 500 // Tolerance of Rs. 500

    // Get station name
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      select: { name: true }
    })

    interface InflowDetail {
      id: string
      type: string
      description: string
      amount: number
      time: string
      reference?: string
    }

    // Get inflow details
    const inflowDetails: InflowDetail[] = dayTransactions
      .filter(tx => [
        'CASH_FUEL_SALES',
        'POS_CARD_PAYMENT',
        'CREDIT_PAYMENT',
        'CHEQUE_RECEIVED',
        'LOAN_REPAID'
      ].includes(tx.type))
      .map(tx => ({
        id: tx.id,
        type: tx.type === 'CASH_FUEL_SALES' ? 'CASH_SALES' :
          tx.type === 'POS_CARD_PAYMENT' ? 'CARD_PAYMENT' :
            tx.type === 'CREDIT_PAYMENT' ? 'CREDIT_PAYMENT' :
              tx.type === 'CHEQUE_RECEIVED' ? 'CHEQUE_RECEIVED' :
                tx.type === 'LOAN_REPAID' ? 'LOAN_RECEIPT' : 'OTHER',
        description: tx.description,
        amount: tx.amount,
        time: new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        reference: tx.shiftId || tx.creditSaleId || tx.batchId || tx.loanId || undefined
      }))

    interface OutflowDetail {
      id: string
      type: string
      description: string
      amount: number
      time: string
      reference?: string
      approvedBy?: string
    }

    // Get outflow details
    const outflowDetails: OutflowDetail[] = dayTransactions
      .filter(tx => [
        'EXPENSE',
        'BANK_DEPOSIT',
        'LOAN_GIVEN'
      ].includes(tx.type))
      .map(tx => ({
        id: tx.id,
        type: tx.type === 'EXPENSE' ? 'EXPENSE' :
          tx.type === 'BANK_DEPOSIT' ? 'DEPOSIT' :
            tx.type === 'LOAN_GIVEN' ? 'LOAN_PAYMENT' : 'OTHER',
        description: tx.description,
        amount: tx.amount,
        time: new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        reference: tx.expenseId || tx.depositId || tx.loanId || undefined,
        approvedBy: tx.performedBy || 'System'
      }))

    // Calculate breakdown
    const cashSales = dayTransactions
      .filter(tx => tx.type === 'CASH_FUEL_SALES')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const creditPayments = dayTransactions
      .filter(tx => tx.type === 'CREDIT_PAYMENT')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const loanReceipts = dayTransactions
      .filter(tx => tx.type === 'LOAN_REPAID')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const otherInflows = dayTransactions
      .filter(tx => tx.type === 'CHEQUE_RECEIVED' || tx.type === 'POS_CARD_PAYMENT')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const loanPayments = dayTransactions
      .filter(tx => tx.type === 'LOAN_GIVEN')
      .reduce((sum, tx) => sum + tx.amount, 0)

    const otherOutflows = dayTransactions
      .filter(tx => tx.type !== 'EXPENSE' && tx.type !== 'BANK_DEPOSIT' &&
        tx.type !== 'LOAN_GIVEN' && ![
          'CASH_FUEL_SALES', 'POS_CARD_PAYMENT', 'CREDIT_PAYMENT',
          'CHEQUE_RECEIVED', 'LOAN_REPAID', 'OPENING_BALANCE'
        ].includes(String(tx.type)))
      .reduce((sum, tx) => sum + tx.amount, 0)

    const summary = {
      stationId,
      stationName: station?.name || 'Unknown Station',
      date: dateStr,
      openingBalance,
      cashSales,
      creditPayments,
      loanReceipts,
      otherInflows,
      totalInflows: totalIncome,
      expenses: totalExpenses,
      loanPayments,
      deposits: totalDeposits,
      otherOutflows,
      totalOutflows: totalOutflow,
      expectedBalance,
      actualBalance,
      variance,
      isBalanced,
      inflowDetails,
      outflowDetails,
      // Also return legacy fields for compatibility
      totalCashIn,
      totalPosCardIn,
      totalCreditRepayments,
      totalChequeReceived,
      netCash,
      closingBalance
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching safe summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
