import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateCreditPaymentSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const id = searchParams.get('id')

    if (id) {
      const payment = await prisma.creditPayment.findFirst({
        where: {
          id,
          customer: {
            organizationId: user.organizationId
          }
        },
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

    const where: Prisma.CreditPaymentWhereInput = {
      customer: {
        organizationId: user.organizationId
      }
    }
    if (customerId) where.customerId = customerId

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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Credit payment request body:', body)

    // Zod Validation
    const result = CreateCreditPaymentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      customerId,
      amount,
      paymentType,
      referenceNumber,
      chequeNumber,
      bankId,
      paymentDate,
      stationId
    } = result.data

    const validatedAmount = amount

    // Get current user for receivedBy (overriding client input for security)
    const secureReceivedBy = user.username

    // Get customer and verify ownership
    const customer = await prisma.creditCustomer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (customer.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Access denied to this customer' }, { status: 403 })
    }

    // Verify Bank if provided
    if (bankId) {
      const bank = await prisma.bank.findFirst({
        where: {
          id: bankId,
          organizationId: user.organizationId
        }
      })
      if (!bank) {
        return NextResponse.json({ error: 'Bank not found or access denied' }, { status: 404 })
      }
    }

    // Verify Station if provided
    if (stationId) {
      const station = await prisma.station.findFirst({
        where: {
          id: stationId,
          organizationId: user.organizationId
        }
      })
      if (!station) {
        return NextResponse.json({ error: 'Station not found or access denied' }, { status: 404 })
      }
    }

    // Create payment, update customer balance, and create safe transaction in a single transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      let paymentStatus: 'PENDING' | 'CLEARED' | 'BOUNCED' = 'CLEARED'
      if (paymentType === 'CHEQUE') {
        paymentStatus = 'PENDING'
      }

      // Create the payment
      const payment = await tx.creditPayment.create({
        data: {
          customerId,
          amount: validatedAmount,
          paymentType,
          referenceNumber: referenceNumber || null,
          chequeNumber: chequeNumber || null,
          bankId: bankId || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          receivedBy: secureReceivedBy,
          status: paymentStatus
        },
        include: {
          customer: true,
          bank: true
        }
      })

      // Handle specific logic based on payment type
      if (paymentType === 'CHEQUE') {
        if (!stationId) {
          throw new Error('Station ID is required for cheque payments')
        }
        if (!chequeNumber) {
          throw new Error('Cheque number is required')
        }

        // Create Cheque record
        await tx.cheque.create({
          data: {
            stationId: stationId,
            chequeNumber: chequeNumber,
            amount: validatedAmount,
            // If bankId is provided, use it. If not, we need a fallback.
            // Assuming UI provides bankId or we use a fallback if absolutely necessary, 
            // but strict schema compliance is better.
            bankId: bankId!,
            receivedFrom: customer.name,
            receivedDate: paymentDate ? new Date(paymentDate) : new Date(),
            chequeDate: result.data.chequeDate ? new Date(result.data.chequeDate) : new Date(),
            status: 'PENDING',
            creditPaymentId: payment.id,
            recordedBy: secureReceivedBy
          }
        })

        // Cheque payments do NOT reduce balance immediately
        console.log(`Cheque payment recorded. Status: PENDING. Balance NOT updated for customer ${customerId}`)

      } else {
        // NON-CHEQUE (Cash/Bank Transfer): Reduce balance immediately
        await tx.creditCustomer.update({
          where: { id: customerId },
          data: {
            currentBalance: {
              decrement: validatedAmount
            }
          }
        })

        // Create safe transaction for CASH payments only
        if (stationId && paymentType === 'CASH') {
          console.log('Creating safe transaction for CASH payment, stationId:', stationId)

          // Get or create safe matching the station
          // Note: Safe should ideally be linked to org, but via station implies it.
          // We already verified station belongs to org.
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

          const balanceAfter = balanceBefore + validatedAmount

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
              amount: validatedAmount,
              balanceBefore,
              balanceAfter,
              description: `Credit payment from ${customer.name} - ${paymentType}${bankName}`,
              performedBy: secureReceivedBy,
              timestamp: paymentDate ? new Date(paymentDate) : new Date(),
            }
          })

          // Update safe balance
          await tx.safe.update({
            where: { id: safe.id },
            data: { currentBalance: balanceAfter }
          })
        }
      }

      return payment
    })

    return NextResponse.json(transactionResult, { status: 201 })
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

