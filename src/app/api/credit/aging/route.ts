import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock aging data - in real app this would fetch from database
    const agingData = [
      {
        customerId: 'customer-1',
        customerName: 'ABC Company Ltd',
        nicOrBrn: '123456789V',
        creditLimit: 100000,
        totalOutstanding: 25000,
        current: 15000,
        days31to60: 5000,
        days61to90: 3000,
        over90Days: 2000,
        oldestInvoiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        daysPastDue: 45,
        riskLevel: 'MEDIUM' as const,
        lastPaymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastPaymentAmount: 5000
      }
    ]

    return NextResponse.json(agingData)
  } catch (error) {
    console.error('Error fetching aging data:', error)
    return NextResponse.json({ error: 'Failed to fetch aging data' }, { status: 500 })
  }
}
