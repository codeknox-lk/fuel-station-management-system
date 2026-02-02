import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { UpdateBankSchema } from '@/lib/schemas'

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

    // Zod Validation
    const result = UpdateBankSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { code, name, branch, accountNumber, accountName, swiftCode, contactPerson, phone, email, status } = result.data

    const bank = await prisma.bank.findUnique({
      where: { id }
    })

    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    const updateData: Prisma.BankUpdateInput = {}

    if (name !== undefined) updateData.name = name
    if (status !== undefined) updateData.isActive = status === 'active'
    if (code !== undefined) updateData.code = code
    if (branch !== undefined) updateData.branch = branch
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber
    if (accountName !== undefined) updateData.accountName = accountName
    if (swiftCode !== undefined) updateData.swiftCode = swiftCode
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email

    const updatedBank = await prisma.bank.update({
      where: { id },
      data: updateData
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

