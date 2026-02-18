import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    const user = await getServerUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const stationId = searchParams.get('stationId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    try {
        const where: Prisma.ShopSaleWhereInput = {
            organizationId: user.organizationId
        }

        if (stationId) {
            where.assignment = {
                shift: {
                    stationId: stationId
                }
            }
        }

        if (startDate || endDate) {
            where.timestamp = {}
            if (startDate) {
                where.timestamp.gte = new Date(startDate)
            }
            if (endDate) {
                where.timestamp.lte = new Date(endDate)
            }
        }

        const sales = await prisma.shopSale.findMany({
            where,
            include: {
                product: {
                    select: {
                        name: true,
                        unit: true
                    }
                },
                assignment: {
                    select: {
                        pumperName: true,
                        shift: {
                            select: {
                                startTime: true,
                                endTime: true,
                                station: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        })

        return NextResponse.json(sales)
    } catch (error) {
        console.error('Error fetching shop sales history:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
