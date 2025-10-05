import { NextRequest, NextResponse } from 'next/server'
import { getCreditPayments, getCreditPaymentsByCustomerId, getCreditPaymentById } from '@/data/credit.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const id = searchParams.get('id')

    if (id) {
      const payment = getCreditPaymentById(id)
      if (!payment) {
        return NextResponse.json({ error: 'Credit payment not found' }, { status: 404 })
      }
      return NextResponse.json(payment)
    }

    if (customerId) {
      return NextResponse.json(getCreditPaymentsByCustomerId(customerId))
    }

    return NextResponse.json(getCreditPayments())
  } catch (error) {
    console.error('Error fetching credit payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newPayment = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newPayment, { status: 201 })
  } catch (error) {
    console.error('Error creating credit payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

