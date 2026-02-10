import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
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
      const customer = await prisma.creditCustomer.findFirst({
        where: {
          id,
          organizationId: user.organizationId
        },
        include: {
          creditSales: {
            take: 10,
            orderBy: { timestamp: 'desc' }
          },
          creditPayments: {
            take: 10,
            orderBy: { paymentDate: 'desc' }
          }
        }
      })

      if (!customer) {
        return NextResponse.json({ error: 'Credit customer not found' }, { status: 404 })
      }
      return NextResponse.json(customer)
    }

    // Filter by Organization
    const where: Prisma.CreditCustomerWhereInput = {
      organizationId: user.organizationId,
      ...(active === 'true' ? { isActive: true } : {})
    }

    const customers = await prisma.creditCustomer.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching credit customers:', error)
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
    const { name, company, address, phone, email, creditLimit } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    const newCustomer = await prisma.creditCustomer.create({
      data: {
        organizationId: user.organizationId,
        name,
        company: company || null,
        address: address || '',
        phone,
        email,
        creditLimit: parseFloat(creditLimit),
        currentBalance: 0,
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    })

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error) {
    console.error('Error creating credit customer:', error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

