
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateDailyProfit } from '@/lib/calc'

import { getAuthenticatedStationContext } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { stationId, searchParams, errorResponse } = await getAuthenticatedStationContext(request)
    if (errorResponse) return errorResponse

    if (!stationId) throw new Error("Station ID missing after auth check")

    const dateStr = searchParams!.get('date') || new Date().toISOString().split('T')[0]
    const date = new Date(dateStr)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Get shifts for the day - get shifts that ENDED on this day for accurate reporting
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED', // Only include closed shifts
        endTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        assignments: {
          include: {
            nozzle: {
              include: {
                tank: true
              }
            }
          }
        }
      }
    })

    // Calculate sales from shift assignments (only closed assignments)
    let totalCashIn = 0
    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        // Only include closed assignments with valid meter readings
        if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
          // Handle meter rollover
          let litersSold = assignment.endMeterReading - assignment.startMeterReading
          if (litersSold < 0) {
            const METER_MAX = 99999
            if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
              litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
            } else {
              continue // Skip invalid readings (not a rollover)
            }
          }

          if (litersSold <= 0) continue

          const fuelId = assignment.nozzle.tank.fuelId

          const price = await prisma.price.findFirst({
            where: {
              fuelId,
              stationId,
              effectiveDate: { lte: shift.endTime || new Date() },
              isActive: true
            },
            orderBy: { effectiveDate: 'desc' }
          })

          const pricePerLiter = price ? price.price : 0
          totalCashIn += litersSold * pricePerLiter
        }
      }
    }

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        stationId,
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Get loans given on the day
    const loansGiven = await prisma.loanExternal.findMany({
      where: {
        stationId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
    const totalLoansGiven = loansGiven.reduce((sum, loan) => sum + loan.amount, 0)

    // Get credit repayments for the day
    const creditRepayments = await prisma.creditPayment.findMany({
      where: {
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        customer: {
          creditSales: {
            some: {
              shift: {
                stationId
              }
            }
          }
        }
      }
    })
    const totalCreditRepayments = creditRepayments.reduce((sum, payment) => sum + payment.amount, 0)

    // Get cheques encashed for the day
    const cheques = await prisma.cheque.findMany({
      where: {
        stationId,
        clearedDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: 'CLEARED'
      }
    })
    const totalChequeEncashed = cheques.reduce((sum, cheque) => sum + cheque.amount, 0)

    // Get deposits for the day
    const deposits = await prisma.deposit.findMany({
      where: {
        stationId,
        depositDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
    const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

    // Get credit customers with outstanding balances
    const creditCustomers = await prisma.creditCustomer.findMany({
      where: {
        isActive: true,
        currentBalance: { gt: 0 },
        creditSales: {
          some: {
            shift: {
              stationId
            }
          }
        }
      },
      include: {
        creditSales: {
          take: 5,
          orderBy: { timestamp: 'desc' }
        },
        creditPayments: {
          take: 5,
          orderBy: { paymentDate: 'desc' }
        }
      }
    })

    // Calculate daily profit
    const dailyProfit = calculateDailyProfit(
      totalCashIn,
      totalExpenses,
      totalLoansGiven,
      totalCreditRepayments,
      totalChequeEncashed,
      totalDeposits
    )

    // Get tank variances (calculate from deliveries and assignments)
    const tanks = await prisma.tank.findMany({
      where: { stationId },
      include: {
        fuel: true,
        deliveries: {
          where: {
            deliveryDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      }
    })

    const tankVariances = tanks.map(tank => {
      const deliveries = tank.deliveries.reduce((sum, del) => sum + del.quantity, 0)
      // Variance calculation would need more complex logic based on actual usage
      return {
        tankId: tank.id,
        fuelName: tank.fuel?.name || 'Unknown',
        capacity: tank.capacity,
        currentLevel: tank.currentLevel,
        deliveries: deliveries,
        currentVariance: 0 // Placeholder - needs more complex calculation
      }
    })

    const safeSummary = {
      totalCashIn,
      totalExpenses,
      totalLoansGiven,
      totalCreditRepayments,
      totalChequeEncashed,
      totalDeposits,
      netCash: totalCashIn - totalExpenses - totalDeposits
    }

    const report = {
      date: dateStr,
      stationId,
      safe: safeSummary,
      credit: {
        aging: creditCustomers.map(c => ({
          id: c.id,
          name: c.name,
          currentBalance: c.currentBalance,
          creditLimit: c.creditLimit
        })),
        totalOutstanding: creditCustomers.reduce((sum, customer) => sum + customer.currentBalance, 0)
      },
      tanks: {
        variances: tankVariances,
        totalVariance: tankVariances.reduce((sum, tank) => sum + tank.currentVariance, 0)
      },
      profit: {
        daily: dailyProfit,
        sales: totalCashIn,
        expenses: totalExpenses,
        netMargin: totalCashIn > 0 ? (dailyProfit.toNumber() / totalCashIn) * 100 : 0
      }
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating daily report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

