import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if transaction exists
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction
    await prisma.bankTransaction.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting bank transaction:', error)
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

    // Check if transaction exists
    const existing = await prisma.bankTransaction.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update transaction
    const transaction = await prisma.bankTransaction.update({
      where: { id },
      data: {
        type: body.type || existing.type,
        amount: body.amount ? parseFloat(body.amount) : existing.amount,
        description: body.description || existing.description,
        referenceNumber: body.referenceNumber !== undefined ? body.referenceNumber : existing.referenceNumber,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : existing.transactionDate,
        notes: body.notes !== undefined ? body.notes : existing.notes
      },
      include: {
        bank: { select: { name: true } },
        station: { select: { name: true } }
      }
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating bank transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
