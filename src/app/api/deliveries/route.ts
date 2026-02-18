import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateDeliverySchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tankId = searchParams.get('tankId')
    const stationId = searchParams.get('stationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      // OPTIMIZED: Use select
      const delivery = await prisma.delivery.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        select: {
          id: true,
          stationId: true,
          tankId: true,
          supplier: true,
          invoiceNumber: true,
          quantity: true,
          actualReceived: true,
          invoiceQuantity: true, // Crucial for verification stage
          beforeDipReading: true,
          afterDipReading: true,
          fuelSoldDuring: true,
          deliveryDate: true,
          verificationStatus: true,
          verifiedBy: true,
          verifiedAt: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          waterLevelBefore: true,
          beforeMeterReadings: true,
          tank: {
            select: {
              id: true,
              tankNumber: true,
              fuelId: true,
              capacity: true,
              currentLevel: true,
              fuel: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  icon: true
                }
              }
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
        return NextResponse.json({ error: 'Delivery not found or access denied' }, { status: 404 })
      }
      return NextResponse.json(delivery)
    }

    const where: Prisma.DeliveryWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (tankId) {
      where.tankId = tankId
    }
    if (status) {
      where.verificationStatus = status as 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISCREPANCY'
    }
    if (startDate && endDate) {
      where.deliveryDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // OPTIMIZED: Use select for list
    const deliveries = await prisma.delivery.findMany({
      where,
      select: {
        id: true,
        stationId: true,
        tankId: true,
        supplier: true,
        invoiceNumber: true,
        invoiceQuantity: true, // Needed for variance calculation
        actualReceived: true,  // Needed for variance calculation
        quantity: true,
        beforeDipReading: true,
        afterDipReading: true,
        fuelSoldDuring: true,
        deliveryDate: true,
        verificationStatus: true,
        verifiedBy: true,
        verifiedAt: true,
        notes: true,
        createdAt: true,
        tank: {
          select: {
            id: true,
            tankNumber: true,
            fuelId: true,
            capacity: true,
            currentLevel: true,
            fuel: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
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
    const currentUser = await getServerUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('[API] 📦 Delivery request body:', JSON.stringify(body, null, 2))

    // Zod Validation for core fields
    const result = CreateDeliverySchema.safeParse(body)

    if (!result.success) {
      console.error('[API] ❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      stationId,
      tankId,
      invoiceQuantity,
      supplier,
      deliveryTime,
      invoiceNumber,
      notes
    } = result.data

    const deliveryDate = deliveryTime || new Date()

    // Extract extra fields not yet in Zod schema
    const {
      beforeDipReading,
      beforeDipTime,
      fuelSoldDuring,
      beforeMeterReadings,
      waterLevelBefore
    } = body

    const deliveryDateObj = deliveryDate // Already Date from Zod

    // Check station belongs to organization
    const station = await prisma.station.findFirst({
      where: { id: stationId, organizationId: currentUser.organizationId }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found or access denied' }, { status: 404 })
    }

    // Check tank exists and belongs to organization
    const tank = await prisma.tank.findFirst({
      where: {
        id: tankId,
        organizationId: currentUser.organizationId
      },
      select: { capacity: true, currentLevel: true, tankNumber: true, fuelId: true }
    })

    if (!tank) {
      return NextResponse.json(
        { error: 'Tank not found or access denied' },
        { status: 404 }
      )
    }

    // Validate: Ensure quantity is not negative
    if (invoiceQuantity < 0) {
      return NextResponse.json(
        { error: 'Invoice quantity cannot be negative' },
        { status: 400 }
      )
    }

    // Ullage check (Available Space)
    const ullage = tank.capacity - tank.currentLevel

    // Safety Risk Block
    if (invoiceQuantity > ullage * 1.02) { // Allow tiny 2% margin for sensor error, but block major overfills
      return NextResponse.json(
        {
          error: 'High Overfill Risk',
          details: `Invoice Quantity (${invoiceQuantity}L) exceeds available Ullage (${ullage.toFixed(1)}L).`
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
        organizationId: currentUser.organizationId,
        quantity: invoiceQuantity, // Temporary, will be updated after verification
        invoiceQuantity: invoiceQuantity,
        supplier: supplier || 'Unknown',
        deliveryDate: deliveryDateObj,
        receivedBy: currentUser?.username || 'System',
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
        beforeDipReading: beforeDipReading !== null && beforeDipReading !== undefined ? parseFloat(String(beforeDipReading)) : null,
        waterLevelBefore: waterLevelBefore !== null && waterLevelBefore !== undefined ? parseFloat(String(waterLevelBefore)) : null,
        beforeDipTime: beforeDipTime ? new Date(String(beforeDipTime)) : null,
        fuelSoldDuring: fuelSoldDuring !== null && fuelSoldDuring !== undefined ? parseFloat(String(fuelSoldDuring)) : null,
        beforeMeterReadings: beforeMeterReadings ? (beforeMeterReadings as Prisma.InputJsonValue) : undefined,
        verificationStatus: 'PENDING_VERIFICATION',
        status: 'PROCESSING' // Set internal status to PROCESSING
      },
      include: {
        tank: {
          select: {
            id: true,
            tankNumber: true,
            fuelId: true,
            fuel: true,
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
