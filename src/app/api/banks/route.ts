import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const id = searchParams.get('id')

    if (id) {
      const bank = await prisma.bank.findUnique({
        where: { id },
        include: {
          deposits: {
            take: 5,
            orderBy: { depositDate: 'desc' }
          },
          cheques: {
            take: 5,
            orderBy: { receivedDate: 'desc' }
          }
        }
      })
      
      if (!bank) {
        return NextResponse.json({ error: 'Bank not found' }, { status: 404 })
      }
      return NextResponse.json(bank)
    }

    const where = active === 'true' ? { isActive: true } : {}
    const banks = await prisma.bank.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(banks)
  } catch (error) {
    console.error('Error fetching banks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { name, branch, accountNumber } = body
    
    if (!name) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      )
    }

    const newBank = await prisma.bank.create({
      data: {
        name,
        branch: branch || null,
        accountNumber: accountNumber || null,
        isActive: true
      }
    })

    return NextResponse.json(newBank, { status: 201 })
  } catch (error) {
    console.error('Error creating bank:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

