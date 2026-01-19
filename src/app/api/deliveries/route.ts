import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      const delivery = await prisma.delivery.findUnique({
        where: { id },
        include: {
          tank: {
            select: {
              id: true,
              tankNumber: true,
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
    if (status) {
      where.verificationStatus = status
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
            tankNumber: true,
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

    // Calculate variances
    const deliveriesWithVariance = deliveries.map(d => ({
      ...d,
      invoiceVariance: d.invoiceQuantity && d.quantity 
        ? d.quantity - d.invoiceQuantity 
        : null,
      dipVariance: d.actualReceived && d.invoiceQuantity
        ? d.actualReceived - d.invoiceQuantity
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
    
    const { 
      stationId, 
      tankId, 
      invoiceQuantity, 
      supplier, 
      deliveryDate, 
      receivedBy, 
      invoiceNumber, 
      notes,
      beforeDipReading,
      beforeDipTime,
      fuelSoldDuring,
      beforeMeterReadings
    } = body
    
    console.log('[API] 🔍 Validation check:', {
      stationId: !!stationId,
      tankId: !!tankId,
      invoiceQuantity: !!invoiceQuantity,
      supplier: !!supplier,
      receivedBy: !!receivedBy,
      beforeDipReading: !!beforeDipReading
    })
    
    if (!stationId || !tankId || !invoiceQuantity || !supplier || !receivedBy) {
      console.log('[API] ❌ Validation failed - missing required fields')
      return NextResponse.json(
        { error: 'Station ID, tank ID, invoice quantity, supplier, and received by are required' },
        { status: 400 }
      )
    }

    const deliveryDateObj = deliveryDate ? new Date(deliveryDate) : new Date()

    // Check tank exists
    const tank = await prisma.tank.findUnique({
      where: { id: tankId },
      select: { capacity: true, currentLevel: true, tankNumber: true }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found' },
        { status: 404 }
      )
    }

    // Validate: Ensure quantity is positive
    if (parseFloat(invoiceQuantity) <= 0) {
      return NextResponse.json(
        { error: 'Invoice quantity must be greater than zero' },
        { status: 400 }
      )
    }

    // Validate: Check if tank level would exceed capacity (based on invoice)
    const estimatedNewLevel = tank.currentLevel + parseFloat(invoiceQuantity)
    if (estimatedNewLevel > tank.capacity * 1.05) { // Allow 5% tolerance
      const availableSpace = tank.capacity - tank.currentLevel
      return NextResponse.json(
        { 
          error: 'Delivery may exceed tank capacity',
          details: `Tank capacity: ${tank.capacity.toLocaleString()}L, Current: ${tank.currentLevel.toLocaleString()}L, Invoice: ${parseFloat(invoiceQuantity).toLocaleString()}L. Available space: ${availableSpace.toFixed(1)}L`
        },
        { status: 400 }
      )
    }

    // Create delivery record with PENDING_VERIFICATION status
    // Don't update tank level yet - wait for after dip verification
    const newDelivery = await prisma.delivery.create({
      data: {
        stationId,
        tankId,
        quantity: parseFloat(invoiceQuantity), // Temporary, will be updated after verification
        invoiceQuantity: parseFloat(invoiceQuantity),
        supplier,
        deliveryDate: deliveryDateObj,
        receivedBy,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
        beforeDipReading: beforeDipReading ? parseFloat(beforeDipReading) : null,
        beforeDipTime: beforeDipTime ? new Date(beforeDipTime) : null,
        fuelSoldDuring: fuelSoldDuring ? parseFloat(fuelSoldDuring) : null,
        beforeMeterReadings: beforeMeterReadings || null,
        verificationStatus: 'PENDING_VERIFICATION'
      },
      include: {
        tank: {
          select: {
            id: true,
            tankNumber: true,
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

    console.log('[API] ✅ Delivery created (pending verification):', newDelivery.id)
    return NextResponse.json(newDelivery, { status: 201 })
  } catch (error) {
    console.error('[API] ❌ Error creating delivery:', error)
    console.error('[API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or tank ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
