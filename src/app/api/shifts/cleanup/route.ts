import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * DELETE /api/shifts/cleanup
 * Delete shifts from the database based on status
 * Query parameters:
 *   - status: 'CLOSED' | 'OPEN' | 'ALL' (default: 'CLOSED')
 *   - all: 'true' to delete all shifts regardless of status
 * 
 * Examples:
 *   DELETE /api/shifts/cleanup?status=CLOSED  - Delete only closed shifts
 *   DELETE /api/shifts/cleanup?status=OPEN    - Delete only open (running) shifts
 *   DELETE /api/shifts/cleanup?all=true       - Delete all shifts
 */
export async function DELETE(request: NextRequest) {
  try {
    // Security: You might want to add authentication/authorization here
    // For now, we'll allow it, but in production, restrict to admin/owner

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const allParam = searchParams.get('all')

    // Determine which shifts to delete
    let whereClause: Prisma.ShiftWhereInput = {}
    let statusType = 'CLOSED'

    if (allParam === 'true') {
      // Delete all shifts
      whereClause = {}
      statusType = 'ALL'
    } else if (statusParam === 'OPEN') {
      // Delete only open (running) shifts
      whereClause = { status: 'OPEN' }
      statusType = 'OPEN'
    } else if (statusParam === 'CLOSED') {
      // Delete only closed shifts
      whereClause = { status: 'CLOSED' }
      statusType = 'CLOSED'
    } else {
      // Default: delete only closed shifts
      whereClause = { status: 'CLOSED' }
      statusType = 'CLOSED'
    }

    console.log(`🔍 Checking for ${statusType} shifts...`)

    // First, count how many shifts exist
    const shiftsCount = await prisma.shift.count({
      where: whereClause
    })

    if (shiftsCount === 0) {
      return NextResponse.json({
        message: `No ${statusType.toLowerCase()} shifts found`,
        deleted: 0,
        status: statusType
      })
    }

    // Get shifts info before deletion
    const shifts = await prisma.shift.findMany({
      where: whereClause,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        openedBy: true,
        closedBy: true,
        station: {
          select: {
            name: true
          }
        },
        template: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            assignments: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    })

    console.log(`Found ${shiftsCount} ${statusType.toLowerCase()} shift(s) to delete`)

    // Delete related data first to avoid foreign key constraint violations
    // Delete in order: related records -> assignments -> shifts

    // Get shift IDs to delete
    const shiftIds = shifts.map(s => s.id)

    console.log('🗑️  Deleting related data first...')

    // Delete credit sales
    const creditSalesDeleted = await prisma.creditSale.deleteMany({
      where: { shiftId: { in: shiftIds } }
    })
    console.log(`  - Deleted ${creditSalesDeleted.count} credit sale(s)`)

    // Delete POS missing slips
    const posMissingSlipsDeleted = await prisma.posMissingSlip.deleteMany({
      where: { shiftId: { in: shiftIds } }
    })
    console.log(`  - Deleted ${posMissingSlipsDeleted.count} POS missing slip(s)`)

    // Delete meter audits
    const meterAuditsDeleted = await prisma.meterAudit.deleteMany({
      where: { shiftId: { in: shiftIds } }
    })
    console.log(`  - Deleted ${meterAuditsDeleted.count} meter audit(s)`)

    // Delete test pours
    const testPoursDeleted = await prisma.testPour.deleteMany({
      where: { shiftId: { in: shiftIds } }
    })
    console.log(`  - Deleted ${testPoursDeleted.count} test pour(s)`)

    // Delete tenders (if they exist)
    try {
      const tendersDeleted = await prisma.tender.deleteMany({
        where: { shiftId: { in: shiftIds } }
      })
      console.log(`  - Deleted ${tendersDeleted.count} tender(s)`)
    } catch (e) {
      console.log('  - No tenders to delete or error:', e)
    }

    // Delete assignments (cascade should handle this, but being explicit)
    const assignmentsDeleted = await prisma.shiftAssignment.deleteMany({
      where: { shiftId: { in: shiftIds } }
    })
    console.log(`  - Deleted ${assignmentsDeleted.count} assignment(s)`)

    // Finally, delete shifts
    console.log('🗑️  Deleting shifts...')
    const deleteResult = await prisma.shift.deleteMany({
      where: whereClause
    })

    console.log(`✅ Successfully deleted ${deleteResult.count} ${statusType.toLowerCase()} shift(s)`)

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} ${statusType.toLowerCase()} shift(s)`,
      deleted: deleteResult.count,
      status: statusType,
      shifts: shifts.map(shift => ({
        id: shift.id,
        station: shift.station.name,
        template: shift.template?.name || 'N/A',
        status: shift.status,
        startTime: shift.startTime,
        endTime: shift.endTime,
        openedBy: shift.openedBy,
        closedBy: shift.closedBy,
        assignments: shift._count.assignments
      }))
    })
  } catch (error) {
    console.error('❌ Error deleting shifts:', error)

    if (error instanceof Error) {
      return NextResponse.json({
        error: 'Failed to delete shifts',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

