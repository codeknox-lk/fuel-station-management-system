import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
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
    }

    const where = stationId ? { stationId } : {}
    const terminals = await prisma.posTerminal.findMany({
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
        _count: {
          select: {
            batchEntries: true
          }
        }
      },
      orderBy: { terminalNumber: 'asc' }
    })

    return NextResponse.json(terminals)
  } catch (error) {
    console.error('Error fetching POS terminals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { stationId, terminalNumber, name, bankId } = body
    
    if (!stationId || !terminalNumber || !name) {
      return NextResponse.json(
        { error: 'Station ID, terminal number, and name are required' },
        { status: 400 }
      )
    }

    const newTerminal = await prisma.posTerminal.create({
      data: {
        stationId,
        bankId: bankId || null,
        terminalNumber,
        name,
        isActive: true
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

    return NextResponse.json(newTerminal, { status: 201 })
  } catch (error) {
    console.error('Error creating POS terminal:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A terminal with this number already exists for this station' },
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

