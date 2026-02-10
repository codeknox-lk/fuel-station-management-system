import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CreateOilSaleSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    // const shiftId = searchParams.get('shiftId') // Unused for now
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const summary = searchParams.get('summary')
    const limit = parseInt(searchParams.get('limit') || '100')

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build where clause
    interface OilSaleWhereInput {
      organizationId: string
      stationId?: string
      saleDate?: {
        gte: Date
        lte: Date
      }
    }
    const where: OilSaleWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Get summary
    if (summary === 'true') {
      const sales = await prisma.oilSale.findMany({
        where,
        select: {
          quantity: true,
          totalAmount: true,
          productName: true
        }
      })

      const summaryData = {
        totalSales: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        totalQuantity: sales.reduce((sum, sale) => sum + sale.quantity, 0),
        salesCount: sales.length,
        products: sales.reduce((acc, sale) => {
          if (!acc[sale.productName]) {
            acc[sale.productName] = { quantity: 0, totalAmount: 0 }
          }
          acc[sale.productName].quantity += sale.quantity
          acc[sale.productName].totalAmount += sale.totalAmount
          return acc
        }, {} as Record<string, { quantity: number; totalAmount: number }>)
      }

      return NextResponse.json(summaryData)
    }

    // Filter by shift - note: OilSale model doesn't have shiftId, so we skip this for now
    // This would need to be added to the schema if shift tracking is needed

    const sales = await prisma.oilSale.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { saleDate: 'desc' },
      take: limit
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching oil sales:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod Validation
    const result = CreateOilSaleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stationId, productName, quantity, unit, price, totalAmount, customerName, saleDate } = result.data

    const calculatedTotal = totalAmount || (quantity * price) // quantity and price are numbers

    // Get current user for recordedBy
    const currentUser = await getServerUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const recordedBy = currentUser.username

    const newSale = await prisma.oilSale.create({
      data: {
        stationId,
        organizationId: currentUser.organizationId,
        productName,
        quantity,
        unit: unit || 'liters',
        price,
        totalAmount: calculatedTotal,
        customerName: customerName || null,
        saleDate,
        recordedBy
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(newSale, { status: 201 })
  } catch (error) {
    console.error('Error creating oil sale:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

