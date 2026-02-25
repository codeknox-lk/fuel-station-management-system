import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { VerifyDeliverySchema } from '@/lib/schemas'
import { DeliveryPaymentStatus } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'
import { depthToVolume, TankCapacity } from '@/lib/tank-calibration'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Zod Validation
    const result = VerifyDeliverySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      afterDipReading,
      waterLevelAfter,
      afterDipTime,
      afterMeterReadings,
      additionalFuelSold, // Legacy fallback
      costPrice,
      totalCost,
      paymentStatus,
      paymentType,
      expenseCategory,
      chequeNumber,
      bankId,
      chequeDate,
      verifiedBy,
      notes
    } = result.data

    const currentUser = await getServerUser()
    const userName = currentUser?.username || verifiedBy

    // Get delivery with tank info
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        tank: {
          select: {
            id: true,
            tankNumber: true,
            currentLevel: true,
            capacity: true,
            stationId: true,
            station: {
              select: {
                deliveryToleranceCm: true
              }
            }
          }
        },
        organization: {
          select: { id: true }
        }
      }
    })

    if (!delivery) {
      console.error(`[VERIFY] ❌ Delivery ${id} not found in database`)
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    if (delivery.verificationStatus === 'VERIFIED') {
      console.warn(`[VERIFY] ⚠️ Delivery ${id} already verified`)
      return NextResponse.json({ error: 'Delivery already verified' }, { status: 400 })
    }

    if (delivery.beforeDipReading === null) {
      console.error(`[VERIFY] ❌ Delivery ${id} is missing beforeDipReading. Status: ${delivery.verificationStatus}`)
      console.log(`[VERIFY] 📄 Full Delivery Object for ${id}:`, JSON.stringify(delivery, null, 2))
      return NextResponse.json(
        {
          error: 'Before dip reading is missing. Cannot verify.',
          debug: {
            deliveryId: id,
            status: delivery.verificationStatus,
            hasBeforeDip: delivery.beforeDipReading !== null,
            hasMeters: !!delivery.beforeMeterReadings,
            beforeDipValue: delivery.beforeDipReading
          }
        },
        { status: 400 }
      )
    }

    // --- 1. Calculate Fuel Sold During Drop ---
    let salesDuringDrop = 0

    if (afterMeterReadings && delivery.beforeMeterReadings) {
      // Calculate from Meters (Robust Method)
      const startMeters = delivery.beforeMeterReadings as Record<string, number>
      // Iterate over active nozzles provided in afterMeterReadings
      Object.entries(afterMeterReadings).forEach(([nozzleId, endReading]) => {
        const startReading = startMeters[nozzleId]
        if (typeof startReading === 'number' && typeof endReading === 'number') {
          const sold = endReading - startReading
          if (sold > 0) salesDuringDrop += sold
        }
      })
    } else {
      // Fallback to manual entry if meters missing
      salesDuringDrop = additionalFuelSold || 0
    }

    // --- 2. Calculate Gross Delivered & Variance ---
    // Formula: (VolumeAfter - VolumeBefore) + SalesDuringDrop
    const capacity = delivery.tank.capacity as TankCapacity
    const beforeVolume = depthToVolume(delivery.beforeDipReading, capacity)
    const afterVolume = depthToVolume(afterDipReading, capacity)
    const physicalDifference = afterVolume - beforeVolume
    const actualReceived = physicalDifference + salesDuringDrop

    const invoiceQty = delivery.invoiceQuantity || 0
    const variance = invoiceQty - actualReceived

    // --- 3. Tolerance Logic ---
    // Fetch tolerance in CM from station (default to 2 if missing)
    const stationData = delivery.tank.station
    const toleranceCm = stationData?.deliveryToleranceCm ?? 2

    // Calculate Liter equivalent at the after-dip level
    // We calculate the volume diff between current dip and (current dip - toleranceCm)
    const volAtDip = depthToVolume(afterDipReading, capacity)
    const volAtDipMinusTolerance = depthToVolume(Math.max(0, afterDipReading - toleranceCm), capacity)
    const toleranceLitersUsed = Math.abs(volAtDip - volAtDipMinusTolerance)

    // Status Determination
    // If variance (absolute) is greater than the calculated liter threshold, it's a discrepancy
    let verificationStatus: 'VERIFIED' | 'DISCREPANCY' = 'VERIFIED'
    if (Math.abs(variance) > toleranceLitersUsed) {
      verificationStatus = 'DISCREPANCY'
    }

    // --- 4. Safety Checks ---
    if (afterDipReading > delivery.tank.capacity * 1.05) { // 5% overfill tolerance for sensor error
      return NextResponse.json(
        { error: 'After dip reading exceeds tank capacity significantly' },
        { status: 400 }
      )
    }

    // --- 4. Transaction Execution ---
    const transactionResult = await prisma.$transaction(async (tx) => {

      // A. Create Payment Records (if needed)
      let chequeId: string | null = null

      if (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') {
        if (paymentType === 'CASH') {
          // Check Safe Balance First
          const safe = await tx.safe.findUnique({ where: { stationId: delivery.tank.stationId } })
          if (!safe) {
            throw new Error('Station Safe not found')
          }
          if (safe.currentBalance < (totalCost || 0)) {
            throw new Error(`Insufficient funds in Safe (Balance: ${safe.currentBalance.toLocaleString()})`)
          }

          // Create Expense
          const expense = await tx.expense.create({
            data: {
              stationId: delivery.tank.stationId,
              organizationId: delivery.organization?.id,
              category: expenseCategory || 'Fuel Purchase',
              description: `Fuel Delivery Payment - ${delivery.invoiceNumber || 'No Invoice'}`,
              amount: totalCost || 0,
              fromSafe: true, // Deduct from Safe
              paidBy: userName,
              expenseDate: new Date(),
              recordedBy: userName
            }
          })

          await tx.safeTransaction.create({
            data: {
              safeId: safe.id,
              organizationId: delivery.organization?.id,
              type: 'FUEL_DELIVERY_PAYMENT',
              amount: totalCost || 0,
              balanceBefore: safe.currentBalance,
              balanceAfter: safe.currentBalance - (totalCost || 0),
              expenseId: expense.id,
              description: `Fuel Payment: ${delivery.invoiceNumber}`,
              performedBy: userName,
              timestamp: new Date()
            }
          })
          await tx.safe.update({
            where: { id: safe.id },
            data: { currentBalance: { decrement: totalCost || 0 } }
          })

        } else if (paymentType === 'CHEQUE') {
          // Create Cheque
          const cheque = await tx.cheque.create({
            data: {
              stationId: delivery.tank.stationId,
              organizationId: delivery.organization?.id,
              chequeNumber: chequeNumber || `TEMP-${Date.now()}`, // fallback
              amount: totalCost || 0,
              bankId: bankId!, // validation should ensure this exists if type is Cheque
              receivedFrom: delivery.supplier || 'Supplier',
              receivedDate: new Date(),
              chequeDate: chequeDate || new Date(),
              status: 'PENDING',
              notes: `Issued for Delivery ${delivery.invoiceNumber || ''}`
            }
          })
          chequeId = cheque.id
        }
      }

      // --- C. Supplier Account Integration ---
      const supplierId = result.data.supplierId || delivery.supplierId;
      if (supplierId) {
        // 1. Get current supplier balance
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: { currentBalance: true }
        });

        if (supplier) {
          const balanceBefore = supplier.currentBalance;
          // Debit the full cost of delivery to the supplier account (Purchase)
          const balanceAfterPurchase = balanceBefore + (totalCost || 0);

          // Record PURCHASE transaction
          await tx.supplierTransaction.create({
            data: {
              supplierId,
              type: 'PURCHASE',
              amount: totalCost || 0,
              balanceBefore,
              balanceAfter: balanceAfterPurchase,
              description: `Fuel Purchase: ${delivery.invoiceNumber || 'No Invoice'}`,
              deliveryId: delivery.id,
              organizationId: delivery.organization?.id,
              transactionDate: new Date(),
            }
          });

          // If a payment was made during verification, record it as a SETTLEMENT
          if (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') {
            const paidAmount = totalCost || 0;
            const balanceAfterPayment = balanceAfterPurchase - paidAmount;

            // Record SETTLEMENT transaction
            await tx.supplierTransaction.create({
              data: {
                supplierId,
                type: 'SETTLEMENT',
                amount: paidAmount,
                balanceBefore: balanceAfterPurchase,
                balanceAfter: balanceAfterPayment,
                description: `Settlement for Delivery: ${delivery.invoiceNumber || 'No Invoice'}`,
                deliveryId: delivery.id,
                chequeId: chequeId, // Link if it was a cheque
                organizationId: delivery.organization?.id,
                transactionDate: new Date(),
              }
            });

            // Update supplier with final balance
            await tx.supplier.update({
              where: { id: supplierId },
              data: { currentBalance: balanceAfterPayment }
            });
          } else {
            // Update supplier with purchase balance (debt increases)
            await tx.supplier.update({
              where: { id: supplierId },
              data: { currentBalance: balanceAfterPurchase }
            });
          }
        }
      }

      // B. Update Delivery
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          afterDipReading,
          afterDipTime: afterDipTime ? new Date(afterDipTime) : new Date(),
          waterLevelAfter: waterLevelAfter || 0,
          fuelSoldDuring: salesDuringDrop,
          actualReceived,
          quantity: actualReceived, // Updating to physical quantity
          verificationStatus,
          status: verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'DISCREPANCY', // Sync status
          toleranceCmUsed: toleranceCm,
          toleranceLitersUsed: toleranceLitersUsed,
          verifiedBy: userName,
          verifiedAt: new Date(),
          notes: notes ? `${delivery.notes || ''}\n\nVerification: ${notes}`.trim() : delivery.notes,

          // Financials
          costPrice,
          totalCost,
          paymentStatus: (paymentType === 'CASH' || paymentType === 'CHEQUE')
            ? 'PAID'
            : (paymentStatus as DeliveryPaymentStatus),
          chequeId,
          supplierId: supplierId || undefined
        }
      })

      // C. Update Tank Level
      // CRITICAL FIX: Convert Depth (cm) to Volume (Liters) before updating tank
      const physicalVolume = depthToVolume(afterDipReading, delivery.tank.capacity as TankCapacity)

      await tx.tank.update({
        where: { id: delivery.tankId },
        data: {
          currentLevel: physicalVolume // The physical truth in LITERS
        }
      })

      return updatedDelivery
    })

    console.log(`[API] ✅ Delivery ${id} verified. Variance: ${variance.toFixed(2)}L`)

    return NextResponse.json({
      success: true,
      delivery: transactionResult,
      variance,
      message: verificationStatus === 'VERIFIED' ? 'Verified Successfully' : 'Discrepancy Recorded'
    })

  } catch (error) {
    console.error('Error verifying delivery:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
  }
}
