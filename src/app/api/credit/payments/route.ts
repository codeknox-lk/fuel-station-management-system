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
    console.log('Credit payment request body:', body)
    
    const { customerId, amount, paymentType, referenceNumber, chequeNumber, bankId, paymentDate, receivedBy, stationId } = body
    
    if (!customerId || !amount || !paymentType || !receivedBy) {
      return NextResponse.json(
        { error: 'Customer ID, amount, payment type, and received by are required' },
        { status: 400 }
      )
    }

    // Get customer
    const customer = await prisma.creditCustomer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Create payment, update customer balance, and create safe transaction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment
      const payment = await tx.creditPayment.create({
        data: {
          customerId,
          amount: parseFloat(amount),
          paymentType,
          referenceNumber: referenceNumber || null,
          chequeNumber: chequeNumber || null,
          bankId: bankId || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          receivedBy,
          status: 'CLEARED'
        },
        include: {
          customer: true,
          bank: true
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

      // Create safe transaction for CASH payments only
      if (stationId && paymentType === 'CASH') {
        console.log('Creating safe transaction for CASH payment, stationId:', stationId)
        
        // Get or create safe
        let safe = await tx.safe.findUnique({
          where: { stationId }
        })
        console.log('Safe found/created:', safe ? 'Yes' : 'No')

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
        for (const transaction of allTransactions) {
          if (transaction.type === 'OPENING_BALANCE') {
            balanceBefore = transaction.amount
          } else {
            const txIsIncome = [
              'CASH_FUEL_SALES',
              'POS_CARD_PAYMENT',
              'CREDIT_PAYMENT',
              'CHEQUE_RECEIVED',
              'LOAN_REPAID'
            ].includes(transaction.type)
            balanceBefore += txIsIncome ? transaction.amount : -transaction.amount
          }
        }

        const balanceAfter = balanceBefore + parseFloat(amount)

        // Get bank name if bankId is provided
        let bankName = ''
        if (bankId) {
          const bank = await tx.bank.findUnique({
            where: { id: bankId },
            select: { name: true }
          })
          bankName = bank ? ` - ${bank.name}` : ''
        }

        // Create safe transaction
        await tx.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'CREDIT_PAYMENT',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            description: `Credit payment from ${customer.name} - ${paymentType}${chequeNumber ? ` (Cheque: ${chequeNumber})` : ''}${bankName}`,
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
    
    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: errorMessage 
    }, { status: 500 })
  }
}

