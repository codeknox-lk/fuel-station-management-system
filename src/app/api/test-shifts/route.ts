import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('=== TEST SHIFTS API ===')
    
    // Test basic functionality
    console.log('Testing basic imports...')
    
    // Test shifts data
    console.log('Testing shifts data...')
    const { getShifts } = await import('@/data/shifts.seed')
    const shifts = getShifts()
    console.log('Shifts loaded:', shifts.length)
    
    return NextResponse.json({ 
      success: true, 
      shiftCount: shifts.length,
      firstShift: shifts[0] 
    })
  } catch (error) {
    console.error('Test API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}

