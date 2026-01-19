import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { 
      afterDipReading,
      afterDipTime,
      additionalFuelSold,
      verifiedBy,
      notes
    } = body
    
    if (!afterDipReading || !verifiedBy) {
      return NextResponse.json(
        { error: 'After dip reading and verified by are required' },
        { status: 400 }
      )
    }

    // Get delivery with tank info
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        tank: {
          select: {
            id: true,
            tankNumber: true,
            currentLevel: true,
            capacity: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    if (delivery.verificationStatus === 'VERIFIED') {
      return NextResponse.json({ error: 'Delivery already verified' }, { status: 400 })
    }

    if (!delivery.beforeDipReading) {
      return NextResponse.json(
        { error: 'Before dip reading is required for verification' },
        { status: 400 }
      )
    }

    // Calculate actual quantity received
    // IMPORTANT: Only add fuel sold DURING delivery (additionalFuelSold)
    // Do NOT add fuelSoldDuring - it's already reflected in beforeDipReading!
    const actualReceived = parseFloat(afterDipReading) - delivery.beforeDipReading + (additionalFuelSold || 0)
    
    // Track total fuel sold for record keeping
    const totalFuelSold = (delivery.fuelSoldDuring || 0) + (additionalFuelSold || 0)

    // Determine verification status based on variance
    const invoiceVariance = actualReceived - (delivery.invoiceQuantity || 0)
    const variancePercentage = delivery.invoiceQuantity 
      ? Math.abs(invoiceVariance) / delivery.invoiceQuantity * 100 
      : 0
    
    let verificationStatus: 'VERIFIED' | 'DISCREPANCY'
    if (variancePercentage <= 0.5) {
      verificationStatus = 'VERIFIED' // Within 0.5% tolerance
    } else {
      verificationStatus = 'DISCREPANCY'
    }

    // Validate tank won't exceed capacity
    if (parseFloat(afterDipReading) > delivery.tank.capacity) {
      return NextResponse.json(
        { 
          error: 'After dip reading exceeds tank capacity',
          details: `Tank capacity: ${delivery.tank.capacity.toLocaleString()}L, After dip: ${parseFloat(afterDipReading).toLocaleString()}L`
        },
        { status: 400 }
      )
    }

    // Update delivery and tank level in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update delivery record
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          afterDipReading: parseFloat(afterDipReading),
          afterDipTime: afterDipTime ? new Date(afterDipTime) : new Date(),
          fuelSoldDuring: totalFuelSold,
          actualReceived,
          quantity: actualReceived, // Update quantity to actual received
          verificationStatus,
          verifiedBy,
          verifiedAt: new Date(),
          notes: notes ? `${delivery.notes || ''}\n\nVerification: ${notes}`.trim() : delivery.notes
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

      // Update tank level to absolute after dip reading
      // This is the TRUTH - use absolute value, not increment
      await tx.tank.update({
        where: { id: delivery.tankId },
        data: { 
          currentLevel: parseFloat(afterDipReading)
        }
      })

      return updatedDelivery
    })

    console.log(`[API] ✅ Delivery ${id} verified: ${actualReceived.toFixed(1)}L received (Invoice: ${delivery.invoiceQuantity}L, Variance: ${invoiceVariance > 0 ? '+' : ''}${invoiceVariance.toFixed(1)}L)`)

    return NextResponse.json({
      ...result,
      invoiceVariance,
      variancePercentage,
      message: verificationStatus === 'VERIFIED' 
        ? 'Delivery verified successfully' 
        : 'Delivery verified with discrepancy - please review'
    })
  } catch (error) {
    console.error('Error verifying delivery:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
