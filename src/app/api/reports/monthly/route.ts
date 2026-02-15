import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStationContext } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { stationId, searchParams, errorResponse } = await getAuthenticatedStationContext(request)
    if (errorResponse) return errorResponse

    if (!stationId) throw new Error("Station ID missing after auth check")

    const month = searchParams!.get('month') || new Date().toISOString().substring(0, 7) // YYYY-MM

    // Parse month and get business month date range (7th to 6th)
    const [year, monthNum] = month.split('-').map(Number)
    const startOfMonth = new Date(year, monthNum - 1, 7, 0, 0, 0, 0)
    const endOfMonth = new Date(year, monthNum, 6, 23, 59, 59, 999)

    // Get all CLOSED shifts for the month
    // Use endTime to capture shifts that ended in this month (even if started previous month)
    const shifts = await prisma.shift.findMany({
      where: {
        stationId,
        status: 'CLOSED', // Only include closed shifts for accurate reporting
        endTime: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        assignments: {
          where: {
            status: 'CLOSED',
            endMeterReading: { not: null }
          },
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

    // Calculate total sales
    let totalSales = 0
    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        // Only process closed assignments with valid meter readings
        if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
          let litersSold = assignment.endMeterReading - assignment.startMeterReading
          // Handle meter rollover
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
          if (!fuelId) continue

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
          totalSales += litersSold * pricePerLiter
        }
      }
    }

    // Get expenses for the month
    const expenses = await prisma.expense.findMany({
      where: {
        stationId,
        expenseDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const totalProfit = totalSales - totalExpenses
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

    // Get deposits for the month
    const deposits = await prisma.deposit.findMany({
      where: {
        stationId,
        depositDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })
    const totalDeposits = deposits.reduce((sum, deposit) => sum + deposit.amount, 0)

    // Get loans given in the month
    const loansGiven = await prisma.loanExternal.findMany({
      where: {
        stationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })
    const totalLoansGiven = loansGiven.reduce((sum, loan) => sum + loan.amount, 0)

    // Get loans repaid (pumper loans)
    const loansRepaid = await prisma.loanPumper.findMany({
      where: {
        stationId,
        status: 'PAID',
        updatedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })
    const totalLoansRepaid = loansRepaid.reduce((sum, loan) => sum + loan.amount, 0)

    // Get credit sales for the month
    const creditSales = await prisma.creditSale.findMany({
      where: {
        shift: {
          stationId,
          startTime: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }
    })
    const totalCreditSales = creditSales.reduce((sum, sale) => sum + sale.amount, 0)

    // Get credit repayments for the month
    const creditRepayments = await prisma.creditPayment.findMany({
      where: {
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth
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

    // Get cheques received and encashed
    const chequesReceived = await prisma.cheque.findMany({
      where: {
        stationId,
        receivedDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })
    const totalChequeReceived = chequesReceived.reduce((sum, cheque) => sum + cheque.amount, 0)

    const chequesEncashed = chequesReceived.filter(c => c.status === 'CLEARED' && c.clearedDate && c.clearedDate >= startOfMonth && c.clearedDate <= endOfMonth)
    const totalChequeEncashed = chequesEncashed.reduce((sum, cheque) => sum + cheque.amount, 0)

    // Get credit aging
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
      }
    })
    const totalOutstanding = creditCustomers.reduce((sum, customer) => sum + customer.currentBalance, 0)
    const overdueAmount = totalOutstanding * 0.25 // Placeholder - would need payment terms to calculate

    // Calculate trends by day using real data (business month: 7th to 6th)
    const salesByDay = []
    let currentDate = new Date(startOfMonth)

    while (currentDate <= endOfMonth) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      // Filter shifts that ended on this day (use endTime for accurate day assignment)
      const dayShifts = shifts.filter(s => {
        const shiftEndDate = s.endTime ? new Date(s.endTime) : new Date(s.startTime)
        return shiftEndDate.getDate() === currentDate.getDate() &&
          shiftEndDate.getMonth() === currentDate.getMonth() &&
          shiftEndDate.getFullYear() === currentDate.getFullYear()
      })

      let daySales = 0
      for (const shift of dayShifts) {
        for (const assignment of shift.assignments) {
          // Only process closed assignments with valid meter readings
          if (assignment.status === 'CLOSED' && assignment.endMeterReading && assignment.startMeterReading) {
            let litersSold = assignment.endMeterReading - assignment.startMeterReading
            // Handle meter rollover
            if (litersSold < 0) {
              const METER_MAX = 99999
              if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
                litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
              } else {
                continue // Skip invalid readings
              }
            }

            if (litersSold <= 0) continue

            const fuelId = assignment.nozzle?.tank?.fuelId
            if (!fuelId) continue

            // Get actual price for this fuel type effective at shift end time (when shift closed)
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
            daySales += litersSold * pricePerLiter
          }
        }
      }

      const dayExpenses = expenses
        .filter(e => {
          const expDate = new Date(e.expenseDate)
          return expDate.getDate() === currentDate.getDate() &&
            expDate.getMonth() === currentDate.getMonth() &&
            expDate.getFullYear() === currentDate.getFullYear()
        })
        .reduce((sum, exp) => sum + exp.amount, 0)

      salesByDay.push({
        date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
        sales: Math.round(daySales),
        profit: Math.round(daySales - dayExpenses)
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    const profitTrend = salesByDay.map(day => ({
      date: day.date,
      profit: day.profit
    }))

    // Calculate real tank variance trend for each day (business month: 7th to 6th)
    const tankVarianceTrend = []
    currentDate = new Date(startOfMonth)

    while (currentDate <= endOfMonth) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      // Get all tanks for the station
      const stationTanks = await prisma.tank.findMany({
        where: {
          stationId,
          fuel: {
            code: { not: 'OIL' }
          }
        },
        select: { id: true }
      })

      let totalVariance = 0

      // Calculate variance for each tank on this day
      for (const tank of stationTanks) {
        // Get deliveries for this tank on this date
        const deliveries = await prisma.delivery.findMany({
          where: {
            tankId: tank.id,
            deliveryDate: { gte: dayStart, lte: dayEnd }
          }
        })
        const totalDeliveries = deliveries.reduce((sum, d) => sum + d.quantity, 0)

        // Get sales (from shifts closed on this date)
        const dayShifts = await prisma.shift.findMany({
          where: {
            stationId,
            status: 'CLOSED',
            endTime: { gte: dayStart, lte: dayEnd }
          },
          include: {
            assignments: {
              where: {
                status: 'CLOSED',
                endMeterReading: { not: null },
                nozzle: { tankId: tank.id }
              }
            }
          }
        })

        let totalSales = 0
        for (const shift of dayShifts) {
          for (const assignment of shift.assignments) {
            if (assignment.endMeterReading && assignment.startMeterReading) {
              let litersSold = assignment.endMeterReading - assignment.startMeterReading
              if (litersSold < 0) {
                // Handle rollover
                const METER_MAX = 99999
                if (assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000) {
                  litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
                } else {
                  continue
                }
              }
              if (litersSold > 0) totalSales += litersSold
            }
          }
        }

        // Get test pours - separate returned vs not returned
        const testPours = await prisma.testPour.findMany({
          where: {
            timestamp: { gte: dayStart, lte: dayEnd },
            nozzle: { tankId: tank.id }
          }
        })
        let testReturns = 0 // Test pours that were returned (added back to tank)
        let testDiscards = 0 // Test pours that were not returned (deducted from tank)
        for (const test of testPours) {
          if (test.returned) {
            testReturns += test.amount
          } else {
            testDiscards += test.amount
          }
        }

        // Get dip reading for this day (latest dip on or before this day)
        const dip = await prisma.tankDip.findFirst({
          where: {
            tankId: tank.id,
            dipDate: { lte: dayEnd }
          },
          orderBy: { dipDate: 'desc' },
          select: { reading: true, dipDate: true }
        })

        // Estimate opening stock (current level minus today's net changes)
        // Net changes = Deliveries - Sales + Test Returns - Test Discards
        const netTestEffect = testReturns - testDiscards
        const currentTank = await prisma.tank.findUnique({
          where: { id: tank.id },
          select: { currentLevel: true }
        })
        const estimatedOpeningStock = Math.max(0, (currentTank?.currentLevel || 0) - totalDeliveries + totalSales - netTestEffect)
        // Closing Book Stock = Opening + Deliveries - Sales + Test Returns - Test Discards
        const closingBookStock = Math.max(0, estimatedOpeningStock + totalDeliveries - totalSales + testReturns - testDiscards)
        const closingDipStock = dip?.reading || 0

        // Calculate variance for this tank
        const variance = closingBookStock - closingDipStock
        totalVariance += variance
      }

      tankVarianceTrend.push({
        date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
        variance: Math.round(totalVariance * 100) / 100
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Get tank data for variance summary
    const tanks = await prisma.tank.findMany({
      where: { stationId },
      include: {
        deliveries: {
          where: {
            deliveryDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        }
      }
    })
    const deliveryCount = tanks.reduce((sum, tank) => sum + tank.deliveries.length, 0)

    const monthlyData = {
      month,
      stationId,
      summary: {
        totalSales: Math.round(totalSales),
        totalExpenses: Math.round(totalExpenses),
        totalProfit: Math.round(totalProfit),
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalDeposits: Math.round(totalDeposits),
        totalLoansGiven: Math.round(totalLoansGiven),
        totalLoansRepaid: Math.round(totalLoansRepaid),
        totalCreditSales: Math.round(totalCreditSales),
        totalCreditRepayments: Math.round(totalCreditRepayments),
        totalChequeReceived: Math.round(totalChequeReceived),
        totalChequeEncashed: Math.round(totalChequeEncashed)
      },
      trends: {
        salesByDay,
        profitTrend,
        tankVarianceTrend
      },
      credit: {
        aging: creditCustomers.map(c => ({
          id: c.id,
          name: c.name,
          currentBalance: c.currentBalance,
          creditLimit: c.creditLimit
        })),
        totalOutstanding: Math.round(totalOutstanding),
        overdueAmount: Math.round(overdueAmount),
        averageDaysOutstanding: 15 // Placeholder - would need payment terms
      },
      tanks: {
        totalVariance: 0, // Placeholder - needs complex calculation
        variancePercentage: 0,
        lowStockAlerts: tanks.filter(t => t.currentLevel < t.capacity * 0.2).length,
        deliveryCount
      }
    }

    return NextResponse.json(monthlyData)
  } catch (error) {
    console.error('Error generating monthly report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
