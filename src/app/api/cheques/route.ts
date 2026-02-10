import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ChequeStatus } from '@prisma/client'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (id) {
      const cheque = await prisma.cheque.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          },
          bank: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!cheque) {
        return NextResponse.json({ error: 'Cheque not found' }, { status: 404 })
      }
      return NextResponse.json(cheque)
    }

    interface ChequeWhereInput {
      organizationId: string
      stationId?: string
      status?: ChequeStatus
    }
    const where: ChequeWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status as ChequeStatus
    }

    const cheques = await prisma.cheque.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        bank: {
          select: {
            id: true,
            name: true
          }
        },
        creditPayment: {
          include: {
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { receivedDate: 'desc' }
    })

    return NextResponse.json(cheques)
  } catch (error) {
    console.error('Error fetching cheques:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface ChequeBody {
      stationId?: string
      chequeNumber?: string
      amount?: string | number
      bankId?: string
      receivedFrom?: string
      receivedDate?: string | Date
      notes?: string
    }
    const body = await request.json() as ChequeBody

    const { stationId, chequeNumber, amount, bankId, receivedFrom, receivedDate, notes } = body

    if (!stationId || !chequeNumber || !amount || !bankId || !receivedFrom || !receivedDate) {
      return NextResponse.json(
        { error: 'Station ID, cheque number, amount, bank ID, received from, and received date are required' },
        { status: 400 }
      )
    }

    // Get current user for recordedBy
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const recordedBy = user.username

    const newCheque = await prisma.cheque.create({
      data: {
        stationId,
        chequeNumber,
        amount: parseFloat(String(amount)),
        bankId,
        receivedFrom,
        receivedDate: new Date(receivedDate),
        notes: notes || null,
        status: 'PENDING',
        recordedBy,
        organizationId: user.organizationId
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        bank: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Create audit log for cheque creation
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          userName: user.username,
          userRole: user.role,
          action: 'CREATE',
          entity: 'Cheque',
          entityId: newCheque.id,
          details: `Recorded cheque: ${newCheque.chequeNumber} for Rs. ${(newCheque.amount || 0).toLocaleString()}`,
          stationId: newCheque.stationId,
          organizationId: user.organizationId
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return NextResponse.json(newCheque, { status: 201 })
  } catch (error) {
    console.error('Error creating cheque:', error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A cheque with this number already exists' },
        { status: 400 }
      )
    }

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or bank ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

