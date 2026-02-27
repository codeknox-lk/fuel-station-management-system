import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
// POST - Generate notifications based on system events
// This endpoint checks for various conditions and creates notifications
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const generatedNotifications: string[] = []
    const errors: string[] = []

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const organizationId = user.organizationId

    // 1. Check for low tank levels (< 30%)
    try {
      const tanks = await prisma.tank.findMany({
        where: {
          ...(stationId ? { stationId } : {}),
          isActive: true
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              tankWarningThreshold: true,
              tankCriticalThreshold: true
            }
          },
          fuel: true
        }
      })

      for (const tank of tanks) {
        const fillPercentage = (tank.currentLevel / tank.capacity) * 100
        const warningThreshold = tank.station.tankWarningThreshold ?? 20
        const criticalThreshold = tank.station.tankCriticalThreshold ?? 10

        if (fillPercentage < warningThreshold) {
          const isCritical = fillPercentage < criticalThreshold

          // Check if notification already exists (within last 24 hours)
          const existingNotification = await prisma.notification.findFirst({
            where: {
              stationId: tank.stationId,
              category: 'TANK',
              type: isCritical ? 'ERROR' : 'WARNING',
              message: {
                contains: `Tank ${tank.tankNumber || tank.id}`
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          })

          if (!existingNotification) {
            const notification = await prisma.notification.create({
              data: {
                organizationId,
                stationId: tank.stationId,
                title: isCritical
                  ? 'Critical: Low Tank Level'
                  : 'Low Tank Level Warning',
                message: `Tank ${tank.tankNumber || 'Unknown'} (${tank.fuel?.name || 'Unknown'}) is at ${fillPercentage.toFixed(1)}% capacity - refill needed ${isCritical ? 'urgently' : 'soon'}`,
                type: isCritical ? 'ERROR' : 'WARNING',
                priority: isCritical ? 'CRITICAL' : fillPercentage < (warningThreshold + criticalThreshold) / 2 ? 'HIGH' : 'MEDIUM',
                category: 'TANK',
                actionUrl: `/tanks`,
                metadata: {
                  tankId: tank.id,
                  tankNumber: tank.tankNumber,
                  fuelName: tank.fuel?.name || 'Unknown',
                  fillPercentage: fillPercentage.toFixed(1)
                }
              }
            })
            generatedNotifications.push(notification.id)
          }
        }
      }
    } catch (error) {
      console.error('Error checking tank levels:', error)
      errors.push('Failed to check tank levels')
    }

    // 2. Check for overdue credit payments (> 7 days)
    try {
      // First get credit sales for the station
      const creditSalesForStation = stationId
        ? await prisma.creditSale.findMany({
          where: {
            shift: {
              stationId: stationId
            }
          },
          select: {
            customerId: true
          },
          distinct: ['customerId']
        })
        : await prisma.creditSale.findMany({
          select: {
            customerId: true
          },
          distinct: ['customerId']
        })

      const customerIds = creditSalesForStation.map(s => s.customerId)

      // Only query customers if we have credit sales
      const creditCustomers = customerIds.length > 0 ? await prisma.creditCustomer.findMany({
        where: {
          isActive: true,
          currentBalance: { gt: 0 },
          id: { in: customerIds }
        },
        include: {
          creditSales: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            include: {
              shift: {
                select: {
                  stationId: true,
                  station: {
                    select: {
                      creditOverdueDays: true
                    }
                  }
                }
              }
            }
          }
        }
      }) : []

      for (const customer of creditCustomers) {
        if (customer.creditSales.length > 0) {
          const lastSale = customer.creditSales[0]
          const daysSinceLastSale = Math.floor(
            (Date.now() - new Date(lastSale.timestamp).getTime()) / (1000 * 60 * 60 * 24)
          )

          const overdueLimit = lastSale.shift?.station?.creditOverdueDays ?? 14

          if (daysSinceLastSale > overdueLimit && customer.currentBalance > 0) {
            // Check if notification already exists (within last 7 days)
            const existingNotification = await prisma.notification.findFirst({
              where: {
                category: 'CREDIT',
                type: 'ERROR',
                message: {
                  contains: customer.name
                },
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
              }
            })

            if (!existingNotification) {
              const notification = await prisma.notification.create({
                data: {
                  organizationId,
                  stationId: lastSale.shift?.stationId || null,
                  title: 'Credit Payment Overdue',
                  message: `${customer.name} payment is ${daysSinceLastSale} days overdue (Limit: ${overdueLimit} days. Rs. ${(customer.currentBalance || 0).toLocaleString()})`,
                  type: 'ERROR',
                  priority: daysSinceLastSale > (overdueLimit + 14) ? 'CRITICAL' : 'HIGH',
                  category: 'CREDIT',
                  actionUrl: `/credit/customers`,
                  metadata: {
                    customerId: customer.id,
                    customerName: customer.name,
                    overdueAmount: customer.currentBalance,
                    daysOverdue: daysSinceLastSale
                  }
                }
              })
              generatedNotifications.push(notification.id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking credit payments:', error)
      errors.push('Failed to check credit payments')
    }

    // 3. Check for high shift variances (> 1%)
    try {
      const recentShifts = await prisma.shift.findMany({
        where: {
          status: 'CLOSED',
          endTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          ...(stationId ? { stationId } : {})
        },
        include: {
          station: {
            select: {
              id: true,
              name: true,
              allowedShiftVariance: true,
              salesTolerance: true
            }
          }
        },
        take: 50
      })

      for (const shift of recentShifts) {
        const statistics = shift.statistics as { variancePercentage?: number; variance?: number } | null
        if (statistics && statistics.variancePercentage) {
          const variancePercentage = Math.abs(statistics.variancePercentage)
          const varianceAmount = Math.abs(statistics.variance || 0)

          const percentLimit = shift.station?.allowedShiftVariance ?? 1.5
          const amountLimit = shift.station?.salesTolerance ?? 20 // Added safety check with amount as per new rule

          if (variancePercentage > percentLimit && varianceAmount > amountLimit) {
            // Check if notification already exists for this shift
            const existingNotification = await prisma.notification.findFirst({
              where: {
                stationId: shift.stationId,
                category: 'SHIFT',
                message: {
                  contains: shift.id.substring(0, 8) // Use part of shift ID to match
                },
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            })

            if (!existingNotification) {
              const isCritical = variancePercentage > percentLimit + 1.0
              const isHigh = variancePercentage > percentLimit + 0.5

              const notification = await prisma.notification.create({
                data: {
                  organizationId,
                  stationId: shift.stationId,
                  title: 'Shift Variance Alert',
                  message: `Shift closed with ${variancePercentage.toFixed(2)}% variance (Rs. ${varianceAmount.toLocaleString()}) - ${isCritical ? 'requires immediate review' : 'needs review'}`,
                  type: isCritical ? 'ERROR' : 'WARNING',
                  priority: isCritical ? 'CRITICAL' : isHigh ? 'HIGH' : 'MEDIUM',
                  category: 'SHIFT',
                  actionUrl: `/shifts/${shift.id}`,
                  metadata: {
                    shiftId: shift.id,
                    variance: statistics.variance,
                    variancePercentage: variancePercentage.toFixed(2)
                  }
                }
              })
              generatedNotifications.push(notification.id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking shift variances:', error)
      errors.push('Failed to check shift variances')
    }

    // 4. Check for shifts exceeding max Shift Duration
    try {
      const overlyLongOpenShifts = await prisma.shift.findMany({
        where: {
          status: 'OPEN',
          ...(stationId ? { stationId } : {})
        },
        include: {
          station: {
            select: { id: true, name: true, maxShiftDurationHours: true }
          }
        }
      })

      for (const shift of overlyLongOpenShifts) {
        const hoursOpen = (Date.now() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60)
        const maxAllowed = shift.station?.maxShiftDurationHours ?? 24

        if (hoursOpen >= maxAllowed) {
          // Check if we already notified about this exact shift being too long
          const existingNotification = await prisma.notification.findFirst({
            where: {
              stationId: shift.stationId,
              category: 'SHIFT',
              message: { contains: 'exceeded maximum allowed duration' },
              metadata: { path: ['shiftId'], equals: shift.id },
            }
          })

          if (!existingNotification) {
            const notification = await prisma.notification.create({
              data: {
                organizationId,
                stationId: shift.stationId,
                title: 'Shift Duration Exceeded',
                message: `Shift opened on ${new Date(shift.startTime).toLocaleDateString()} has exceeded maximum allowed duration of ${maxAllowed} hours. Please close it.`,
                type: 'WARNING',
                priority: 'HIGH',
                category: 'SHIFT',
                actionUrl: `/shifts/${shift.id}`,
                metadata: {
                  shiftId: shift.id,
                  hoursOpen: hoursOpen.toFixed(1),
                  maxAllowed
                }
              }
            })
            generatedNotifications.push(notification.id)
          }
        }
      }
    } catch (error) {
      console.error('Error checking long shifts:', error)
      errors.push('Failed to check long shifts')
    }



    return NextResponse.json({
      success: true,
      generated: generatedNotifications.length,
      notificationIds: generatedNotifications,
      ...(errors.length > 0 && { warnings: errors })
    })
  } catch (error) {
    console.error('Error generating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to generate notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

