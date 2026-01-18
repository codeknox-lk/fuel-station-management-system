import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    const stationId = searchParams.get('stationId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build filters
    const where: any = {}
    
    if (bankId) where.bankId = bankId
    if (stationId) where.stationId = stationId
    if (type) where.type = type
    
    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        bank: { select: { name: true } },
        station: { select: { name: true } }
      },
      orderBy: { transactionDate: 'desc' }
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bankId,
      stationId,
      type,
      amount,
      description,
      referenceNumber,
      transactionDate,
      createdBy,
      notes
    } = body

    // Validation
    if (!bankId || !type || !amount || !description || !transactionDate || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Check if bank exists
    const bank = await prisma.bank.findUnique({
      where: { id: bankId }
    })

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      )
    }

    // Create transaction
    const transaction = await prisma.bankTransaction.create({
      data: {
        bankId,
        stationId: stationId || null,
        type,
        amount: parseFloat(amount),
        description,
        referenceNumber: referenceNumber || null,
        transactionDate: new Date(transactionDate),
        createdBy,
        notes: notes || null
      },
      include: {
        bank: { select: { name: true } },
        station: { select: { name: true } }
      }
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating bank transaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
