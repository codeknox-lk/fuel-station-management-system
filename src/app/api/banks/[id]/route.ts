import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { UpdateBankSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const bank = await prisma.bank.findFirst({
      where: { id, organizationId: user.organizationId },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const bank = await prisma.bank.findFirst({
      where: { id, organizationId: user.organizationId }
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
      where: { id_organizationId: { id, organizationId: user.organizationId } },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const bank = await prisma.bank.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
    }

    // Check for dependencies
    const hasDeposits = await prisma.deposit.count({ where: { bankId: id, organizationId: user.organizationId } }) > 0
    const hasCheques = await prisma.cheque.count({ where: { bankId: id, organizationId: user.organizationId } }) > 0
    const hasCreditPayments = await prisma.creditPayment.count({ where: { bankId: id, organizationId: user.organizationId } }) > 0

    if (hasDeposits || hasCheques || hasCreditPayments) {
      return NextResponse.json({
        error: 'Cannot delete bank with existing deposits, cheques, or credit payments'
      }, { status: 400 })
    }

    await prisma.bank.delete({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    return NextResponse.json({ success: true, message: 'Bank deleted successfully' })
  } catch (error) {
    console.error('Error deleting bank:', error)
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 })
  }
}

