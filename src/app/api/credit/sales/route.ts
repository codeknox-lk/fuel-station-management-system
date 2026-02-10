import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateCreditSaleSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')

    if (id) {
      // OPTIMIZED: Use select for single sale
      const sale = await prisma.creditSale.findFirst({
        where: {
          id,
          customer: {
            organizationId: user.organizationId
          }
        },
        select: {
          id: true,
          customerId: true,
          shiftId: true,
          nozzleId: true,
          amount: true,
          liters: true,
          price: true,
          slipPhoto: true,
          signedBy: true,
          timestamp: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              currentBalance: true
            }
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true
            }
          }
        }
      })

      if (!sale) {
        return NextResponse.json({ error: 'Credit sale not found' }, { status: 404 })
      }
      return NextResponse.json(sale)
    }

    const where: Prisma.CreditSaleWhereInput = {
      customer: {
        organizationId: user.organizationId
      }
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (shiftId) {
      where.shiftId = shiftId
    }

    // OPTIMIZED: Use select for list query
    const sales = await prisma.creditSale.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        shiftId: true,
        nozzleId: true,
        amount: true,
        liters: true,
        price: true,
        slipPhoto: true,
        signedBy: true,
        timestamp: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching credit sales:', error)
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

    // Zod Validation
    const result = CreateCreditSaleSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { customerId, shiftId, nozzleId, amount, liters, price, slipPhoto, signedBy, timestamp } = result.data

    // Validate Customer belongs to Organization
    const customer = await prisma.creditCustomer.findFirst({
      where: {
        id: customerId,
        organizationId: user.organizationId
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 })
    }

    // Calculate liters if not provided
    const calculatedLiters = liters || (price > 0 ? amount / price : 0)
    const calculatedPrice = price || (calculatedLiters > 0 ? amount / calculatedLiters : 0)

    // Get current user for recordedBy
    const recordedBy = user.username

    // Create credit sale and update customer balance in a transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Create the sale
      const sale = await tx.creditSale.create({
        data: {
          customerId,
          shiftId,
          nozzleId,
          amount,
          liters: calculatedLiters,
          price: calculatedPrice,
          slipPhoto: slipPhoto || null,
          signedBy,
          timestamp: timestamp || new Date(),
          recordedBy
        },
        include: {
          customer: true
        }
      })

      // Update customer balance
      await tx.creditCustomer.update({
        where: { id: customerId },
        data: {
          currentBalance: {
            increment: amount
          }
        }
      })

      return sale
    })

    return NextResponse.json(transactionResult, { status: 201 })
  } catch (error) {
    console.error('Error creating credit sale:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid customer, shift, or nozzle ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

