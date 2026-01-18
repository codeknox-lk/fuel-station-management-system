import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')

    if (id) {
      const sale = await prisma.creditSale.findUnique({
        where: { id },
        include: {
          customer: true,
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

    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }
    if (shiftId) {
      where.shiftId = shiftId
    }

    const sales = await prisma.creditSale.findMany({
      where,
      include: {
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
    const body = await request.json()
    
    const { customerId, shiftId, nozzleId, amount, liters, price, slipPhoto, signedBy, timestamp } = body
    
    if (!customerId || !shiftId || !nozzleId || !amount || !signedBy) {
      return NextResponse.json(
        { error: 'Customer ID, shift ID, nozzle ID, amount, and signed by are required' },
        { status: 400 }
      )
    }

    // Calculate liters if not provided
    const calculatedLiters = liters || (price > 0 ? amount / price : 0)
    const calculatedPrice = price || (calculatedLiters > 0 ? amount / calculatedLiters : 0)

    // Create credit sale and update customer balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the sale
      const sale = await tx.creditSale.create({
        data: {
          customerId,
          shiftId,
          nozzleId,
          amount: parseFloat(amount),
          liters: calculatedLiters,
          price: calculatedPrice,
          slipPhoto: slipPhoto || null,
          signedBy,
          timestamp: timestamp ? new Date(timestamp) : new Date()
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
            increment: parseFloat(amount)
          }
        }
      })

      return sale
    })

    return NextResponse.json(result, { status: 201 })
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

