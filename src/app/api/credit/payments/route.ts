import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const id = searchParams.get('id')

    if (id) {
      const payment = await prisma.creditPayment.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          bank: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!payment) {
        return NextResponse.json({ error: 'Credit payment not found' }, { status: 404 })
      }
      return NextResponse.json(payment)
    }

    const where = customerId ? { customerId } : {}
    const payments = await prisma.creditPayment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        bank: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' },
      take: 100
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching credit payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { customerId, amount, paymentType, chequeNumber, bankId, paymentDate, receivedBy } = body
    
    if (!customerId || !amount || !paymentType || !receivedBy) {
      return NextResponse.json(
        { error: 'Customer ID, amount, payment type, and received by are required' },
        { status: 400 }
      )
    }

    // Get customer to find station
    const customer = await prisma.creditCustomer.findUnique({
      where: { id: customerId },
      include: {
        creditSales: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          include: {
            shift: {
              select: {
                stationId: true
              }
            }
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get station ID from customer's most recent credit sale
    // Since credit customers are associated with a station through their sales
    let stationId: string | null = null
    if (customer.creditSales && customer.creditSales.length > 0 && customer.creditSales[0].shift) {
      stationId = customer.creditSales[0].shift.stationId
    }

    // Create payment, update customer balance, and create safe transaction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment
      const payment = await tx.creditPayment.create({
        data: {
          customerId,
          amount: parseFloat(amount),
          paymentType,
          chequeNumber: chequeNumber || null,
          bankId: bankId || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          receivedBy
        },
        include: {
          customer: true,
          bank: bankId ? true : false
        }
      })

      // Update customer balance (decrease)
      await tx.creditCustomer.update({
        where: { id: customerId },
        data: {
          currentBalance: {
            decrement: parseFloat(amount)
          }
        }
      })

      // Create safe transaction if station ID is available
      // Note: If customer has no previous sales, station ID won't be available
      // In that case, safe transaction will be skipped (can be added manually later)
      if (stationId) {
        // Get or create safe
        let safe = await tx.safe.findUnique({
          where: { stationId }
        })

        if (!safe) {
          safe = await tx.safe.create({
            data: {
              stationId,
              openingBalance: 0,
              currentBalance: 0
            }
          })
        }

        // Calculate balance before transaction chronologically
        const paymentTimestamp = paymentDate ? new Date(paymentDate) : new Date()
        const allTransactions = await tx.safeTransaction.findMany({
          where: { 
            safeId: safe.id,
            timestamp: { lte: paymentTimestamp }
          },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        // Calculate balance before transaction chronologically
        // OPENING_BALANCE transactions set the balance, they don't add/subtract
        let balanceBefore = safe.openingBalance
        for (const tx of allTransactions) {
          if (tx.type === 'OPENING_BALANCE') {
            balanceBefore = tx.amount
          } else {
            const txIsIncome = [
              'CASH_FUEL_SALES',
              'POS_CARD_PAYMENT',
              'CREDIT_PAYMENT',
              'CHEQUE_RECEIVED',
              'LOAN_REPAID'
            ].includes(tx.type)
            balanceBefore += txIsIncome ? tx.amount : -tx.amount
          }
        }

        const balanceAfter = balanceBefore + parseFloat(amount)

        // Create safe transaction
        await tx.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'CREDIT_PAYMENT',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            description: `Credit payment from ${customer.name} - ${paymentType}${chequeNumber ? ` (Cheque: ${chequeNumber})` : ''}${payment.bank ? ` - ${payment.bank.name}` : ''}`,
            performedBy: receivedBy,
            timestamp: paymentDate ? new Date(paymentDate) : new Date(),
            // Note: We don't have a direct foreign key, but we can store payment ID in description for traceability
          }
        })

        // Update safe balance
        await tx.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })
      }

      return payment
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating credit payment:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid customer or bank ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

