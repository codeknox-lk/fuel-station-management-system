import { NextRequest, NextResponse } from 'next/server'
import { getMeterAudits, getMeterAuditsByShiftId, getMeterAuditById } from '@/data/shifts.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')

    if (id) {
      const audit = getMeterAuditById(id)
      if (!audit) {
        return NextResponse.json({ error: 'Meter audit not found' }, { status: 404 })
      }
      return NextResponse.json(audit)
    }

    if (shiftId) {
      return NextResponse.json(getMeterAuditsByShiftId(shiftId))
    }

    return NextResponse.json(getMeterAudits())
  } catch (error) {
    console.error('Error fetching meter audits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newAudit = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newAudit, { status: 201 })
  } catch (error) {
    console.error('Error creating meter audit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

