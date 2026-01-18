import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bankId } = await params
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const type = searchParams.get('type') // 'all', 'deposit', 'cheque', 'credit_payment'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter = (startDate && endDate) ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined

    // Fetch deposits
    const deposits = (!type || type === 'all' || type === 'deposit') 
      ? await prisma.deposit.findMany({
          where: {
            bankId,
            ...(stationId && { stationId }),
            ...(dateFilter && { depositDate: dateFilter })
          },
          include: {
            station: { select: { name: true } }
          },
          orderBy: { depositDate: 'desc' }
        })
      : []

    // Fetch cheques
    const cheques = (!type || type === 'all' || type === 'cheque')
      ? await prisma.cheque.findMany({
          where: {
            bankId,
            ...(stationId && { stationId }),
            ...(dateFilter && { receivedDate: dateFilter })
          },
          include: {
            station: { select: { name: true } }
          },
          orderBy: { receivedDate: 'desc' }
        })
      : []

    // Fetch credit payments
    const creditPayments = (!type || type === 'all' || type === 'credit_payment')
      ? await prisma.creditPayment.findMany({
          where: {
            bankId,
            ...(dateFilter && { paymentDate: dateFilter })
          },
          include: {
            customer: { select: { name: true } }
          },
          orderBy: { paymentDate: 'desc' }
        })
      : []

    // Combine and format all transactions
    const allTransactions = [
      ...deposits.map(d => ({
        id: d.id,
        type: 'DEPOSIT' as const,
        amount: d.amount,
        date: d.depositDate,
        station: d.station.name,
        description: `Deposit by ${d.depositedBy}`,
        depositSlip: d.depositSlip,
        depositedBy: d.depositedBy,
        accountId: d.accountId,
        createdAt: d.createdAt
      })),
      ...cheques.map(c => ({
        id: c.id,
        type: 'CHEQUE' as const,
        amount: c.amount,
        date: c.receivedDate,
        station: c.station.name,
        status: c.status,
        description: `Cheque ${c.chequeNumber} from ${c.receivedFrom}`,
        chequeNumber: c.chequeNumber,
        receivedFrom: c.receivedFrom,
        clearedDate: c.clearedDate,
        notes: c.notes,
        createdAt: c.createdAt
      })),
      ...creditPayments.map(cp => ({
        id: cp.id,
        type: 'CREDIT_PAYMENT' as const,
        amount: cp.amount,
        date: cp.paymentDate,
        station: 'N/A', // CreditPayment doesn't have stationId
        description: `Credit payment from ${cp.customer.name}`,
        customer: cp.customer.name,
        chequeNumber: cp.chequeNumber,
        notes: cp.notes || undefined,
        createdAt: cp.createdAt
      }))
    ]

    // Sort by date descending
    const transactions = allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate summary
    const summary = {
      totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
      totalCheques: cheques.reduce((sum, c) => sum + c.amount, 0),
      clearedCheques: cheques.filter(c => c.status === 'CLEARED').reduce((sum, c) => sum + c.amount, 0),
      pendingCheques: cheques.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      bouncedCheques: cheques.filter(c => c.status === 'BOUNCED').reduce((sum, c) => sum + c.amount, 0),
      totalCreditPayments: creditPayments.reduce((sum, cp) => sum + cp.amount, 0),
      transactionCount: transactions.length
    }

    return NextResponse.json({ transactions, summary })
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
