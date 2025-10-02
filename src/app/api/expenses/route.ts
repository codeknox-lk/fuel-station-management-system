import { NextRequest, NextResponse } from 'next/server'
import { getExpenses, getExpensesByStationId, getExpenseById } from '@/data/financial.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const id = searchParams.get('id')

    if (id) {
      const expense = getExpenseById(id)
      if (!expense) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }
      return NextResponse.json(expense)
    }

    if (stationId) {
      return NextResponse.json(getExpensesByStationId(stationId))
    }

    return NextResponse.json(getExpenses())
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newExpense = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Log the expense creation
    await auditOperations.expenseRecorded(request, newExpense.id, body.amount, body.category, body.stationId)

    return NextResponse.json(newExpense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
