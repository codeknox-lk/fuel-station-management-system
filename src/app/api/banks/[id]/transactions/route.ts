import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // 1. Deposits
    const deposits = (!type || type === 'all' || type === 'deposit')
      ? await prisma.deposit.findMany({
        where: {
          bankId,
          organizationId: user.organizationId,
          ...(stationId && { stationId }),
          ...(dateFilter && { depositDate: dateFilter })
        },
        select: {
          id: true,
          amount: true,
          depositDate: true,
          depositSlip: true,
          depositedBy: true,
          bankId: true,
          stationId: true,
          accountId: true,
          createdAt: true,
          updatedAt: true,
          station: { select: { name: true } }
        },
        orderBy: { depositDate: 'desc' }
      })
      : []

    // 2. Cheques (received/deposited)
    const cheques = (!type || type === 'all' || type === 'cheque' || type === 'credit_payment')
      ? await prisma.cheque.findMany({
        where: {
          bankId,
          organizationId: user.organizationId,
          // Only fetch if linked to credit payment when type is credit_payment
          ...(type === 'credit_payment' ? { creditPaymentId: { not: null } } : {}),
          ...(dateFilter && {
            OR: [
              { receivedDate: dateFilter },
              { depositDate: dateFilter },
              { clearedDate: dateFilter }
            ]
          })
        },
        include: {
          station: { select: { name: true } },
          creditPayment: {
            include: { customer: true }
          }
        },
        orderBy: { receivedDate: 'desc' }
      })
      : []

    // 3. Credit payments
    const creditPayments = (!type || type === 'all' || type === 'credit_payment')
      ? await prisma.creditPayment.findMany({
        where: {
          bankId,
          organizationId: user.organizationId,
          paymentType: { not: 'CHEQUE' }, // Exclude cheques as they are handled separately
          ...(dateFilter && { paymentDate: dateFilter })
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          paymentType: true,
          referenceNumber: true,
          chequeNumber: true,
          receivedBy: true,
          bankId: true,
          customerId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: { select: { name: true } }
        },
        orderBy: { paymentDate: 'desc' }
      })
      : []

    // 4. Manual bank transactions
    const bankTransactions = await prisma.bankTransaction.findMany({
      where: {
        bankId,
        organizationId: user.organizationId,
        ...(stationId && { stationId }),
        ...(dateFilter && { transactionDate: dateFilter })
      },
      include: {
        station: { select: { name: true } }
      },
      orderBy: { transactionDate: 'desc' }
    })

    // Combine and format all transactions
    const mappedDeposits = deposits.map((d: any) => ({
      id: d.id,
      date: d.depositDate,
      type: 'DEPOSIT',
      amount: d.amount,
      reference: d.depositSlip || 'N/A',
      details: `Deposit from ${d.station?.name || 'Station'}`,
      status: 'COMPLETED'
    }))
    const mappedCheques = cheques.map((c: any) => ({
      id: c.id,
      date: c.depositDate || c.createdAt,
      type: 'CHEQUE',
      amount: c.amount,
      reference: c.chequeNumber,
      details: `Cheque Deposit - ${c.station?.name || 'Station'}`,
      status: c.status
    }))
    const mappedCreditPayments = creditPayments.map((cp: any) => ({
      id: cp.id,
      date: cp.paymentDate,
      type: 'CREDIT_PAYMENT',
      amount: cp.amount,
      reference: cp.referenceNumber || cp.chequeNumber || 'N/A',
      details: `Credit Payment - ${cp.customer?.name || 'Customer'}`,
      status: cp.status
    }))
    const mappedBankTransactions = bankTransactions.map((bt: any) => ({
      id: bt.id,
      date: bt.createdAt,
      type: bt.type,
      amount: bt.amount,
      reference: bt.description,
      details: bt.type === 'TRANSFER' ? 'Bank Transfer' : (bt.station?.name || 'Direct Transaction'),
      status: 'COMPLETED'
    }))

    const allTransactions = [
      ...mappedDeposits,
      ...mappedCheques,
      ...mappedCreditPayments,
      ...mappedBankTransactions
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
      pendingCheques: cheques.filter(c => ['PENDING', 'DEPOSITED'].includes(c.status)).reduce((sum, c) => sum + c.amount, 0),
      bouncedCheques: cheques.filter(c => c.status === 'BOUNCED').reduce((sum, c) => sum + c.amount, 0),
      totalCreditPayments: creditPayments.reduce((sum, cp) => sum + cp.amount, 0),
      manualDeposits: bankTransactions.filter(bt => ['DEPOSIT', 'TRANSFER_IN', 'INTEREST', 'ADJUSTMENT'].includes(bt.type)).reduce((sum, bt) => sum + bt.amount, 0),
      manualWithdrawals: bankTransactions.filter(bt => ['WITHDRAWAL', 'TRANSFER_OUT', 'FEE'].includes(bt.type)).reduce((sum, bt) => sum + bt.amount, 0),
      transactionCount: transactions.length
    }

    return NextResponse.json({ transactions, summary })
  } catch (error) {
    console.error('Error fetching bank transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
