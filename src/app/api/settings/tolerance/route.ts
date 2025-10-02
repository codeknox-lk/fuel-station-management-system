import { NextRequest, NextResponse } from 'next/server'

// Mock tolerance configuration
let toleranceConfig = {
  id: 'tolerance_1',
  percentageTolerance: 0.3, // 0.3%
  flatAmountTolerance: 200, // Rs. 200
  useMaximum: true, // max(%, Rs)
  description: 'Default tolerance configuration - maximum of 0.3% or Rs. 200',
  updatedBy: 'System Admin',
  updatedAt: '2024-01-01T00:00:00Z'
}

export async function GET() {
  return NextResponse.json(toleranceConfig)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    toleranceConfig = {
      ...toleranceConfig,
      ...body,
      updatedBy: 'Current User', // In a real app, this would come from auth
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(toleranceConfig)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update tolerance configuration' }, { status: 500 })
  }
}
