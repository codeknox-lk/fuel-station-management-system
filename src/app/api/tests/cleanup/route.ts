import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * DELETE /api/tests/cleanup
 * Delete all test pours from the database
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️  Deleting all test pours...')
    
    // Count existing test pours
    const count = await prisma.testPour.count()
    
    if (count === 0) {
      return NextResponse.json({
        message: 'No test pours found to delete',
        deleted: 0
      })
    }
    
    // Delete all test pours
    const result = await prisma.testPour.deleteMany({})
    
    console.log(`✅ Deleted ${result.count} test pour(s)`)
    
    return NextResponse.json({
      message: `Successfully deleted ${result.count} test pour(s)`,
      deleted: result.count
    })
  } catch (error) {
    console.error('Error deleting test pours:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

