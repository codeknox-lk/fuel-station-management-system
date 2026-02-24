import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateBankSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      // OPTIMIZED: Use select instead of include
      const bank = await prisma.bank.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        select: {
          id: true,
          code: true,
          name: true,
          branch: true,
          accountNumber: true,
          accountName: true,
          swiftCode: true,
          contactPerson: true,
          phone: true,
          email: true,
          currentBalance: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          deposits: {
            take: 5,
            select: {
              depositSlip: true,
              depositedBy: true,
              depositDate: true
            },
            orderBy: { depositDate: 'desc' }
          },
          cheques: {
            take: 5,
            select: {
              id: true,
              chequeNumber: true,
              amount: true,
              receivedDate: true,
              status: true
            },
            orderBy: { receivedDate: 'desc' }
          }
        }
      })

      if (!bank) {
        return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
      }
      return NextResponse.json(bank)
    }

    // Filter by Organization
    const where: Prisma.BankWhereInput = {
      organizationId: user.organizationId,
      ...(active === 'true' ? { isActive: true } : {})
    }

    const banks = await prisma.bank.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        branch: true,
        accountNumber: true,
        accountName: true,
        swiftCode: true,
        contactPerson: true,
        phone: true,
        email: true,
        currentBalance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(banks)
  } catch (error) {
    console.error('Error fetching banks:', error)
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

    // Zod Validation
    const result = CreateBankSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { code, name, branch, accountNumber, accountName, swiftCode, contactPerson, phone, email, status } = result.data

    // Use Prisma.BankUncheckedCreateInput to correctly type the input including organizationId
    const bankData: Prisma.BankUncheckedCreateInput = {
      organizationId: user.organizationId,
      code: code || null,
      name,
      branch: branch || null,
      accountNumber: accountNumber || null,
      accountName: accountName || null,
      swiftCode: swiftCode || null,
      contactPerson: contactPerson || null,
      phone: phone || null,
      email: email || null,
      isActive: status === 'active'
    }

    const newBank = await prisma.bank.create({
      data: bankData
    })

    return NextResponse.json(newBank, { status: 201 })
  } catch (error) {
    console.error('Error creating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

