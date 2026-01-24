import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { safeParseFloat, validateAmount, validateRequired, validateDate } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const bankId = searchParams.get('bankId')

    if (id) {
      const deposit = await prisma.deposit.findUnique({
        where: { id },
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          },
          bank: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      if (!deposit) {
        return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
      }
      return NextResponse.json(deposit)
    }

    interface DepositWhereInput {
      stationId?: string
      bankId?: string
      depositDate?: {
        gte: Date
        lte: Date
      }
    }
    const where: DepositWhereInput = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (bankId) {
      where.bankId = bankId
    }
    if (startDate && endDate) {
      where.depositDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const deposits = await prisma.deposit.findMany({
      where,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        bank: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { depositDate: 'desc' }
    })

    return NextResponse.json(deposits)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface DepositBody {
      stationId?: string
      amount?: string | number
      bankId?: string
      accountId?: string
      depositSlip?: string
      depositedBy?: string
      depositDate?: string | Date
    }
    const body = await request.json() as DepositBody

    const { stationId, amount, bankId, accountId, depositSlip, depositedBy, depositDate } = body

    // Validate required fields
    const errors: string[] = []
    if (validateRequired(stationId, 'Station ID')) errors.push(validateRequired(stationId, 'Station ID')!)
    if (validateRequired(bankId, 'Bank ID')) errors.push(validateRequired(bankId, 'Bank ID')!)
    if (validateRequired(accountId, 'Account ID')) errors.push(validateRequired(accountId, 'Account ID')!)
    if (validateRequired(depositedBy, 'Deposited by')) errors.push(validateRequired(depositedBy, 'Deposited by')!)
    if (validateDate(String(depositDate), 'Deposit date')) errors.push(validateDate(String(depositDate), 'Deposit date')!)

    // Validate amount
    const amountError = validateAmount(amount, 'Amount')
    if (amountError) errors.push(amountError)

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      )
    }

    const validatedAmount = safeParseFloat(amount)

    // Create deposit and deduct from safe in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.create({
        data: {
          stationId: stationId!,
          amount: validatedAmount,
          bankId: bankId!,
          accountId: accountId!,
          depositSlip: depositSlip || null,
          depositedBy: depositedBy!,
          depositDate: new Date(depositDate!)
        },
        include: {
          station: {
            select: { id: true, name: true }
          },
          bank: {
            select: { id: true, name: true }
          }
        }
      })

      // Deduct from safe
      let safe = await tx.safe.findUnique({
        where: { stationId }
      })

      if (!safe) {
        safe = await tx.safe.create({
          data: {
            stationId: stationId!,
            openingBalance: 0,
            currentBalance: 0
          }
        })
      }

      // Calculate balance before transaction chronologically
      const depositTimestamp = new Date(depositDate!)
      const allTransactions = await tx.safeTransaction.findMany({
        where: {
          safeId: safe.id,
          timestamp: { lte: depositTimestamp }
        },
        orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
      })

      // Calculate balance before transaction chronologically
      // OPENING_BALANCE transactions set the balance, they don't add/subtract
      let balanceBefore = safe.openingBalance
      for (const safeTx of allTransactions) {
        if (safeTx.type === 'OPENING_BALANCE') {
          balanceBefore = safeTx.amount
        } else {
          const txIsIncome = [
            'CASH_FUEL_SALES',
            'POS_CARD_PAYMENT',
            'CREDIT_PAYMENT',
            'CHEQUE_RECEIVED',
            'LOAN_REPAID'
          ].includes(safeTx.type)
          balanceBefore += txIsIncome ? safeTx.amount : -safeTx.amount
        }
      }

      const balanceAfter = balanceBefore - validatedAmount

      // Create safe transaction
      await tx.safeTransaction.create({
        data: {
          safeId: safe.id,
          type: 'BANK_DEPOSIT',
          amount: validatedAmount,
          balanceBefore,
          balanceAfter,
          depositId: deposit.id,
          description: `Bank deposit - ${(deposit as any).bank.name} (${accountId})${depositSlip ? ` - Slip: ${depositSlip}` : ''}`,
          performedBy: depositedBy!,
          timestamp: depositTimestamp
        }
      })

      // Update safe balance
      await tx.safe.update({
        where: { id: safe.id },
        data: { currentBalance: balanceAfter }
      })

      // Create bank transaction record for tracking in bank accounts page
      await tx.bankTransaction.create({
        data: {
          bankId: bankId!,
          stationId: stationId!,
          type: 'DEPOSIT',
          amount: validatedAmount,
          description: `Cash deposit from safe - Deposited by ${depositedBy}${depositSlip ? ` - Slip: ${depositSlip}` : ''}`,
          referenceNumber: depositSlip || null,
          transactionDate: depositTimestamp,
          createdBy: depositedBy!,
          notes: `Bank deposit recorded via deposits page`
        }
      })

      return deposit
    })

    // Create audit log for deposit
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          userName: depositedBy!,
          userRole: 'MANAGER',
          action: 'CREATE',
          entity: 'Deposit',
          entityId: result.id,
          details: `Deposited Rs. ${validatedAmount.toLocaleString()} to ${(result as any).bank.name}`,
          stationId: stationId!
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating deposit:', error)

    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station or bank ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

