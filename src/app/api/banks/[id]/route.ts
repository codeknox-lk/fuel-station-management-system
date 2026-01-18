import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const bank = await prisma.bank.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deposits: true,
            cheques: true,
            creditPayments: true
          }
        }
      }
    })
    
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    return NextResponse.json(bank)
  } catch (error) {
    console.error('Error fetching bank:', error)
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
    
    const bank = await prisma.bank.findUnique({
      where: { id }
    })
    
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    const { name, branch, accountNumber, isActive } = body
    
    const updatedBank = await prisma.bank.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(branch !== undefined && { branch: branch || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber || null }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(updatedBank)
  } catch (error) {
    console.error('Error updating bank:', error)
    return NextResponse.json({ error: 'Failed to update bank' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const bank = await prisma.bank.findUnique({
      where: { id }
    })
    
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    // Check for dependencies
    const hasDeposits = await prisma.deposit.count({ where: { bankId: id } }) > 0
    const hasCheques = await prisma.cheque.count({ where: { bankId: id } }) > 0
    const hasCreditPayments = await prisma.creditPayment.count({ where: { bankId: id } }) > 0
    
    if (hasDeposits || hasCheques || hasCreditPayments) {
      return NextResponse.json({ 
        error: 'Cannot delete bank with existing deposits, cheques, or credit payments' 
      }, { status: 400 })
    }

    await prisma.bank.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Bank deleted successfully' })
  } catch (error) {
    console.error('Error deleting bank:', error)
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 })
  }
}

