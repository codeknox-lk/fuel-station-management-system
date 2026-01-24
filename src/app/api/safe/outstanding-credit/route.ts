import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET: Calculate total outstanding credit for station(s)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')

    // If stationId is provided, get credit from sales for that station's shifts
    if (stationId && stationId !== 'all') {
      // Get all credit sales for this station through shifts
      const creditSales = await prisma.creditSale.findMany({
        where: {
          shift: {
            stationId: stationId
          }
        },
        select: {
          amount: true,
          customerId: true
        }
      })

      // Get all credit payments for customers who bought at this station
      const customerIds = [...new Set(creditSales.map(s => s.customerId))]
      
      if (customerIds.length === 0) {
        return NextResponse.json({
          totalOutstanding: 0,
          count: 0
        })
      }

      const creditPayments = await prisma.creditPayment.findMany({
        where: {
          customerId: {
            in: customerIds
          }
        },
        select: {
          amount: true,
          customerId: true
        }
      })

      // Calculate per customer
      const customerBalances = new Map<string, number>()
      
      // Add sales
      creditSales.forEach(sale => {
        const current = customerBalances.get(sale.customerId) || 0
        customerBalances.set(sale.customerId, current + sale.amount)
      })
      
      // Subtract payments
      creditPayments.forEach(payment => {
        const current = customerBalances.get(payment.customerId) || 0
        customerBalances.set(payment.customerId, current - payment.amount)
      })

      // Sum up outstanding balances (only positive ones)
      const totalOutstanding = Array.from(customerBalances.values())
        .filter(balance => balance > 0)
        .reduce((sum, balance) => sum + balance, 0)

      return NextResponse.json({
        totalOutstanding,
        count: customerBalances.size
      })
    }

    // For all stations or no filter, sum all customer balances
    const customers = await prisma.creditCustomer.findMany({
      where: {
        isActive: true
      },
      select: {
        currentBalance: true
      }
    })

    const totalOutstanding = customers.reduce((sum, customer) => {
      return sum + customer.currentBalance
    }, 0)

    return NextResponse.json({
      totalOutstanding,
      count: customers.length
    })
  } catch (error) {
    console.error('Error calculating outstanding credit:', error)
    return NextResponse.json(
      { error: 'Internal server error', totalOutstanding: 0 },
      { status: 500 }
    )
  }
}
