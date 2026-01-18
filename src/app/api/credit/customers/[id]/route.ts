import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const customer = await prisma.creditCustomer.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Error fetching credit customer:', error)
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
    
    const { name, company, address, phone, email, creditLimit, status } = body
    
    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Check if customer exists
    const existingCustomer = await prisma.creditCustomer.findUnique({
      where: { id }
    })
    
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Credit customer not found' },
        { status: 404 }
      )
    }

    // Update customer
    const updatedCustomer = await prisma.creditCustomer.update({
      where: { id },
      data: {
        name,
        company: company || null,
        address: address || '',
        phone,
        email: email || null,
        creditLimit: creditLimit || 0,
        isActive: status === 'ACTIVE' || status === undefined ? true : false
      }
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error('Error updating credit customer:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if customer exists
    const existingCustomer = await prisma.creditCustomer.findUnique({
      where: { id }
    })
    
    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Credit customer not found' },
        { status: 404 }
      )
    }

    // Check if customer has any sales or payments
    const salesCount = await prisma.creditSale.count({
      where: { customerId: id }
    })
    
    const paymentsCount = await prisma.creditPayment.count({
      where: { customerId: id }
    })
    
    if (salesCount > 0 || paymentsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing credit sales or payments' },
        { status: 400 }
      )
    }

    // Delete customer
    await prisma.creditCustomer.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting credit customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
