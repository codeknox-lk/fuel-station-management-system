import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Get shift with assignments and template
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        template: {
          select: {
            id: true,
            name: true
          }
        },
        assignments: {
          include: {
            nozzle: {
              include: {
                pump: {
                  select: {
                    id: true,
                    pumpNumber: true,
                    isActive: true
                  }
                },
                tank: {
                  select: {
                    id: true,
                    fuelId: true,
                    fuel: true,
                    capacity: true,
                    currentLevel: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Shift already closed' }, { status: 400 })
    }

    // Validate all assignments are closed
    const openAssignments = shift.assignments.filter(a => a.status === 'ACTIVE')
    
    if (openAssignments.length > 0) {
      return NextResponse.json({ 
        error: `Cannot close shift with ${openAssignments.length} open assignments` 
      }, { status: 400 })
    }

    // Calculate shift statistics
    const shiftStart = shift.startTime
    let shiftEnd = body.endTime ? new Date(body.endTime) : new Date()
    
    // Ensure end time is after start time
    if (shiftEnd <= shiftStart) {
      shiftEnd = new Date()
    }
    
    const durationHours = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60))
    
    // Calculate total sales from assignments using current prices
    let totalSales = 0
    let totalLiters = 0
    
    // Group sales by tank for tank level updates
    const salesByTank = new Map<string, number>()
    
    for (const assignment of shift.assignments) {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        // Validate meter readings and handle rollover
        let litersSold: number
        if (assignment.endMeterReading < assignment.startMeterReading) {
          // Check for meter rollover (meter reset from 99999 to 0)
          // If start reading is very high (> 90000) and end reading is very low (< 10000), likely rollover
          const likelyRollover = assignment.startMeterReading > 90000 && assignment.endMeterReading < 10000
          
          if (likelyRollover) {
            // Handle meter rollover: calculate as if meter rolled from max to end reading
            // Assumes meter max is 99999 (adjust if different)
            const METER_MAX = 99999
            litersSold = (METER_MAX - assignment.startMeterReading) + assignment.endMeterReading
            console.log(`Meter rollover detected for assignment ${assignment.id}: ${assignment.startMeterReading} -> ${assignment.endMeterReading}, calculated liters: ${litersSold}`)
          } else {
            console.error(`Invalid meter reading for assignment ${assignment.id}: end (${assignment.endMeterReading}) < start (${assignment.startMeterReading}) - not a rollover`)
            continue // Skip invalid assignments (non-rollover case)
          }
        } else {
          litersSold = assignment.endMeterReading - assignment.startMeterReading
        }
        
        // Validate non-negative liters (should not happen, but safety check)
        if (litersSold < 0) {
          console.error(`Negative liters calculated for assignment ${assignment.id}: ${litersSold}`)
          continue // Skip invalid assignments
        }
        
        totalLiters += litersSold
        
        // Group by tank for tank level updates
        const tankId = assignment.nozzle.tank.id
        if (!salesByTank.has(tankId)) {
          salesByTank.set(tankId, 0)
        }
        salesByTank.set(tankId, salesByTank.get(tankId)! + litersSold)
        
        // Get price effective at shift start time (to match stats calculation)
        const fuelId = assignment.nozzle.tank.fuelId
        const price = await prisma.price.findFirst({
          where: {
            fuelId,
            stationId: shift.stationId,
            effectiveDate: { lte: shift.startTime },
            isActive: true
          },
          orderBy: { effectiveDate: 'desc' }
        })
        
        const pricePerLiter = price ? price.price : 470 // Fallback price
        totalSales += litersSold * pricePerLiter
      }
    }

    // Update shift and tank levels in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the shift with calculated data
      const updatedShift = await tx.shift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          endTime: shiftEnd,
          closedBy: body.closedBy || 'System',
          statistics: {
            durationHours: Math.round(durationHours * 100) / 100,
            totalSales: Math.round(totalSales),
            totalLiters: Math.round(totalLiters * 100) / 100,
            averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
            assignmentCount: shift.assignments.length,
            closedAssignments: shift.assignments.filter(a => a.status === 'CLOSED').length
          },
          declaredAmounts: {
            cash: body.cashAmount || 0,
            card: body.cardAmount || 0,
            credit: body.creditAmount || 0,
            cheque: body.chequeAmount || 0,
            total: (body.cashAmount || 0) + (body.cardAmount || 0) + (body.creditAmount || 0) + (body.chequeAmount || 0),
            pumperBreakdown: body.pumperBreakdown || [] // Store pumper-wise breakdown
          }
        },
        include: {
          assignments: true,
          station: {
            select: {
              id: true,
              name: true
            }
          },
          template: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // Get test pours for this shift that were returned (should add back to tank)
      // Filter by shift ID and also verify timestamp is within shift time period for safety
      const testPours = await tx.testPour.findMany({
        where: {
          shiftId: id,
          returned: true,
          timestamp: {
            gte: shiftStart,
            lte: shiftEnd
          }
        },
        include: {
          nozzle: {
            select: {
              tankId: true
            }
          }
        }
      })

      // Group test returns by tank
      const testReturnsByTank = new Map<string, number>()
      for (const testPour of testPours) {
        const tankId = testPour.nozzle.tankId
        if (tankId) {
          const current = testReturnsByTank.get(tankId) || 0
          testReturnsByTank.set(tankId, current + testPour.amount)
        }
      }

      // Update tank levels: decrement sales but add back test returns
      for (const [tankId, litersSold] of salesByTank) {
        const testReturns = testReturnsByTank.get(tankId) || 0
        const netLitersToDeduct = litersSold - testReturns // Sales minus returns
        
        if (netLitersToDeduct > 0) {
          await tx.tank.update({
            where: { id: tankId },
            data: { currentLevel: { decrement: netLitersToDeduct } }
          })
        } else if (testReturns > litersSold) {
          // More returned than sold (unusual but possible)
          await tx.tank.update({
            where: { id: tankId },
            data: { currentLevel: { increment: testReturns - litersSold } }
          })
        }
        // If netLitersToDeduct === 0, no change needed
      }

      return updatedShift
    })

    // Automatically add cash to safe when closing shift (if cashAmount > 0)
    // Cash from shift sales should automatically be added to safe
    if (body.cashAmount && body.cashAmount > 0) {
      try {
        // Get or create safe
        let safe = await prisma.safe.findUnique({
          where: { stationId: shift.stationId }
        })

        if (!safe) {
          safe = await prisma.safe.create({
            data: {
              stationId: shift.stationId,
              openingBalance: 0,
              currentBalance: 0
            }
          })
        }

        // Calculate balance before transaction chronologically
        // Get all transactions that occurred before or at the shift end time
        const allTransactions = await prisma.safeTransaction.findMany({
          where: { 
            safeId: safe.id,
            timestamp: { lte: shiftEnd }
          },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        // Calculate balance from opening balance up to shift end
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

        const balanceAfter = balanceBefore + body.cashAmount

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'CASH_FUEL_SALES',
            amount: body.cashAmount,
            balanceBefore,
            balanceAfter,
            description: `Cash from ${shift.template?.name || 'shift'} shift (${body.closedBy || 'System'})`,
            performedBy: body.closedBy || 'System',
            timestamp: shiftEnd,
            shiftId: id
          }
        })

        // Update safe balance
        await prisma.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })

        console.log(`✅ Cash amount Rs. ${body.cashAmount} automatically added to safe`)
      } catch (safeError) {
        console.error('Error adding cash to safe during shift close:', safeError)
        // Don't fail the shift close if safe transaction fails
        // Just log it - manager can add manually if needed
      }
    }

    // Note: POS/Credit/Cheques will appear in Safe page for manager review
    // The manager will manually add each type to safe after verification
    // Cash is automatically added if addToSafe flag is set

    // Return shift with calculated statistics
    const shiftWithStats = {
      ...result,
      statistics: {
        durationHours: Math.round(durationHours * 100) / 100,
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        assignmentCount: shift.assignments.length,
        closedAssignments: shift.assignments.filter(a => a.status === 'CLOSED').length
      }
    }

    return NextResponse.json(shiftWithStats)
  } catch (error) {
    console.error('Error closing shift:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
