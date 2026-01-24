import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Generate notifications based on system events
// This endpoint checks for various conditions and creates notifications
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const generatedNotifications: string[] = []
    const errors: string[] = []

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
              name: true
            }
          },
          fuel: true
        }
      })

      for (const tank of tanks) {
        const fillPercentage = (tank.currentLevel / tank.capacity) * 100

        if (fillPercentage < 30) {
          // Check if notification model exists
          if (!('notification' in prisma)) {
            errors.push('Prisma client not regenerated - skipping notification generation')
            continue
          }

          // Check if notification already exists (within last 24 hours)
          const prismaWithNotif = prisma as unknown as { notification: { findFirst: (args: unknown) => Promise<any>, create: (args: unknown) => Promise<any> } }
          const existingNotification = await prismaWithNotif.notification.findFirst({
            where: {
              stationId: tank.stationId,
              category: 'TANK',
              type: fillPercentage < 15 ? 'ERROR' : 'WARNING',
              message: {
                contains: `Tank ${tank.tankNumber || tank.id}`
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          })

          if (!existingNotification) {
            const notification = await prismaWithNotif.notification.create({
              data: {
                stationId: tank.stationId,
                title: fillPercentage < 15
                  ? 'Critical: Low Tank Level'
                  : 'Low Tank Level Warning',
                message: `Tank ${tank.tankNumber || 'Unknown'} (${tank.fuel?.name || 'Unknown'}) is at ${fillPercentage.toFixed(1)}% capacity - refill needed ${fillPercentage < 15 ? 'urgently' : 'soon'}`,
                type: fillPercentage < 15 ? 'ERROR' : 'WARNING',
                priority: fillPercentage < 15 ? 'CRITICAL' : fillPercentage < 20 ? 'HIGH' : 'MEDIUM',
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
                  stationId: true
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

          if (daysSinceLastSale > 7 && customer.currentBalance > 0) {
            // Check if notification already exists (within last 7 days)
            const prismaWithNotif = prisma as unknown as { notification: { findFirst: (args: unknown) => Promise<any>, create: (args: unknown) => Promise<any> } }
            const existingNotification = await prismaWithNotif.notification.findFirst({
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
              const notification = await prismaWithNotif.notification.create({
                data: {
                  stationId: lastSale.shift?.stationId || null,
                  title: 'Credit Payment Overdue',
                  message: `${customer.name} payment is ${daysSinceLastSale} days overdue (Rs. ${customer.currentBalance.toLocaleString()})`,
                  type: 'ERROR',
                  priority: daysSinceLastSale > 14 ? 'CRITICAL' : 'HIGH',
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
              name: true
            }
          }
        },
        take: 50
      })

      for (const shift of recentShifts) {
        const statistics = shift.statistics as any
        if (statistics && statistics.variancePercentage) {
          const variancePercentage = Math.abs(statistics.variancePercentage)

          if (variancePercentage > 1.0) {
            // Check if notification already exists for this shift
            const prismaWithNotif = prisma as unknown as { notification: { findFirst: (args: unknown) => Promise<any>, create: (args: unknown) => Promise<any> } }
            const existingNotification = await prismaWithNotif.notification.findFirst({
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
              const notification = await prismaWithNotif.notification.create({
                data: {
                  stationId: shift.stationId,
                  title: 'Shift Variance Alert',
                  message: `Shift closed with ${variancePercentage.toFixed(2)}% variance (Rs. ${Math.abs(statistics.variance || 0).toLocaleString()}) - ${variancePercentage > 2.0 ? 'requires immediate review' : 'needs review'}`,
                  type: variancePercentage > 2.0 ? 'ERROR' : 'WARNING',
                  priority: variancePercentage > 2.0 ? 'CRITICAL' : variancePercentage > 1.5 ? 'HIGH' : 'MEDIUM',
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

    // 4. Check for unreconciled POS batches (older than 1 day)
    try {
      const unreconciledBatches = await prisma.posBatch.findMany({
        where: {
          isReconciled: false,
          shift: {
            ...(stationId ? { stationId } : {}),
            endTime: {
              lte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 1 day
            }
          }
        },
        include: {
          shift: {
            include: {
              station: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })

      if (unreconciledBatches.length > 0) {
        // Check if notification already exists (within last 24 hours)
        const prismaWithNotif = prisma as unknown as { notification: { findFirst: (args: unknown) => Promise<any>, create: (args: unknown) => Promise<any> } }
        const existingNotification = await prismaWithNotif.notification.findFirst({
          where: {
            category: 'POS',
            type: 'WARNING',
            message: {
              contains: 'POS reconciliation'
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })

        if (!existingNotification) {
          const notification = await prismaWithNotif.notification.create({
            data: {
              stationId: unreconciledBatches[0].shift.stationId,
              title: 'POS Reconciliation Pending',
              message: `${unreconciledBatches.length} POS batch${unreconciledBatches.length > 1 ? 'es' : ''} need${unreconciledBatches.length > 1 ? '' : 's'} reconciliation`,
              type: 'WARNING',
              priority: unreconciledBatches.length > 5 ? 'HIGH' : 'MEDIUM',
              category: 'POS',
              actionUrl: `/pos/batches`,
              metadata: {
                batchCount: unreconciledBatches.length,
                batchIds: unreconciledBatches.map(b => b.id)
              }
            }
          })
          generatedNotifications.push(notification.id)
        }
      }
    } catch (error) {
      console.error('Error checking POS batches:', error)
      errors.push('Failed to check POS batches')
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

