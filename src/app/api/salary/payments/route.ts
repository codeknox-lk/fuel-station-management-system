import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET: Get salary payment history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const pumperId = searchParams.get('pumperId')
    const month = searchParams.get('month') // Format: YYYY-MM

    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required' }, { status: 400 })
    }

    const where: Prisma.SalaryPaymentWhereInput = { stationId }
    if (pumperId) {
      where.pumperId = pumperId
    }
    if (month) {
      where.paymentMonth = month
    }

    const payments = await prisma.salaryPayment.findMany({
      where,
      include: {
        pumper: {
          select: {
            id: true,
            name: true,
            employeeId: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching salary payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Record a salary payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      stationId,
      pumperId,
      paymentMonth,
      baseSalary,
      varianceAdd,
      varianceDeduct,
      advances,
      loans,
      netSalary,
      paymentDate,
      paymentMethod,
      paymentReference,
      paidBy,
      notes,
      status
    } = body

    if (!stationId || !pumperId || !paymentMonth || netSalary === undefined || !paidBy) {
      return NextResponse.json(
        { error: 'Station ID, pumper ID, payment month, net salary, and paid by are required' },
        { status: 400 }
      )
    }

    // Check if payment already exists for this pumper and month
    // Use a transaction to prevent race conditions
    const existingPayment = await prisma.salaryPayment.findFirst({
      where: {
        stationId,
        pumperId,
        paymentMonth,
        status: 'PAID'
      }
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Salary payment already recorded and paid for this month' },
        { status: 400 }
      )
    }

    // Check for pending payment that can be updated
    const pendingPayment = await prisma.salaryPayment.findFirst({
      where: {
        stationId,
        pumperId,
        paymentMonth,
        status: { not: 'PAID' }
      }
    })

    let payment
    if (pendingPayment) {
      // Update existing pending payment
      payment = await prisma.salaryPayment.update({
        where: { id: pendingPayment.id },
        data: {
          baseSalary: baseSalary || 0,
          varianceAdd: varianceAdd || 0,
          varianceDeduct: varianceDeduct || 0,
          advances: advances || 0,
          loans: loans || 0,
          netSalary: parseFloat(netSalary),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || 'CASH',
          paymentReference: paymentReference || null,
          paidBy,
          notes: notes || null,
          status: status || 'PAID'
        }
      })
    } else {
      // Create new payment
      payment = await prisma.salaryPayment.create({
        data: {
          stationId,
          pumperId,
          paymentMonth,
          baseSalary: baseSalary || 0,
          varianceAdd: varianceAdd || 0,
          varianceDeduct: varianceDeduct || 0,
          advances: advances || 0,
          loans: loans || 0,
          netSalary: parseFloat(netSalary),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: paymentMethod || 'CASH',
          paymentReference: paymentReference || null,
          paidBy,
          notes: notes || null,
          status: status || 'PAID'
        }
      })
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error recording salary payment:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

