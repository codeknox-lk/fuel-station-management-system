import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const fuelType = searchParams.get('fuelType')

    const now = new Date()
    
    // Build where clause
    const where: any = {
      effectiveDate: { gt: now },
      isActive: true
    }
    
    if (stationId) {
      where.stationId = stationId
    }
    if (fuelType) {
      where.fuelType = fuelType
    }

    // Get scheduled prices (future prices)
    const scheduledPrices = await prisma.price.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { effectiveDate: 'asc' }
    })

    // Get current active prices
    const currentPricesWhere: any = {
      effectiveDate: { lte: now },
      isActive: true
    }
    if (stationId) {
      currentPricesWhere.stationId = stationId
    }

    const currentPrices = await prisma.price.findMany({
      where: currentPricesWhere,
      orderBy: [
        { stationId: 'asc' },
        { fuelType: 'asc' },
        { effectiveDate: 'desc' }
      ],
      distinct: ['stationId', 'fuelType']
    })

    // Group by station, fuel type and get the next price for each
    const nextPrices: any[] = []
    const processedKeys = new Set<string>()

    for (const scheduledPrice of scheduledPrices) {
      const key = `${scheduledPrice.stationId}-${scheduledPrice.fuelType}`
      
      if (processedKeys.has(key)) {
        continue
      }
      processedKeys.add(key)

      // Find current price for this station and fuel type
      const currentPrice = currentPrices.find(p => 
        p.stationId === scheduledPrice.stationId && 
        p.fuelType === scheduledPrice.fuelType
      )

      if (currentPrice) {
        const changeAmount = scheduledPrice.price - currentPrice.price
        const changePercent = (changeAmount / currentPrice.price) * 100

        nextPrices.push({
          stationId: scheduledPrice.stationId,
          stationName: scheduledPrice.station.name,
          fuelType: scheduledPrice.fuelType,
          currentPrice: currentPrice.price,
          nextPrice: scheduledPrice.price,
          effectiveDate: scheduledPrice.effectiveDate,
          changeAmount: Math.round(changeAmount * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100
        })
      } else {
        // No current price, just show the scheduled one
        nextPrices.push({
          stationId: scheduledPrice.stationId,
          stationName: scheduledPrice.station.name,
          fuelType: scheduledPrice.fuelType,
          currentPrice: null,
          nextPrice: scheduledPrice.price,
          effectiveDate: scheduledPrice.effectiveDate,
          changeAmount: null,
          changePercent: null
        })
      }
    }

    return NextResponse.json(nextPrices)
  } catch (error) {
    console.error('Error fetching next prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

