import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')

    if (id) {
      const slip = await prisma.posMissingSlip.findUnique({
        where: { id },
        include: {
          terminal: {
            select: {
              id: true,
              name: true,
              terminalNumber: true
            }
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true
            }
          }
        }
      })

      if (!slip) {
        return NextResponse.json({ error: 'Missing slip not found' }, { status: 404 })
      }
      return NextResponse.json(slip)
    }

    const where: Prisma.PosMissingSlipWhereInput = {}
    if (shiftId) {
      where.shiftId = shiftId
    }
    if (terminalId) {
      where.terminalId = terminalId
    }
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const slips = await prisma.posMissingSlip.findMany({
      where,
      include: {
        terminal: {
          select: {
            id: true,
            name: true,
            terminalNumber: true
          }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      ...(limit ? { take: parseInt(limit) } : {})
    })

    return NextResponse.json(slips)
  } catch (error) {
    console.error('Error fetching missing slips:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface MissingSlipBody {
      terminalId?: string
      amount?: number
      lastFourDigits?: string
      timestamp?: string | Date
      reportedBy?: string
      notes?: string
    }
    const body = await request.json() as MissingSlipBody

    const { terminalId, amount, lastFourDigits, timestamp, reportedBy, notes } = body

    if (!terminalId || amount === undefined || !lastFourDigits || !timestamp || !reportedBy) {
      return NextResponse.json(
        { error: 'Terminal ID, amount, last four digits, timestamp, and reported by are required' },
        { status: 400 }
      )
    }

    // Find terminal to get station
    const terminal = await prisma.posTerminal.findUnique({
      where: { id: terminalId },
      include: { station: true }
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    // Find or create active shift (similar to test pours and batches)
    let shift = await prisma.shift.findFirst({
      where: {
        stationId: terminal.stationId,
        status: 'OPEN'
      },
      orderBy: { startTime: 'desc' }
    })

    if (!shift) {
      // Find or create default template
      let template = await prisma.shiftTemplate.findFirst({
        where: {
          stationId: terminal.stationId,
          isActive: true
        }
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            stationId: terminal.stationId,
            name: 'Default Template',
            startTime: '00:00',
            endTime: '23:59',
            isActive: true
          }
        })
      }

      // Create new shift
      shift = await prisma.shift.create({
        data: {
          stationId: terminal.stationId,
          templateId: template.id,
          startTime: new Date(timestamp),
          openedBy: reportedBy,
          status: 'OPEN'
        }
      })
    }

    const newSlip = await prisma.posMissingSlip.create({
      data: {
        terminalId,
        shiftId: shift.id,
        amount: parseFloat(String(amount)),
        lastFourDigits,
        timestamp: new Date(timestamp),
        reportedBy,
        notes: notes || null
      },
      include: {
        terminal: {
          select: {
            id: true,
            name: true,
            terminalNumber: true
          }
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(newSlip, { status: 201 })
  } catch (error) {
    console.error('Error creating missing slip:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid terminal or shift ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

