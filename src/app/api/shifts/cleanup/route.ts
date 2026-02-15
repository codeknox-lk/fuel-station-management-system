import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

/**
 * DELETE /api/shifts/cleanup
 * Delete shifts from the database based on status
 * Multi-tenant safe: only affects the user's organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Restriction: Only Owners or Managers can cleanup
    if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const allParam = searchParams.get('all')

    // Determine which shifts to delete
    const whereClause: Prisma.ShiftWhereInput = {
      organizationId: user.organizationId
    }
    let statusType = 'CLOSED'

    if (allParam === 'true') {
      statusType = 'ALL'
    } else if (statusParam === 'OPEN') {
      whereClause.status = 'OPEN'
      statusType = 'OPEN'
    } else if (statusParam === 'CLOSED') {
      whereClause.status = 'CLOSED'
      statusType = 'CLOSED'
    } else {
      whereClause.status = 'CLOSED'
      statusType = 'CLOSED'
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
          select: { name: true }
        },
        template: {
          select: { name: true }
        },
        _count: {
          select: { assignments: true }
        }
      },
      orderBy: { startTime: 'desc' }
    })

    if (shifts.length === 0) {
      return NextResponse.json({
        message: `No ${statusType.toLowerCase()} shifts found`,
        deleted: 0,
        status: statusType
      })
    }

    const shiftIds = shifts.map(s => s.id)

    // Delete in sequence across organization
    await prisma.$transaction(async (tx) => {
      // 1. Credit Sales
      await tx.creditSale.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 2. POS Missing Slips
      await tx.posMissingSlip.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 3. Meter Audits
      await tx.meterAudit.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 4. Test Pours
      await tx.testPour.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 5. Tenders
      await tx.tender.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 6. Shop Assignments
      await tx.shopAssignment.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 7. Assignments
      await tx.shiftAssignment.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 8. POS Batches
      await tx.posBatch.deleteMany({
        where: { shiftId: { in: shiftIds }, organizationId: user.organizationId }
      })

      // 9. Shifts
      await tx.shift.deleteMany({
        where: whereClause
      })
    })

    return NextResponse.json({
      message: `Successfully deleted ${shifts.length} ${statusType.toLowerCase()} shift(s)`,
      deleted: shifts.length,
      status: statusType,
      shifts: shifts.map(s => ({
        id: s.id,
        station: s.station.name,
        template: s.template?.name || 'Manual',
        status: s.status,
        startTime: s.startTime,
        endTime: s.endTime,
        openedBy: s.openedBy,
        closedBy: s.closedBy,
        assignments: s._count.assignments
      }))
    })
  } catch (error) {
    console.error('❌ Error deleting shifts:', error)
    return NextResponse.json({
      error: 'Failed to delete shifts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
