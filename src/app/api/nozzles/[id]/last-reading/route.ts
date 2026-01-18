import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the last end meter reading for this nozzle from closed assignments
    const lastAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        nozzleId: id,
        status: 'CLOSED',
        endMeterReading: { not: null }
      },
      orderBy: { closedAt: 'desc' },
      select: {
        endMeterReading: true,
        closedAt: true
      }
    })
    
    return NextResponse.json({
      nozzleId: id,
      lastEndMeterReading: lastAssignment?.endMeterReading || null,
      lastClosedAt: lastAssignment?.closedAt || null
    })
  } catch (error) {
    console.error('Error fetching last meter reading:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

