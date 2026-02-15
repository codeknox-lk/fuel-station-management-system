import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { BulkCloseShiftSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = BulkCloseShiftSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { closedBy, stationId } = result.data

    // Find all active shifts for this organization
    const whereClause: Prisma.ShiftWhereInput = {
      status: 'OPEN',
      organizationId: user.organizationId
    }

    if (stationId) {
      whereClause.stationId = stationId
    }

    const activeShifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        assignments: {
          where: { organizationId: user.organizationId },
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
          where: { organizationId: user.organizationId },
          include: {
            items: {
              where: { organizationId: user.organizationId },
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

    // Process each shift
    for (const shift of activeShifts) {
      try {
        const openAssignments = shift.assignments.filter(a => a.status === 'ACTIVE')

        // Calculate sales data
        let totalSales = 0
        let totalLiters = 0
        const salesByTank = new Map<string, number>()

        for (const assignment of shift.assignments) {
          const endReading = assignment.endMeterReading || assignment.startMeterReading
          const litersSold = Math.max(0, endReading - assignment.startMeterReading)

          totalLiters += litersSold
          const tankId = assignment.nozzle.tank.id
          salesByTank.set(tankId, (salesByTank.get(tankId) || 0) + litersSold)

          const fuelId = assignment.nozzle.tank.fuelId
          const price = await prisma.price.findFirst({
            where: {
              fuelId,
              stationId: shift.stationId,
              organizationId: user.organizationId,
              effectiveDate: { lte: shift.startTime },
              isActive: true
            },
            orderBy: { effectiveDate: 'desc' }
          })

          const pricePerLiter = price ? price.price : 0
          totalSales += litersSold * pricePerLiter
        }

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

        // Database transaction for shift closure
        await prisma.$transaction(async (tx) => {
          // Close all open assignments
          if (openAssignments.length > 0) {
            await tx.shiftAssignment.updateMany({
              where: {
                id: { in: openAssignments.map(a => a.id) },
                organizationId: user.organizationId
              },
              data: {
                status: 'CLOSED',
                endMeterReading: { set: undefined } // This is tricky in updateMany, but the loop below or a raw query would be cleaner. 
                // However, the original code did a loop. Let's do a loop for safety to handle specific end readings.
              }
            })

            // Refined closure loop inside tx
            for (const assignment of openAssignments) {
              await tx.shiftAssignment.update({
                where: { id_organizationId: { id: assignment.id, organizationId: user.organizationId } },
                data: {
                  status: 'CLOSED',
                  endMeterReading: assignment.endMeterReading || assignment.startMeterReading
                }
              })
            }
          }

          const testPours = await tx.testPour.findMany({
            where: {
              shiftId: shift.id,
              returned: true,
              organizationId: user.organizationId
            },
            include: { nozzle: { select: { tankId: true } } }
          })

          const testReturnsByTank = new Map<string, number>()
          for (const testPour of testPours) {
            const tankId = testPour.nozzle.tankId
            if (tankId) {
              testReturnsByTank.set(tankId, (testReturnsByTank.get(tankId) || 0) + testPour.amount)
            }
          }

          // Update shift
          await tx.shift.update({
            where: { id_organizationId: { id: shift.id, organizationId: user.organizationId } },
            data: {
              status: 'CLOSED',
              endTime: now,
              closedBy: closedBy || 'System',
              statistics: {
                durationHours: Math.round(Math.max(0, (now.getTime() - shift.startTime.getTime()) / (3600000)) * 100) / 100,
                totalSales: Math.round(totalSales),
                totalLiters: Math.round(totalLiters * 100) / 100,
                averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
                assignmentCount: shift.assignments.length + (shift.shopAssignment ? 1 : 0),
                closedAssignments: shift.assignments.length + (shift.shopAssignment ? 1 : 0)
              },
              declaredAmounts: {
                cash: 0, card: 0, credit: 0, cheque: 0,
                shopRevenue: Math.round(shopSalesTotal),
                total: 0, pumperBreakdown: []
              }
            }
          })

          if (shift.shopAssignment) {
            await tx.shopAssignment.update({
              where: { id_organizationId: { id: shift.shopAssignment.id, organizationId: user.organizationId } },
              data: {
                status: 'CLOSED',
                totalRevenue: Math.round(shopSalesTotal),
                items: {
                  updateMany: shift.shopAssignment.items
                    .filter(item => item.closingStock === null)
                    .map(item => ({
                      where: { id: item.id, organizationId: user.organizationId },
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

          for (const [tankId, litersSold] of salesByTank) {
            const testReturns = testReturnsByTank.get(tankId) || 0
            const netDeduct = litersSold - testReturns
            if (netDeduct !== 0) {
              await tx.tank.update({
                where: { id_organizationId: { id: tankId, organizationId: user.organizationId } },
                data: { currentLevel: { decrement: netDeduct } }
              })
            }
          }
        })

        results.push({
          shiftId: shift.id,
          shiftName: shift.template?.name || 'Shift',
          stationName: shift.station?.name || 'Unknown',
          success: true
        })
      } catch (error) {
        console.error(`Error closing shift ${shift.id}:`, error)
        errors.push({
          shiftId: shift.id,
          shiftName: shift.template?.name || 'Shift',
          error: error instanceof Error ? error.message : 'Unknown'
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
