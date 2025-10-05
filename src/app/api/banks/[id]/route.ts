import { NextRequest, NextResponse } from 'next/server'
import { banks } from '@/data/banks.seed'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const bankIndex = banks.findIndex(b => b.id === id)
    if (bankIndex === -1) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    banks[bankIndex] = {
      ...banks[bankIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(banks[bankIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bank' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const bankIndex = banks.findIndex(b => b.id === id)
    if (bankIndex === -1) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    banks.splice(bankIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 })
  }
}

