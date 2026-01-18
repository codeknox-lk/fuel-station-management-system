import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')

    if (id) {
      const delivery = await prisma.delivery.findUnique({
        where: { id },
        include: {
          tank: {
            select: {
              id: true,
              fuelType: true,
              capacity: true,
              currentLevel: true
            }
          },
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!delivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
      }
      return NextResponse.json(delivery)
    }

    const where: any = {}
    if (tankId) {
      where.tankId = tankId
    }
    if (startDate && endDate) {
      where.deliveryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        tank: {
          select: {
            id: true,
            fuelType: true,
            capacity: true,
            currentLevel: true
          }
        },
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { deliveryDate: 'desc' }
    })

    // Calculate variance (measured - invoice)
    const deliveriesWithVariance = deliveries.map(d => ({
      ...d,
      variance: d.invoiceQuantity && d.quantity 
        ? d.quantity - d.invoiceQuantity 
        : null
    }))

    return NextResponse.json(deliveriesWithVariance)
  } catch (error) {
    console.error('Error fetching deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API] 📦 Delivery request body:', JSON.stringify(body, null, 2))
    
    // Support both 'quantity' and 'measuredQuantity' fields from frontend
    const { stationId, tankId, quantity, measuredQuantity, invoiceQuantity, supplier, deliveryDate, receivedBy, invoiceNumber, notes, deliveryTime } = body
    
    // Use measuredQuantity if provided, otherwise quantity
    const actualQuantity = measuredQuantity || quantity
    
    console.log('[API] 🔍 Validation check:', {
      stationId: !!stationId,
      tankId: !!tankId,
      actualQuantity: !!actualQuantity,
      supplier: !!supplier,
      receivedBy: !!receivedBy
    })
    
    if (!stationId || !tankId || !actualQuantity || !supplier || !receivedBy) {
      console.log('[API] ❌ Validation failed - missing required fields')
      return NextResponse.json(
        { error: 'Station ID, tank ID, quantity, supplier, and received by are required' },
        { status: 400 }
      )
    }

    // Use deliveryDate or deliveryTime, default to now if neither provided
    const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : (deliveryTime ? new Date(deliveryTime) : new Date())

    // Check tank capacity before adding delivery
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      select: { capacity: true, currentLevel: true }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found' },
        { status: 404 }
      )
    }

    // Validate: Ensure quantity is positive
    if (parseFloat(actualQuantity) <= 0) {
      return NextResponse.json(
        { error: 'Delivery quantity must be greater than zero' },
        { status: 400 }
      )
    }

    // Validate: Check if tank level would exceed capacity
    const newLevel = tank.currentLevel + parseFloat(actualQuantity)
    if (newLevel > tank.capacity) {
      const availableSpace = tank.capacity - tank.currentLevel
      return NextResponse.json(
        { 
          error: 'Delivery exceeds tank capacity',
          details: `Tank capacity: ${tank.capacity.toLocaleString()}L, Current: ${tank.currentLevel.toLocaleString()}L, Attempted: ${parseFloat(actualQuantity).toLocaleString()}L. Maximum delivery allowed: ${availableSpace.toFixed(1)}L`
        },
        { status: 400 }
      )
    }

    // Validate: Warn if current tank level is negative (data inconsistency)
    if (tank.currentLevel < 0) {
      console.warn(`⚠️ Tank ${tankId} has negative current level: ${tank.currentLevel}L. This indicates a data inconsistency.`)
    }

    // Create delivery and update tank level in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the delivery record
      const newDelivery = await tx.delivery.create({
        data: {
          stationId,
          tankId,
          quantity: parseFloat(actualQuantity),
          invoiceQuantity: invoiceQuantity ? parseFloat(invoiceQuantity) : null,
          supplier,
          deliveryDate: deliveryDateObj,
          receivedBy,
          invoiceNumber: invoiceNumber || null,
          notes: notes || null
        },
        include: {
          tank: {
            select: {
              id: true,
              fuelType: true,
              capacity: true,
              currentLevel: true
            }
          },
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Update tank level by incrementing with delivery quantity
      await tx.tank.update({
        where: { id: tankId },
        data: { 
          currentLevel: { increment: parseFloat(actualQuantity) } 
        }
      })

      return newDelivery
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating delivery:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or tank ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

