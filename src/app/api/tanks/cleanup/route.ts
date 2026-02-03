import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE() {
  try {
    console.log('🧹 Starting tank cleanup...')

    // Delete in order (respecting foreign keys)
    console.log('Deleting test pours...')
    const testPours = await prisma.testPour.deleteMany()
    console.log(`Deleted ${testPours.count} test pours`)

    console.log('Deleting meter audits...')
    const meterAudits = await prisma.meterAudit.deleteMany()
    console.log(`Deleted ${meterAudits.count} meter audits`)

    console.log('Deleting shift assignments...')
    const assignments = await prisma.shiftAssignment.deleteMany()
    console.log(`Deleted ${assignments.count} shift assignments`)

    console.log('Deleting shifts...')
    const shifts = await prisma.shift.deleteMany()
    console.log(`Deleted ${shifts.count} shifts`)

    console.log('Deleting tank dips...')
    const tankDips = await prisma.tankDip.deleteMany()
    console.log(`Deleted ${tankDips.count} tank dips`)

    console.log('Deleting deliveries...')
    const deliveries = await prisma.delivery.deleteMany()
    console.log(`Deleted ${deliveries.count} deliveries`)

    console.log('Deleting nozzles...')
    const nozzles = await prisma.nozzle.deleteMany()
    console.log(`Deleted ${nozzles.count} nozzles`)

    console.log('Deleting pumps...')
    const pumps = await prisma.pump.deleteMany()
    console.log(`Deleted ${pumps.count} pumps`)

    console.log('Deleting tanks...')
    const tanks = await prisma.tank.deleteMany()
    console.log(`Deleted ${tanks.count} tanks`)

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



