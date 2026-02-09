import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { BulkCloseShiftSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod Validation
    const result = BulkCloseShiftSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { closedBy, stationId } = result.data

    // Find all active shifts
    const whereClause: Prisma.ShiftWhereInput = { status: 'OPEN' }
    if (stationId) {
      whereClause.stationId = stationId
    }

    const activeShifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        assignments: {
          include: {
            nozzle: {
              include: {
                pump: true,
                tank: true
              }
            }
          }
        },
        shopAssignment: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        template: true,
        station: true
      }
    })

    if (activeShifts.length === 0) {
      return NextResponse.json({
        message: 'No active shifts found',
        closed: 0
      })
    }

    const results = []
    const errors = []
    const now = new Date()

    // Close each shift
    for (const shift of activeShifts) {
      try {
        // First, close all open assignments for this shift
        const openAssignments = shift.assignments.filter(a => a.status === 'ACTIVE')

        if (openAssignments.length > 0) {
          // Close all open assignments - set end reading to start reading if not already set
          for (const assignment of openAssignments) {
            await prisma.shiftAssignment.update({
              where: { id: assignment.id },
              data: {
                status: 'CLOSED',
                endMeterReading: assignment.endMeterReading || assignment.startMeterReading
              }
            })
          }
        }

        // Calculate shift statistics
        const shiftStart = shift.startTime
        const shiftEnd = now
        const durationHours = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60))

        // Calculate total sales from assignments
        let totalSales = 0
        let totalLiters = 0
        const salesByTank = new Map<string, number>()

        for (const assignment of shift.assignments) {
          if (assignment.endMeterReading && assignment.startMeterReading) {
            if (assignment.endMeterReading < assignment.startMeterReading) {
              continue // Skip invalid assignments
            }

            const litersSold = assignment.endMeterReading - assignment.startMeterReading
            if (litersSold < 0) {
              continue // Skip invalid assignments
            }

            totalLiters += litersSold

            const tankId = assignment.nozzle.tank.id
            if (!salesByTank.has(tankId)) {
              salesByTank.set(tankId, 0)
            }
            salesByTank.set(tankId, salesByTank.get(tankId)! + litersSold)

            // Get price effective at shift start time
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

            const pricePerLiter = price ? price.price : 470
            totalSales += litersSold * pricePerLiter
          }
        }

        // Calculate shop sales if applicable
        let shopSalesTotal = 0
        if (shift.shopAssignment) {
          shift.shopAssignment.items.forEach(item => {
            const sold = (item.closingStock !== null)
              ? Math.max(0, (item.openingStock + item.addedStock) - item.closingStock)
              : 0
            shopSalesTotal += (sold * item.product.sellingPrice)
          })
        }

        totalSales += shopSalesTotal

        // Update shift and tank levels in a transaction
        await prisma.$transaction(async (tx) => {
          // Get test pours for this shift that were returned (should add back to tank)
          const testPours = await tx.testPour.findMany({
            where: {
              shiftId: shift.id,
              returned: true
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

          // Update the shift
          await tx.shift.update({
            where: { id: shift.id },
            data: {
              status: 'CLOSED',
              endTime: shiftEnd,
              closedBy: closedBy || 'System',
              statistics: {
                durationHours: Math.round(durationHours * 100) / 100,
                totalSales: Math.round(totalSales),
                totalLiters: Math.round(totalLiters * 100) / 100,
                averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
                assignmentCount: shift.assignments.length + (shift.shopAssignment ? 1 : 0),
                closedAssignments: shift.assignments.length + (shift.shopAssignment ? 1 : 0)
              },
              declaredAmounts: {
                cash: 0,
                card: 0,
                credit: 0,
                cheque: 0,
                shopRevenue: Math.round(shopSalesTotal),
                total: 0,
                pumperBreakdown: []
              }
            }
          })

          // Update Shop Assignment if applicable
          if (shift.shopAssignment) {
            await tx.shopAssignment.update({
              where: { id: shift.shopAssignment.id },
              data: {
                status: 'CLOSED',
                totalRevenue: Math.round(shopSalesTotal),
                items: {
                  updateMany: shift.shopAssignment.items
                    .filter(item => item.closingStock === null)
                    .map(item => ({
                      where: { id: item.id },
                      data: {
                        closingStock: item.openingStock + item.addedStock,
                        soldQuantity: 0,
                        revenue: 0
                      }
                    }))
                }
              }
            })
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
        })

        results.push({
          shiftId: shift.id,
          shiftName: shift.template?.name || 'Shift',
          stationName: shift.station?.name || 'Unknown Station',
          success: true
        })
      } catch (error) {
        console.error(`Error closing shift ${shift.id}:`, error)
        errors.push({
          shiftId: shift.id,
          shiftName: shift.template?.name || 'Shift',
          stationName: shift.station?.name || 'Unknown Station',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Closed ${results.length} shift(s) successfully`,
      closed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error in bulk close shifts:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

