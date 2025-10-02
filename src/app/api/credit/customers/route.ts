import { NextRequest, NextResponse } from 'next/server'
import { getCreditCustomers, getActiveCreditCustomers, getCreditCustomerById } from '@/data/credit.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const customer = getCreditCustomerById(id)
      if (!customer) {
        return NextResponse.json({ error: 'Credit customer not found' }, { status: 404 })
      }
      return NextResponse.json(customer)
    }

    if (active === 'true') {
      return NextResponse.json(getActiveCreditCustomers())
    }

    return NextResponse.json(getCreditCustomers())
  } catch (error) {
    console.error('Error fetching credit customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newCustomer = {
      id: Date.now().toString(),
      ...body,
      currentBalance: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error) {
    console.error('Error creating credit customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
