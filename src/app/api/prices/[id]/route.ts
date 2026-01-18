import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const price = await prisma.price.findUnique({
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
    
    if (!price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    return NextResponse.json(price)
  } catch (error) {
    console.error('Error fetching price:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const price = await prisma.price.findUnique({
      where: { id }
    })
    
    if (!price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    const { price: priceValue, effectiveDate, isActive } = body
    
    const updatedPrice = await prisma.price.update({
      where: { id },
      data: {
        ...(priceValue !== undefined && { price: parseFloat(priceValue) }),
        ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
        ...(isActive !== undefined && { isActive })
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

    return NextResponse.json(updatedPrice)
  } catch (error) {
    console.error('Error updating price:', error)
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const price = await prisma.price.findUnique({
      where: { id }
    })
    
    if (!price) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    await prisma.price.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Price deleted successfully' })
  } catch (error) {
    console.error('Error deleting price:', error)
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 })
  }
}

