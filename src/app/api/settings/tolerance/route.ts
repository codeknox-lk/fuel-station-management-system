import { NextRequest, NextResponse } from 'next/server'

// Tolerance configuration - Flat Rs. 20 for any sale
let toleranceConfig = {
  id: 'tolerance_1',
  percentageTolerance: 0, // Not used - flat amount only
  flatAmountTolerance: 20, // Rs. 20 flat tolerance for any sale
  useMaximum: false, // Not used - flat amount only
  description: 'Flat Rs. 20 tolerance for any sale amount',
  updatedBy: 'System Admin',
  updatedAt: new Date().toISOString()
}

export async function GET() {
  return NextResponse.json(toleranceConfig)
}

export async function POST(request: NextRequest) {
  try {
    interface ToleranceBody {
      percentageTolerance?: number
      flatAmountTolerance?: number
      useMaximum?: boolean
      description?: string
    }
    const body = await request.json() as ToleranceBody

    toleranceConfig = {
      ...toleranceConfig,
      ...body,
      updatedBy: 'System User', // Note: In production, this should come from auth headers
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(toleranceConfig)
  } catch {
    return NextResponse.json({ error: 'Failed to update tolerance configuration' }, { status: 500 })
  }
}

