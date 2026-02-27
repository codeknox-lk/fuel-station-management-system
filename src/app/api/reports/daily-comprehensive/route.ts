import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Define explicit types for complex Prisma inclusions
type ShiftWithAssignments = Prisma.ShiftGetPayload<{
  include: {
    assignments: {
      include: {
        nozzle: {
          include: {
            pump: true,
            tank: {
              include: {
                fuel: true
              }
            }
          }
        }
      }
    },
    shopAssignment: {
      include: {
        items: {
          include: { product: true }
        }
      }
    }
  }
}>

type ShopSaleWithShift = Prisma.ShopSaleGetPayload<{
  include: {
    assignment: {
      select: {
        shift: {
          select: {
            startTime: true,
            endTime: true
          }
        }
      }
    }
  }
}>

type PosBatchWithTerminals = Prisma.PosBatchGetPayload<{
  include: {
    terminalEntries: {
      include: {
        terminal: {
          include: {
            bank: true,
            amexBank: true
          }
        }
      }
    }
  }
}>

type CreditSaleWithCustomer = Prisma.CreditSaleGetPayload<{
  include: {
    customer: true,
    shift: true
  }
}>

type CreditPaymentWithCustomer = Prisma.CreditPaymentGetPayload<{
  include: {
    customer: {
      include: {
        creditSales: true
      }
    }
  }
}>

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

    // Get shifts for the day
    let shifts: ShiftWithAssignments[] = []
    try {
      const allShiftsRaw = await prisma.shift.findMany({
        where: {
          stationId,
          status: 'CLOSED',
          OR: [
            {
              endTime: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            {
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
          },
          shopAssignment: {
            include: {
              items: {
                include: { product: true }
              }
            }
          }
        }
      })

      const allShifts = allShiftsRaw as ShiftWithAssignments[]

      // Filter assignments in JavaScript to only include closed ones with end meter reading
      shifts = allShifts.map((shift) => ({
        ...shift,
        assignments: shift.assignments.filter(
          (assignment) => assignment.status === 'CLOSED' && assignment.endMeterReading !== null && assignment.endMeterReading !== undefined
        )
      }))



    } catch (shiftsError) {
      console.error('[Daily Report API] Error fetching shifts:', shiftsError)
      const message = shiftsError instanceof Error ? shiftsError.message : String(shiftsError)
      return NextResponse.json({ error: 'Error fetching shifts', message }, { status: 500 })
    }

    // Get all shop sales for the day to calculate COGS
    let shopSalesData: ShopSaleWithShift[] = []
    try {
      shopSalesData = await prisma.shopSale.findMany({
        where: {
          assignment: {
            shift: {
              stationId,
              endTime: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          }
        },
        include: {
          assignment: {
            select: {
              shift: {
                select: {
                  startTime: true,
                  endTime: true
                }
              }
            }
          }
        }
      }) as ShopSaleWithShift[]
    } catch (e) {
      console.error('[Daily Report API] Error fetching shop sales:', e)
    }

    // Get all shop wastage for the day
    let shopWastageData: Prisma.ShopWastageGetPayload<{ include: { product: true } }>[] = []
    try {
      shopWastageData = await prisma.shopWastage.findMany({
        where: {
          product: {
            stationId
          },
          timestamp: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          product: true
        }
      })
    } catch (e) {
      console.error('[Daily Report API] Error fetching shop wastage:', e)
    }

    const shopRevenue = shopSalesData.reduce((sum: number, s) => sum + s.totalAmount, 0)
    const shopCOGS = shopSalesData.reduce((sum: number, s) => sum + (s.costPrice * s.quantity), 0)
    const shopWastageLoss = shopWastageData.reduce((sum: number, w) => sum + (w.costPrice * w.quantity), 0)

    // Calculate sales by fuel type
    const salesByFuelType = new Map<string, number>()
    let totalSales = 0



    for (const shift of shifts) {
      if (!shift.assignments || !Array.isArray(shift.assignments)) {

        continue
      }

      for (const assignment of shift.assignments) {
        if (assignment.endMeterReading === null || assignment.startMeterReading === null ||
          assignment.endMeterReading === undefined || assignment.startMeterReading === undefined) {
          continue
        }

        if (!assignment.nozzle || !assignment.nozzle.tank) {
          continue
        }

        // Handle meter rollover
        let litersSold = assignment.endMeterReading - assignment.startMeterReading
        if (litersSold < 0) {
          const METER_MAX = 99999
          if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
            litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
          } else {
            continue
          }
        }

        if (litersSold <= 0) continue

        const fuelId = assignment.nozzle.tank.fuelId
        const fuelType = assignment.nozzle.tank.fuel?.code
        if (!fuelType) continue

        try {
          const price = await prisma.price.findFirst({
            where: {
              fuelId,
              stationId,
              effectiveDate: { lte: shift.endTime || shift.startTime },
              isActive: true
            },
            orderBy: { effectiveDate: 'desc' }
          })

          const pricePerLiter = price ? price.price : 0
          const salesAmount = litersSold * pricePerLiter

          const current = salesByFuelType.get(fuelType) || 0
          salesByFuelType.set(fuelType, current + salesAmount)
          totalSales += salesAmount
        } catch (priceError) {
          console.error(`[Daily Report API] Error fetching price for fuelType ${fuelType}:`, priceError)
        }
      }
    }

    const petrolSales = salesByFuelType.get('PETROL_92') || salesByFuelType.get('PETROL_95') || 0
    const dieselSales = salesByFuelType.get('DIESEL') || 0
    const superDieselSales = salesByFuelType.get('SUPER_DIESEL') || 0
    const oilSales = salesByFuelType.get('OIL') || 0
    const totalFuelSales = petrolSales + dieselSales + superDieselSales

    // Calculate Shop Sales from Assignments (Inventory Method)
    const shopSalesMap = new Map<string, {
      productId: string
      productName: string
      quantity: number
      revenue: number
    }>()

    for (const shift of shifts) {
      if (shift.shopAssignment?.items) {
        for (const item of shift.shopAssignment.items) {
          // If closing stock is not set, assume 0 sold? Or assume all sold? 
          // Usually closingStock is required. If null, maybe 0 sold or handled elsewhere.
          // In shift close, existing logic: closing = stock[id] ?? (opening+added). Sold = (opening+added) - closing.
          // If closingStock is null in DB, it implies not closed? But specific shift query filters for status='CLOSED' (line 138),
          // though checking assignments status... shift status should be enough.

          // Let's use the same logic as Shift Closure:
          // closingStock is nullable in DB.
          const open = item.openingStock + item.addedStock
          const close = item.closingStock

          if (close !== null && close !== undefined) {
            const sold = Math.max(0, open - close)
            const revenue = sold * item.product.sellingPrice

            if (sold > 0) {
              const key = item.productId
              const existing = shopSalesMap.get(key)
              if (existing) {
                existing.quantity += sold
                existing.revenue += revenue
              } else {
                shopSalesMap.set(key, {
                  productId: item.productId,
                  productName: item.product.name,
                  quantity: sold,
                  revenue: revenue
                })
              }
            }
          }
        }
      }
    }
    const shopSalesBreakdown = Array.from(shopSalesMap.values()).sort((a, b) => b.revenue - a.revenue)
    const shopSalesFromInventory = shopSalesBreakdown.reduce((sum, i) => sum + i.revenue, 0)

    // Use Inventory Sales if > 0, otherwise fallback to Transaction Sales (ShopSale table)
    const shopSales = shopSalesFromInventory > 0 ? shopSalesFromInventory : shopRevenue

    totalSales += shopSales

    // Tender breakdown
    let cashAmount = 0
    let cardAmount = 0
    let creditAmount = 0
    let chequeAmount = 0

    interface DeclaredAmounts {
      transactionCount?: number
      cash?: number
      card?: number
      credit?: number
      cheque?: number
    }

    for (const shift of shifts) {
      const declared = (shift.declaredAmounts as unknown as DeclaredAmounts) || {}
      cashAmount += declared.cash || 0
      cardAmount += declared.card || 0
      creditAmount += declared.credit || 0
      chequeAmount += declared.cheque || 0
    }

    const shiftIds = shifts.map(s => s.id)

    // POS batches
    let posBatches: PosBatchWithTerminals[] = []
    if (shiftIds.length > 0) {
      try {
        posBatches = (await prisma.posBatch.findMany({
          where: { shiftId: { in: shiftIds } },
          include: {
            terminalEntries: {
              include: {
                terminal: { include: { bank: true, amexBank: true } }
              }
            }
          }
        })) as PosBatchWithTerminals[]
      } catch (posError) {
        console.error('[Daily Report API] Error fetching POS batches:', posError)
      }
    }

    interface PosTerminalSummary {
      terminalId: string
      terminalName: string
      terminalNumber: string
      bankName: string
      totalAmount: number
      transactionCount: number
      visaAmount: number
      mastercardAmount: number
      amexAmount: number
      qrAmount: number
      dialogTouchAmount: number
      missingSlips: number
      missingSlipAmount: number
    }
    const posTerminalsMap = new Map<string, PosTerminalSummary>()
    for (const batch of posBatches) {
      if (!batch.terminalEntries) continue
      for (const entry of batch.terminalEntries) {
        if (!entry.terminal) continue
        const terminalId = entry.terminal.id
        if (!posTerminalsMap.has(terminalId)) {
          posTerminalsMap.set(terminalId, {
            terminalId: entry.terminal.id,
            terminalName: entry.terminal.name || `Terminal ${entry.terminal.terminalNumber || 'Unknown'}`,
            terminalNumber: entry.terminal.terminalNumber || 'Unknown',
            bankName: (entry.terminal.amexBankId && entry.terminal.amexBankId !== entry.terminal.bankId)
              ? `${entry.terminal.bank?.name || 'Unknown Bank'} (Amex: ${entry.terminal.amexBank?.name || 'Unknown'})`
              : (entry.terminal.bank?.name || 'Unknown Bank'),
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
      }
    }
    const posTerminals = Array.from(posTerminalsMap.values())
    const totalPOSAmount = posTerminals.reduce((sum, t) => sum + t.totalAmount, 0)

    // Credit sales
    let creditSales: CreditSaleWithCustomer[] = []
    if (shiftIds.length > 0) {
      try {
        creditSales = (await prisma.creditSale.findMany({
          where: { shiftId: { in: shiftIds } },
          include: { customer: true, shift: true }
        })) as CreditSaleWithCustomer[]
      } catch (creditError) {
        console.error('[Daily Report API] Error fetching credit sales:', creditError)
      }
    }

    interface CreditCustomerSummary {
      customerId: string
      customerName: string
      totalSales: number
      transactionCount: number
      creditLimit: number
      currentBalance: number
      paymentReceived: number
      averageTransaction: number
    }
    const creditCustomersMap = new Map<string, CreditCustomerSummary>()
    for (const sale of creditSales) {
      if (!sale.customer) continue
      const customerId = sale.customerId
      if (!creditCustomersMap.has(customerId)) {
        creditCustomersMap.set(customerId, {
          customerId: sale.customer.id,
          customerName: sale.customer.name,
          totalSales: 0,
          transactionCount: 0,
          creditLimit: sale.customer.creditLimit || 0,
          currentBalance: sale.customer.currentBalance || 0,
          paymentReceived: 0,
          averageTransaction: 0
        })
      }
      const customer = creditCustomersMap.get(customerId)!
      customer.totalSales += sale.amount
      customer.transactionCount += 1
    }

    // Credit payments
    let creditPayments: CreditPaymentWithCustomer[] = []
    try {
      creditPayments = (await prisma.creditPayment.findMany({
        where: { paymentDate: { gte: startOfDay, lte: endOfDay } },
        include: {
          customer: {
            include: {
              creditSales: {
                where: { shiftId: { in: shiftIds.length > 0 ? shiftIds : ["none"] } },
                take: 1
              }
            }
          }
        }
      })) as CreditPaymentWithCustomer[]
    } catch (creditPaymentError) {
      console.error('[Daily Report API] Error fetching credit payments:', creditPaymentError)
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

    // Cheques
    let cheques: Prisma.ChequeGetPayload<{ include: { bank: true } }>[] = []
    try {
      cheques = await prisma.cheque.findMany({
        where: { stationId, receivedDate: { gte: startOfDay, lte: endOfDay } },
        include: { bank: true }
      })
    } catch (chequeError) {
      console.error('[Daily Report API] Error fetching cheques:', chequeError)
    }

    const chequeBreakdown = cheques.map(cheque => ({
      chequeId: cheque.id,
      chequeNumber: cheque.chequeNumber || `CHQ-${cheque.id.slice(0, 6)}`,
      amount: cheque.amount,
      receivedFrom: cheque.receivedFrom || 'Unknown',
      bankName: cheque.bank?.name || 'Unknown Bank',
      bankBranch: cheque.bank?.branch || 'Unknown',
      receivedDate: cheque.receivedDate?.toISOString().split('T')[0] || dateStr,
      status: cheque.status
    }))
    const totalChequeAmount = chequeBreakdown.reduce((sum, c) => sum + c.amount, 0)

    // Expenses, Deposits, Loans
    const expenses = await prisma.expense.findMany({ where: { stationId, expenseDate: { gte: startOfDay, lte: endOfDay } } })
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) + shopCOGS + shopWastageLoss
    const deposits = await prisma.deposit.findMany({ where: { stationId, depositDate: { gte: startOfDay, lte: endOfDay } } })
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0)
    const loans = await prisma.loanExternal.findMany({ where: { stationId, createdAt: { gte: startOfDay, lte: endOfDay } } })
    const totalLoans = loans.reduce((sum, l) => sum + l.amount, 0)

    const declaredTotal = cashAmount + cardAmount + creditAmount + chequeAmount
    const totalVariance = totalSales - declaredTotal
    const variancePercentage = totalSales > 0 ? (totalVariance / totalSales) * 100 : 0
    const missingSlips: { id: string; terminalName: string; amount: number }[] = []

    const shiftCount = shifts.length
    const transactionCount = shifts.reduce((sum, shift) => {
      const declared = (shift.declaredAmounts as unknown as DeclaredAmounts) || {}
      return sum + (declared.transactionCount || shift.assignments.length)
    }, 0)
    const averageTransaction = transactionCount > 0 ? totalSales / transactionCount : 0
    const netProfit = totalSales - totalExpenses - totalDeposits - totalLoans

    const report = {
      date: dateStr,
      stationId,
      stationName: station?.name || 'Unknown Station',
      petrolSales: Math.round(petrolSales),
      dieselSales: Math.round(dieselSales),
      superDieselSales: Math.round(superDieselSales),
      oilSales: Math.round(oilSales),
      totalFuelSales: Math.round(totalFuelSales),
      shopSales: Math.round(shopSales),
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
      chequePercentage: totalSales > 0 ? Math.round((chequeAmount / totalSales) * 100 * 100) / 100 : 0,
      shopSalesBreakdown
    }


    return NextResponse.json(report)
  } catch (error) {
    console.error('[Daily Report API] Error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
