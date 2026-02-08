import { NextRequest, NextResponse } from 'next/server'
import { Prisma, BankTransactionType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { CreateBankTransactionSchema } from '@/lib/schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    const stationId = searchParams.get('stationId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build filters
    const where: Prisma.BankTransactionWhereInput = {}

    if (bankId) where.bankId = bankId
    if (stationId) where.stationId = stationId
    if (type) where.type = type as Prisma.EnumBankTransactionTypeFilter<"BankTransaction">

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

    // Zod Validation
    const result = CreateBankTransactionSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

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
    } = result.data

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
        type: type as BankTransactionType,
        amount: amount,
        description,
        referenceNumber: referenceNumber || null,
        transactionDate: transactionDate,
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
