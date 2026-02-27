import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const terminal = await prisma.posTerminal.findUnique({
      where: { id },
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
        amexBank: {
          select: {
            id: true,
            name: true
          }
        },
        batchEntries: {
          take: 10,
          orderBy: { startNumber: 'desc' },
          include: {
            batch: {
              select: {
                createdAt: true
              }
            }
          }
        },
        _count: {
          select: {
            batchEntries: true
          }
        }
      }
    })

    if (!terminal) {
      return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
    }

    return NextResponse.json(terminal)
  } catch (error) {
    console.error('Error fetching POS terminal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const terminal = await prisma.posTerminal.findUnique({
      where: { id }
    })

    if (!terminal) {
      return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
    }

    const { name, terminalNumber, isActive, bankId, amexBankId } = body

    const updatedTerminal = await prisma.posTerminal.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(terminalNumber && { terminalNumber }),
        ...(isActive !== undefined && { isActive }),
        ...(bankId !== undefined && { bankId: bankId || null }),
        ...(amexBankId !== undefined && { amexBankId: amexBankId || null })
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
        },
        amexBank: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedTerminal)
  } catch (error) {
    console.error('Error updating POS terminal:', error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A terminal with this number already exists for this station' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update POS terminal' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const terminal = await prisma.posTerminal.findUnique({
      where: { id }
    })

    if (!terminal) {
      return NextResponse.json({ error: 'POS terminal not found' }, { status: 404 })
    }

    // Check for batch entries
    const hasBatchEntries = await prisma.posBatchTerminalEntry.count({
      where: { terminalId: id }
    }) > 0

    if (hasBatchEntries) {
      return NextResponse.json({
        error: 'Cannot delete POS terminal with existing batch entries'
      }, { status: 400 })
    }

    await prisma.posTerminal.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'POS terminal deleted successfully' })
  } catch (error) {
    console.error('Error deleting POS terminal:', error)
    return NextResponse.json({ error: 'Failed to delete POS terminal' }, { status: 500 })
  }
}

