import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      const loan = await prisma.loanPumper.findUnique({
        where: { id },
        include: {
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!loan) {
        return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
      }
      return NextResponse.json(loan)
    }

    const pumperName = searchParams.get('pumperName')
    
    const where: any = {}
    if (stationId) {
      where.stationId = stationId
    }
    if (status) {
      where.status = status
    }
    if (pumperName) {
      // Case-insensitive match for pumper name using Prisma's case-insensitive filter
      // Note: This works with PostgreSQL. For other databases, might need different approach
      where.pumperName = {
        equals: pumperName,
        mode: 'insensitive'
      }
    }

    const loans = await prisma.loanPumper.findMany({
      where,
      select: {
        id: true,
        pumperName: true,
        amount: true,
        paidAmount: true,
        monthlyRental: true,
        reason: true,
        givenBy: true,
        dueDate: true,
        status: true,
        createdAt: true,
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Error fetching pumper loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { stationId, pumperName, amount, monthlyRental, reason, dueDate, fromSafe, givenBy } = body
    
    if (!stationId || !pumperName || !amount || !reason || !dueDate) {
      return NextResponse.json(
        { error: 'Station ID, pumper name, amount, reason, and due date are required' },
        { status: 400 }
      )
    }

    const newLoan = await prisma.loanPumper.create({
      data: {
        stationId,
        pumperName,
        amount: parseFloat(amount),
        monthlyRental: monthlyRental !== undefined && monthlyRental !== null ? parseFloat(monthlyRental) : 0,
        reason,
        givenBy: givenBy || null,
        dueDate: new Date(dueDate),
        status: 'ACTIVE'
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Deduct from safe if fromSafe is true
    if (fromSafe && parseFloat(amount) > 0) {
      try {
        // Get or create safe
        let safe = await prisma.safe.findUnique({
          where: { stationId }
        })

        if (!safe) {
          safe = await prisma.safe.create({
            data: {
              stationId,
              openingBalance: 0,
              currentBalance: 0
            }
          })
        }

        // Calculate balance before transaction chronologically
        const loanTimestamp = new Date(dueDate) // Use loan date
        const allTransactions = await prisma.safeTransaction.findMany({
          where: { 
            safeId: safe.id,
            timestamp: { lte: loanTimestamp }
          },
          orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }]
        })

        // Calculate balance before transaction chronologically
        // OPENING_BALANCE transactions set the balance, they don't add/subtract
        let balanceBefore = safe.openingBalance
        for (const tx of allTransactions) {
          if (tx.type === 'OPENING_BALANCE') {
            balanceBefore = tx.amount
          } else {
            const isIncome = [
              'CASH_FUEL_SALES',
              'POS_CARD_PAYMENT',
              'CREDIT_PAYMENT',
              'CHEQUE_RECEIVED',
              'LOAN_REPAID'
            ].includes(tx.type)
            balanceBefore += isIncome ? tx.amount : -tx.amount
          }
        }

        const balanceAfter = balanceBefore - parseFloat(amount)

        // Create safe transaction
        await prisma.safeTransaction.create({
          data: {
            safeId: safe.id,
            type: 'LOAN_GIVEN',
            amount: parseFloat(amount),
            balanceBefore,
            balanceAfter,
            loanId: newLoan.id,
            description: `Pumper loan given: ${pumperName} - ${reason}`,
            performedBy: 'System',
            timestamp: loanTimestamp
          }
        })

        // Update safe balance
        await prisma.safe.update({
          where: { id: safe.id },
          data: { currentBalance: balanceAfter }
        })
      } catch (safeError) {
        console.error('Error deducting loan from safe:', safeError)
        // Don't fail loan creation if safe transaction fails
      }
    }

    return NextResponse.json(newLoan, { status: 201 })
  } catch (error) {
    console.error('Error creating pumper loan:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

