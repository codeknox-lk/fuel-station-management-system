import { NextRequest, NextResponse } from 'next/server'
import { getTestPours, getTestPoursByShiftId, getTestPourById } from '@/data/shifts.seed'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')

    if (id) {
      const test = getTestPourById(id)
      if (!test) {
        return NextResponse.json({ error: 'Test pour not found' }, { status: 404 })
      }
      return NextResponse.json(test)
    }

    if (shiftId) {
      return NextResponse.json(getTestPoursByShiftId(shiftId))
    }

    return NextResponse.json(getTestPours())
  } catch (error) {
    console.error('Error fetching test pours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would validate and save to database
    const newTest = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(newTest, { status: 201 })
  } catch (error) {
    console.error('Error creating test pour:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

