import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required', message: 'Station ID is required', details: 'Station ID parameter is missing' }, { status: 400 })
    }

    // Validate and parse date
    let date: Date
    try {
      date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid date format', 
          message: 'Invalid date format', 
          details: `Date "${dateStr}" is not a valid date` 
        }, { status: 400 })
      }
    } catch (dateError) {
      return NextResponse.json({ 
        error: 'Invalid date format', 
        message: 'Invalid date format', 
        details: dateError instanceof Error ? dateError.message : 'Unknown date parsing error' 
      }, { status: 400 })
    }

    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    console.log(`[Daily Report API] Fetching report for stationId: ${stationId}, date: ${dateStr}`)
    console.log(`[Daily Report API] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Get station info
    let station
    try {
      station = await prisma.station.findUnique({
        where: { id: stationId }
      })
      if (!station) {
        return NextResponse.json({ error: 'Station not found' }, { status: 404 })
      }
    } catch (stationError) {
      console.error('[Daily Report API] Error fetching station:', stationError)
      return NextResponse.json(
        { error: 'Error fetching station', details: stationError instanceof Error ? stationError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Get shifts for the day - get shifts that ENDED on this day (or were active during the day)
    // This ensures we capture all sales that happened on this day, even if shift started previous day
    let shifts
    try {
      // First, get shifts without nested where clause to avoid potential Prisma issues
      // Get shifts that either:
      // 1. Ended on this day (endTime within day range) - most common case
      // 2. Started on this day and are CLOSED (for same-day shifts)
      const allShifts = await prisma.shift.findMany({
        where: {
          stationId,
          status: 'CLOSED', // Only include closed shifts for accurate reporting
          OR: [
            {
              // Shifts that ended on this day
              endTime: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            {
              // Shifts that started on this day (fallback for same-day shifts)
              startTime: {
                gte: startOfDay,
                lte: endOfDay
              },
              endTime: {
                lte: endOfDay
              }
            }
          ]
        },
        include: {
          assignments: {
            include: {
              nozzle: {
                include: {
                  pump: {
                    select: {
                      id: true,
                      pumpNumber: true,
                      isActive: true
                    }
                  },
                  tank: {
                    select: {
                      id: true,
                      fuelId: true,
                      fuel: true,
                      capacity: true,
                      currentLevel: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Filter assignments in JavaScript to only include closed ones with end meter reading
      shifts = allShifts.map(shift => ({
        ...shift,
        assignments: shift.assignments.filter(
          assignment => assignment.status === 'CLOSED' && assignment.endMeterReading !== null && assignment.endMeterReading !== undefined
        )
      }))

      const totalAssignments = allShifts.reduce((sum, s) => sum + s.assignments.length, 0)
      const filteredAssignments = shifts.reduce((sum, s) => sum + s.assignments.length, 0)
      console.log(`[Daily Report API] Found ${shifts.length} shifts for the day (${filteredAssignments} filtered assignments out of ${totalAssignments} total)`)
      
      // Log details about each shift for debugging
      shifts.forEach((shift, idx) => {
        console.log(`[Daily Report API] Shift ${idx + 1}: id=${shift.id}, status=${shift.status}, assignments=${shift.assignments.length}`)
        shift.assignments.forEach((assignment, aIdx) => {
          console.log(`  Assignment ${aIdx + 1}: start=${assignment.startMeterReading}, end=${assignment.endMeterReading}, nozzle=${assignment.nozzleId}, tank=${assignment.nozzle?.tank?.id || 'N/A'}, fuel=${assignment.nozzle?.tank?.fuel?.name || 'N/A'}`)
        })
      })
    } catch (shiftsError) {
      console.error('[Daily Report API] Error fetching shifts:', shiftsError)
      
      let errorMessage = 'Unknown error'
      let errorDetails = 'Unknown error'
      
      if (shiftsError instanceof Error) {
        errorMessage = shiftsError.message
        errorDetails = shiftsError.toString()
        console.error('[Daily Report API] Error message:', errorMessage)
        console.error('[Daily Report API] Error details:', errorDetails)
        if (shiftsError.stack) {
          console.error('[Daily Report API] Error stack:', shiftsError.stack)
        }
      } else if (typeof shiftsError === 'string') {
        errorMessage = shiftsError
        errorDetails = shiftsError
      } else {
        try {
          errorDetails = JSON.stringify(shiftsError)
        } catch {
          errorDetails = String(shiftsError)
        }
      }

      const errorResponse = {
        error: 'Error fetching shifts',
        message: errorMessage,
        details: errorDetails
      }

      console.error('[Daily Report API] Returning error response:', JSON.stringify(errorResponse, null, 2))

      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Calculate sales by fuel type
    const salesByFuelType = new Map<string, number>()
    let totalSales = 0
    let totalLiters = 0

    console.log(`[Daily Report API] Processing ${shifts.length} shifts for sales calculation`)
    
    for (const shift of shifts) {
      if (!shift.assignments || !Array.isArray(shift.assignments)) {
        console.log(`[Daily Report API] Shift ${shift.id} has no assignments or assignments is not an array`)
        continue
      }
      
      console.log(`[Daily Report API] Processing shift ${shift.id} with ${shift.assignments.length} assignments`)
      
      for (const assignment of shift.assignments) {
        if (!assignment.endMeterReading || !assignment.startMeterReading) {
          console.log(`[Daily Report API] Assignment ${assignment.id} missing meter readings: start=${assignment.startMeterReading}, end=${assignment.endMeterReading}`)
          continue
        }
        
        if (!assignment.nozzle || !assignment.nozzle.tank) {
          console.log(`[Daily Report API] Assignment ${assignment.id} missing nozzle or tank: nozzle=${!!assignment.nozzle}, tank=${!!(assignment.nozzle?.tank)}`)
          continue
        }
        
        // Handle meter rollover
        let litersSold = assignment.endMeterReading - assignment.startMeterReading
        if (litersSold < 0) {
          // Check for meter rollover (meter reset from 99999 to 0)
          const METER_MAX = 99999
          if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
            litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
            console.log(`[Daily Report API] Meter rollover detected for assignment ${assignment.id}: ${assignment.startMeterReading} -> ${assignment.endMeterReading}, calculated liters: ${litersSold}`)
          } else {
            console.log(`[Daily Report API] Assignment ${assignment.id} has invalid liters sold: ${litersSold} (not a rollover)`)
            continue
          }
        }
        
        if (litersSold <= 0) {
          console.log(`[Daily Report API] Assignment ${assignment.id} has invalid liters sold: ${litersSold}`)
          continue
        }

        const fuelId = assignment.nozzle.tank.fuelId
        if (!fuelType) {
          console.log(`[Daily Report API] Assignment ${assignment.id} has no fuel type`)
          continue
        }
        
        try {
          const price = await prisma.price.findFirst({
            where: {
              fuelType,
              stationId,
              effectiveDate: { lte: shift.endTime || shift.startTime },
              isActive: true
            },
            orderBy: { effectiveDate: 'desc' }
          })
          
          const pricePerLiter = price ? price.price : 0
          if (pricePerLiter === 0) {
            console.log(`[Daily Report API] No price found for fuelType ${fuelType} at station ${stationId}`)
          }
          
          const salesAmount = litersSold * pricePerLiter
          
          const current = salesByFuelType.get(fuelType) || 0
          salesByFuelType.set(fuelType, current + salesAmount)
          totalSales += salesAmount
          totalLiters += litersSold
          
          console.log(`[Daily Report API] Assignment ${assignment.id}: ${litersSold}L ${fuelType} @ Rs.${pricePerLiter}/L = Rs.${salesAmount}`)
        } catch (priceError) {
          console.error(`[Daily Report API] Error fetching price for fuelType ${fuelType}:`, priceError)
          // Continue with price 0
        }
      }
    }

    console.log(`[Daily Report API] Total sales calculated: Rs.${totalSales}, Total liters: ${totalLiters}L`)
    console.log(`[Daily Report API] Sales by fuel type:`, Object.fromEntries(salesByFuelType))

    // Extract fuel sales (matching frontend expectations)
    const petrolSales = salesByFuelType.get('PETROL_92') || salesByFuelType.get('PETROL_95') || 0
    const dieselSales = salesByFuelType.get('DIESEL') || 0
    const superDieselSales = salesByFuelType.get('SUPER_DIESEL') || 0
    const oilSales = salesByFuelType.get('OIL') || 0
    const canSales = 0 // Can sales would need separate tracking
    const totalFuelSales = petrolSales + dieselSales + superDieselSales

    // Calculate tender breakdown from shift declared amounts
    let cashAmount = 0
    let cardAmount = 0
    let creditAmount = 0
    let chequeAmount = 0

    for (const shift of shifts) {
      const declared = (shift.declaredAmounts as any) || {}
      cashAmount += declared.cash || 0
      cardAmount += declared.card || 0
      creditAmount += declared.credit || 0
      chequeAmount += declared.cheque || 0
    }

    // Get shift IDs for related queries
    const shiftIds = shifts.map(s => s.id)

    // Get POS batches and terminals
    let posBatches: any[] = []
    if (shiftIds.length > 0) {
      try {
        posBatches = await prisma.posBatch.findMany({
          where: {
            shiftId: {
              in: shiftIds
            }
          },
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
      } catch (posError) {
        console.error('[Daily Report API] Error fetching POS batches:', posError)
        // Continue with empty array
      }
    }

    // Build POS terminal breakdown
    const posTerminalsMap = new Map<string, any>()
    for (const batch of posBatches) {
      if (!batch.terminalEntries || !Array.isArray(batch.terminalEntries)) continue
      
      for (const entry of batch.terminalEntries) {
        if (!entry.terminal || !entry.terminal.id) continue
        
        const terminalId = entry.terminal.id
        if (!posTerminalsMap.has(terminalId)) {
          posTerminalsMap.set(terminalId, {
            terminalId: entry.terminal.id,
            terminalName: entry.terminal.name || `Terminal ${entry.terminal.terminalNumber || 'Unknown'}`,
            terminalNumber: entry.terminal.terminalNumber || 'Unknown',
            bankName: entry.terminal.bank?.name || 'Unknown Bank',
            totalAmount: 0,
            transactionCount: 0,
            visaAmount: 0,
            mastercardAmount: 0,
            amexAmount: 0,
            qrAmount: 0,
            dialogTouchAmount: 0,
            missingSlips: 0,
            missingSlipAmount: 0
          })
        }
        const terminal = posTerminalsMap.get(terminalId)!
        const entryTotal = (entry.visaAmount || 0) + (entry.masterAmount || 0) + (entry.amexAmount || 0) + (entry.qrAmount || 0)
        terminal.totalAmount += entryTotal
        terminal.transactionCount += entry.transactionCount || 0
        terminal.visaAmount += (entry.visaAmount || 0)
        terminal.mastercardAmount += (entry.masterAmount || 0)
        terminal.amexAmount += (entry.amexAmount || 0)
        terminal.qrAmount += (entry.qrAmount || 0)
        terminal.dialogTouchAmount += 0 // Not in schema, would need to be added if needed
      }
    }
    const posTerminals = Array.from(posTerminalsMap.values())
    const totalPOSAmount = posTerminals.reduce((sum, t) => sum + t.totalAmount, 0)

    // Get credit customers and sales
    let creditSales: any[] = []
    if (shiftIds.length > 0) {
      try {
        creditSales = await prisma.creditSale.findMany({
          where: {
            shiftId: {
              in: shiftIds
            }
          },
          include: {
            customer: true,
            shift: true
          }
        })
      } catch (creditError) {
        console.error('[Daily Report API] Error fetching credit sales:', creditError)
        // Continue with empty array
      }
    }

    const creditCustomersMap = new Map<string, any>()
    for (const sale of creditSales) {
      const customerId = sale.customerId
      if (!creditCustomersMap.has(customerId)) {
        creditCustomersMap.set(customerId, {
          customerId: sale.customer.id,
          customerName: sale.customer.name,
          totalSales: 0,
          transactionCount: 0,
          creditLimit: sale.customer.creditLimit || 0,
          currentBalance: sale.customer.currentBalance || 0,
          paymentReceived: 0
        })
      }
      const customer = creditCustomersMap.get(customerId)!
      customer.totalSales += sale.amount
      customer.transactionCount += 1
    }

    // Get credit payments for the day
    // First get all credit payments for the day, then filter by checking if customer has sales in our shifts
    let creditPayments: any[] = []
    try {
      // Get all credit payments for the day
      const allCreditPayments = await prisma.creditPayment.findMany({
        where: {
          paymentDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          customer: {
            include: {
              creditSales: {
                where: {
                  shiftId: {
                    in: shiftIds.length > 0 ? shiftIds : []
                  }
                },
                take: 1 // We just need to know if there's at least one
              }
            }
          }
        }
      })

      // Filter to only include payments where customer has sales in our shifts
      if (shiftIds.length > 0) {
        creditPayments = allCreditPayments.filter(payment => 
          payment.customer.creditSales && payment.customer.creditSales.length > 0
        )
      } else {
        // If no shifts, no credit payments should be included
        creditPayments = []
      }
    } catch (creditPaymentError) {
      console.error('[Daily Report API] Error fetching credit payments:', creditPaymentError)
      if (creditPaymentError instanceof Error) {
        console.error('[Daily Report API] Credit payment error details:', creditPaymentError.message)
        console.error('[Daily Report API] Credit payment error stack:', creditPaymentError.stack)
      }
      // Continue with empty array
      creditPayments = []
    }

    for (const payment of creditPayments) {
      const customer = creditCustomersMap.get(payment.customerId)
      if (customer) {
        customer.paymentReceived += payment.amount
      }
    }

    const creditCustomers = Array.from(creditCustomersMap.values()).map(c => ({
      ...c,
      averageTransaction: c.transactionCount > 0 ? c.totalSales / c.transactionCount : 0
    }))
    const totalCreditSales = creditCustomers.reduce((sum, c) => sum + c.totalSales, 0)

    // Get cheques
    let cheques: any[] = []
    try {
      cheques = await prisma.cheque.findMany({
        where: {
          stationId,
          receivedDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          bank: true
        }
      })
    } catch (chequeError) {
      console.error('[Daily Report API] Error fetching cheques:', chequeError)
      // Continue with empty array
    }

    const chequeBreakdown = cheques.map(cheque => ({
      chequeId: cheque.id,
      chequeNumber: cheque.chequeNumber || `CHQ-${cheque.id.slice(0, 6)}`,
      amount: cheque.amount,
      receivedFrom: cheque.receivedFrom || 'Unknown',
      bankName: cheque.bank?.name || 'Unknown Bank',
      bankBranch: cheque.bankBranch || 'Unknown',
      receivedDate: cheque.receivedDate?.toISOString().split('T')[0] || dateStr,
      status: cheque.status
    }))
    const totalChequeAmount = chequeBreakdown.reduce((sum, c) => sum + c.amount, 0)

    // Get expenses
    let expenses: any[] = []
    try {
      expenses = await prisma.expense.findMany({
        where: {
          stationId,
          expenseDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    } catch (expenseError) {
      console.error('[Daily Report API] Error fetching expenses:', expenseError)
      // Continue with empty array
    }
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Get deposits
    let deposits: any[] = []
    try {
      deposits = await prisma.deposit.findMany({
        where: {
          stationId,
          depositDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    } catch (depositError) {
      console.error('[Daily Report API] Error fetching deposits:', depositError)
      // Continue with empty array
    }
    const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

    // Get loans given
    let loans: any[] = []
    try {
      loans = await prisma.loanExternal.findMany({
        where: {
          stationId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    } catch (loanError) {
      console.error('[Daily Report API] Error fetching loans:', loanError)
      // Continue with empty array
    }
    const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0)

    // Calculate variance (total sales vs declared)
    const declaredTotal = cashAmount + cardAmount + creditAmount + chequeAmount
    const totalVariance = totalSales - declaredTotal
    const variancePercentage = totalSales > 0 ? (totalVariance / totalSales) * 100 : 0

    // Get missing slips (POS batches without all slips) - placeholder for now
    const missingSlips: any[] = []

    // Calculate metrics
    const shiftCount = shifts.length
    const transactionCount = shifts.reduce((sum, shift) => {
      const declared = (shift.declaredAmounts as any) || {}
      return sum + (declared.transactionCount || shift.assignments.length)
    }, 0)
    const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0

    // Net profit = Sales - Expenses - Deposits - Loans Given (loans are outflows, not income)
    const netProfit = totalSales - totalExpenses - totalDeposits - totalLoans

    const report = {
      date: dateStr,
      stationId,
      stationName: station?.name || 'Unknown Station',
      petrolSales: Math.round(petrolSales),
      dieselSales: Math.round(dieselSales),
      superDieselSales: Math.round(superDieselSales),
      oilSales: Math.round(oilSales),
      canSales: Math.round(canSales),
      totalFuelSales: Math.round(totalFuelSales),
      totalSales: Math.round(totalSales),
      cashAmount: Math.round(cashAmount),
      cardAmount: Math.round(cardAmount),
      creditAmount: Math.round(creditAmount),
      chequeAmount: Math.round(chequeAmount),
      posTerminals,
      totalPOSAmount: Math.round(totalPOSAmount),
      creditCustomers,
      totalCreditSales: Math.round(totalCreditSales),
      cheques: chequeBreakdown,
      totalChequeAmount: Math.round(totalChequeAmount),
      totalExpenses: Math.round(totalExpenses),
      totalDeposits: Math.round(totalDeposits),
      totalLoans: Math.round(totalLoans),
      netProfit: Math.round(netProfit),
      totalVariance: Math.round(totalVariance),
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      missingSlips,
      shiftCount,
      transactionCount,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      cashPercentage: totalSales > 0 ? Math.round((cashAmount / totalSales) * 100 * 100) / 100 : 0,
      cardPercentage: totalSales > 0 ? Math.round((cardAmount / totalSales) * 100 * 100) / 100 : 0,
      creditPercentage: totalSales > 0 ? Math.round((creditAmount / totalSales) * 100 * 100) / 100 : 0,
      chequePercentage: totalSales > 0 ? Math.round((chequeAmount / totalSales) * 100 * 100) / 100 : 0
    }

    console.log('[Daily Report API] Report generated successfully')
    console.log('[Daily Report API] Final report summary:', {
      date: report.date,
      stationName: report.stationName,
      shiftCount: report.shiftCount,
      transactionCount: report.transactionCount,
      totalSales: report.totalSales,
      totalFuelSales: report.totalFuelSales,
      petrolSales: report.petrolSales,
      dieselSales: report.dieselSales,
      cashAmount: report.cashAmount,
      cardAmount: report.cardAmount,
      creditAmount: report.creditAmount,
      totalExpenses: report.totalExpenses,
      totalDeposits: report.totalDeposits,
      netProfit: report.netProfit
    })
    return NextResponse.json(report)
  } catch (error) {
    console.error('[Daily Report API] Error generating comprehensive daily report:', error)
    
    let errorMessage = 'Unknown error'
    let errorDetails = ''
    let errorStack: string | undefined = undefined

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.toString()
      errorStack = error.stack
      console.error('[Daily Report API] Error message:', errorMessage)
      console.error('[Daily Report API] Error details:', errorDetails)
      if (errorStack) {
        console.error('[Daily Report API] Error stack:', errorStack)
      }
    } else if (typeof error === 'string') {
      errorMessage = error
      errorDetails = error
    } else {
      try {
        errorDetails = JSON.stringify(error)
      } catch {
        errorDetails = String(error)
      }
    }

    const errorResponse = {
      error: 'Internal server error',
      message: errorMessage,
      details: errorDetails,
      ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
    }

    console.error('[Daily Report API] Returning error response:', JSON.stringify(errorResponse, null, 2))

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
