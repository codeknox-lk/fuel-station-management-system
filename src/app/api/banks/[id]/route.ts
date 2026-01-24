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
    
    console.log('=== BANK UPDATE API ===')
    console.log('Bank ID:', id)
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const bank = await prisma.bank.findUnique({
      where: { id }
    })
    
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    const { code, name, branch, accountNumber, accountName, swiftCode, contactPerson, phone, email, status } = body
    
    const updateData: any = {}
    
    // Always update these fields
    if (name !== undefined && name) updateData.name = name
    if (status !== undefined) updateData.isActive = status === 'active'
    
    // For optional fields, set to null if empty, otherwise set the value
    if (code !== undefined) {
      updateData.code = code && code.trim() ? code.trim() : null
    }
    if (branch !== undefined) {
      updateData.branch = branch && branch.trim() ? branch.trim() : null
    }
    if (accountNumber !== undefined) {
      updateData.accountNumber = accountNumber && accountNumber.trim() ? accountNumber.trim() : null
    }
    if (accountName !== undefined) {
      updateData.accountName = accountName && accountName.trim() ? accountName.trim() : null
    }
    if (swiftCode !== undefined) {
      updateData.swiftCode = swiftCode && swiftCode.trim() ? swiftCode.trim() : null
    }
    if (contactPerson !== undefined) {
      updateData.contactPerson = contactPerson && contactPerson.trim() ? contactPerson.trim() : null
    }
    if (phone !== undefined) {
      updateData.phone = phone && phone.trim() ? phone.trim() : null
    }
    if (email !== undefined) {
      updateData.email = email && email.trim() ? email.trim() : null
    }
    
    console.log('Update data:', JSON.stringify(updateData, null, 2))
    
    const updatedBank = await prisma.bank.update({
      where: { id },
      data: updateData
    })

    console.log('Updated bank:', JSON.stringify(updatedBank, null, 2))
    console.log('======================')

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

