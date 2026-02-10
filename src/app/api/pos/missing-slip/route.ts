import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const terminalId = searchParams.get('terminalId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = searchParams.get('limit')

    if (id) {
      const slip = await prisma.posMissingSlip.findUnique({
        where: { id_organizationId: { id, organizationId: user.organizationId } },
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

    const where: Prisma.PosMissingSlipWhereInput = {
      organizationId: user.organizationId
    }
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { terminalId, amount, lastFourDigits, timestamp, notes } = body
    const secureReportedBy = user.username

    if (!terminalId || amount === undefined || !lastFourDigits || !timestamp) {
      return NextResponse.json(
        { error: 'Terminal ID, amount, last four digits, and timestamp are required' },
        { status: 400 }
      )
    }

    // Find terminal
    const terminal = await prisma.posTerminal.findUnique({
      where: { id_organizationId: { id: terminalId, organizationId: user.organizationId } },
      include: { station: true }
    })

    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }

    // Find or create active shift
    let shift = await prisma.shift.findFirst({
      where: {
        stationId: terminal.stationId,
        status: 'OPEN',
        organizationId: user.organizationId
      },
      orderBy: { startTime: 'desc' }
    })

    if (!shift) {
      let template = await prisma.shiftTemplate.findFirst({
        where: {
          stationId: terminal.stationId,
          isActive: true,
          organizationId: user.organizationId
        }
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            stationId: terminal.stationId,
            name: 'Default Template',
            startTime: '00:00',
            endTime: '23:59',
            isActive: true,
            organizationId: user.organizationId
          }
        })
      }

      shift = await prisma.shift.create({
        data: {
          stationId: terminal.stationId,
          templateId: template.id,
          startTime: new Date(timestamp),
          openedBy: secureReportedBy,
          status: 'OPEN',
          organizationId: user.organizationId
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
        reportedBy: secureReportedBy,
        notes: notes || null,
        organizationId: user.organizationId
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
