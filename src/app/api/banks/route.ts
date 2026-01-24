import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      // OPTIMIZED: Use select instead of include
      const bank = await prisma.bank.findUnique({
        where: { id },
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

    // OPTIMIZED: Use select for faster query
    const where = active === 'true' ? { isActive: true } : {}
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
    interface BankBody {
      code?: string
      name?: string
      branch?: string
      accountNumber?: string
      accountName?: string
      swiftCode?: string
      contactPerson?: string
      phone?: string
      email?: string
      status?: string
    }
    const body = await request.json() as BankBody

    const { code, name, branch, accountNumber, accountName, swiftCode, contactPerson, phone, email, status } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      )
    }

    const newBank = await prisma.bank.create({
      data: {
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
    })

    return NextResponse.json(newBank, { status: 201 })
  } catch (error) {
    console.error('Error creating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

