import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStationContext } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { stationId, searchParams, errorResponse } = await getAuthenticatedStationContext(request)
    if (errorResponse) return errorResponse

    if (!stationId) throw new Error("Station ID missing after auth check")

    const startDate = searchParams!.get('startDate')
    const endDate = searchParams!.get('endDate')

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

    // Get all active credit customers (we'll filter by station through their sales)
    const allCustomers = await prisma.creditCustomer.findMany({
      where: {
        isActive: true
      },
      include: {
        creditSales: {
          include: {
            shift: {
              select: {
                id: true,
                stationId: true,
                startTime: true,
                endTime: true
              }
            }
          }
        },
        creditPayments: {
          orderBy: {
            paymentDate: 'desc'
          }
        }
      }
    })



    // Filter customers by station (those who have sales from this station OR show all if "All Stations")
    const customers = stationId === 'all'
      ? allCustomers
      : allCustomers.filter(customer =>
        customer.creditSales.some(sale => sale.shift.stationId === stationId)
      )



    // Now filter sales and payments by date range
    const customersWithFilteredData = customers.map(customer => ({
      ...customer,
      creditSales: customer.creditSales.filter(sale => {
        const saleDate = new Date(sale.shift.startTime)
        return sale.shift.stationId === stationId &&
          saleDate >= dateStart &&
          saleDate <= dateEnd
      }),
      creditPayments: customer.creditPayments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate)
        return paymentDate >= dateStart && paymentDate <= dateEnd
      })
    }))

    // Calculate statistics
    let totalCreditSales = 0
    let totalPayments = 0
    let totalOutstanding = 0
    let overdueCustomers = 0

    const customerDetails = customersWithFilteredData.map(customer => {
      const salesInPeriod = customer.creditSales.reduce((sum, sale) => sum + sale.amount, 0)
      const paymentsInPeriod = customer.creditPayments.reduce((sum, payment) => sum + payment.amount, 0)

      totalCreditSales += salesInPeriod
      totalPayments += paymentsInPeriod
      totalOutstanding += customer.currentBalance

      // Calculate days since last payment
      const lastPayment = customer.creditPayments[0]
      const daysSinceLastPayment = lastPayment
        ? Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Check if overdue (no payment in 30+ days and has balance)
      const isOverdue = customer.currentBalance > 0 && (!daysSinceLastPayment || daysSinceLastPayment > 30)
      if (isOverdue) overdueCustomers++

      // Aging analysis
      let agingCategory = 'Current'
      if (customer.currentBalance > 0) {
        if (!daysSinceLastPayment) {
          agingCategory = '90+ days'
        } else if (daysSinceLastPayment > 90) {
          agingCategory = '90+ days'
        } else if (daysSinceLastPayment > 60) {
          agingCategory = '61-90 days'
        } else if (daysSinceLastPayment > 30) {
          agingCategory = '31-60 days'
        } else {
          agingCategory = '1-30 days'
        }
      }

      return {
        id: customer.id,
        name: customer.name,
        company: customer.company || 'N/A',
        phoneNumber: customer.phone,
        address: customer.address,
        currentBalance: customer.currentBalance,
        creditLimit: customer.creditLimit,
        salesInPeriod,
        paymentsInPeriod,
        transactionCount: customer.creditSales.length,
        paymentCount: customer.creditPayments.length,
        lastPaymentDate: lastPayment?.paymentDate || null,
        daysSinceLastPayment,
        isOverdue,
        agingCategory,
        utilizationPercent: customer.creditLimit > 0
          ? (customer.currentBalance / customer.creditLimit) * 100
          : 0
      }
    })

    // Sort by current balance (highest first)
    customerDetails.sort((a, b) => b.currentBalance - a.currentBalance)

    // Aging breakdown
    const agingBreakdown = {
      'Current': { count: 0, amount: 0 },
      '1-30 days': { count: 0, amount: 0 },
      '31-60 days': { count: 0, amount: 0 },
      '61-90 days': { count: 0, amount: 0 },
      '90+ days': { count: 0, amount: 0 }
    }

    customerDetails.forEach(customer => {
      if (customer.currentBalance > 0) {
        agingBreakdown[customer.agingCategory as keyof typeof agingBreakdown].count++
        agingBreakdown[customer.agingCategory as keyof typeof agingBreakdown].amount += customer.currentBalance
      }
    })

    // Daily sales and payments
    const dailyMap = new Map<string, { date: string, sales: number, payments: number }>()

    // Initialize all days in range
    const currentDate = new Date(dateStart)
    while (currentDate <= dateEnd) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
      dailyMap.set(dateKey, { date: dateKey, sales: 0, payments: 0 })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Fill in sales
    customersWithFilteredData.forEach(customer => {
      customer.creditSales.forEach(sale => {
        const saleDate = new Date(sale.shift.startTime)
        const dateKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`
        if (dailyMap.has(dateKey)) {
          dailyMap.get(dateKey)!.sales += sale.amount
        }
      })

      customer.creditPayments.forEach(payment => {
        const paymentDate = new Date(payment.paymentDate)
        const dateKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate()).padStart(2, '0')}`
        if (dailyMap.has(dateKey)) {
          dailyMap.get(dateKey)!.payments += payment.amount
        }
      })
    })

    const dailyBreakdown = Array.from(dailyMap.values())



    return NextResponse.json({
      summary: {
        totalCustomers: customerDetails.length,
        activeCustomers: customerDetails.filter(c => c.currentBalance > 0).length,
        totalOutstanding: Math.round(totalOutstanding),
        totalCreditSales: Math.round(totalCreditSales),
        totalPayments: Math.round(totalPayments),
        overdueCustomers,
        averageBalance: customers.length > 0 ? Math.round(totalOutstanding / customers.length) : 0
      },
      customerDetails,
      agingBreakdown,
      dailyBreakdown,
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      }
    })
  } catch (error) {
    console.error('[Credit Summary] ERROR:', error)
    console.error('[Credit Summary] Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Failed to fetch credit customer report',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
