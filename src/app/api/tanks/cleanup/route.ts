import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  try {
    // Log removed('🧹 Starting tank cleanup...')

    // Delete in order (respecting foreign keys)
    // Log removed('Deleting test pours...')
    const testPours = await prisma.testPour.deleteMany()
    // Log removed(`Deleted ${testPours.count} test pours`)

    // Log removed('Deleting meter audits...')
    const meterAudits = await prisma.meterAudit.deleteMany()
    // Log removed(`Deleted ${meterAudits.count} meter audits`)

    // Log removed('Deleting shift assignments...')
    const assignments = await prisma.shiftAssignment.deleteMany()
    // Log removed(`Deleted ${assignments.count} shift assignments`)

    // Log removed('Deleting shifts...')
    const shifts = await prisma.shift.deleteMany()
    // Log removed(`Deleted ${shifts.count} shifts`)

    // Log removed('Deleting tank dips...')
    const tankDips = await prisma.tankDip.deleteMany()
    // Log removed(`Deleted ${tankDips.count} tank dips`)

    // Log removed('Deleting deliveries...')
    const deliveries = await prisma.delivery.deleteMany()
    // Log removed(`Deleted ${deliveries.count} deliveries`)

    // Log removed('Deleting nozzles...')
    const nozzles = await prisma.nozzle.deleteMany()
    // Log removed(`Deleted ${nozzles.count} nozzles`)

    // Log removed('Deleting pumps...')
    const pumps = await prisma.pump.deleteMany()
    // Log removed(`Deleted ${pumps.count} pumps`)

    // Log removed('Deleting tanks...')
    const tanks = await prisma.tank.deleteMany()
    // Log removed(`Deleted ${tanks.count} tanks`)

    return NextResponse.json({
      message: 'All tank data deleted successfully',
      deleted: {
        testPours: testPours.count,
        meterAudits: meterAudits.count,
        shiftAssignments: assignments.count,
        shifts: shifts.count,
        tankDips: tankDips.count,
        deliveries: deliveries.count,
        nozzles: nozzles.count,
        pumps: pumps.count,
        tanks: tanks.count
      }
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup tank data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



