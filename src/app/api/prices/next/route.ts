import { NextResponse } from 'next/server'
import { prices } from '@/data/prices.seed'

export async function GET() {
  try {
    // Get scheduled prices (future prices)
    const now = new Date()
    const scheduledPrices = prices.filter(p => 
      p.status === 'scheduled' && new Date(p.effectiveFrom) > now
    )

    // Group by fuel type and get the next price for each
    const nextPrices = []
    const fuelTypes = ['petrol', 'diesel', 'super_diesel', 'kerosene']
    
    for (const fuelType of fuelTypes) {
      const currentPrice = prices.find(p => 
        p.fuelType === fuelType && p.status === 'active'
      )
      
      const nextPrice = scheduledPrices
        .filter(p => p.fuelType === fuelType)
        .sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime())[0]
      
      if (currentPrice && nextPrice) {
        const changeAmount = nextPrice.price - currentPrice.price
        const changePercent = (changeAmount / currentPrice.price) * 100
        
        nextPrices.push({
          fuelType,
          currentPrice: currentPrice.price,
          nextPrice: nextPrice.price,
          effectiveFrom: nextPrice.effectiveFrom,
          changeAmount,
          changePercent
        })
      }
    }

    return NextResponse.json(nextPrices)
  } catch (error) {
    console.error('Error fetching next prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
