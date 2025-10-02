import { NextRequest, NextResponse } from 'next/server'
import { getBanks, getBankById, getActiveBanks, getBankAccounts, getBankAccountsByBankId } from '@/data/banks.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')
    const accounts = searchParams.get('accounts')
    const bankId = searchParams.get('bankId')

    if (id) {
      const bank = getBankById(id)
      if (!bank) {
        return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
      }
      return NextResponse.json(bank)
    }

    if (accounts === 'true') {
      if (bankId) {
        return NextResponse.json(getBankAccountsByBankId(bankId))
      }
      return NextResponse.json(getBankAccounts())
    }

    if (active === 'true') {
      return NextResponse.json(getActiveBanks())
    }

    return NextResponse.json(getBanks())
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newBank = {
      id: Date.now().toString(),
      ...body,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newBank, { status: 201 })
  } catch (error) {
    console.error('Error creating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
