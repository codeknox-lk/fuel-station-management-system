import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const current = searchParams.get('current')
    const fuelId = searchParams.get('fuelId')
    const fuelType = searchParams.get('fuelType')
    const datetime = searchParams.get('datetime')
    const stationId = searchParams.get('stationId')

    if (fuelId || fuelType) {
      const where: Prisma.PriceWhereInput = {
        isActive: true,
        organizationId: user.organizationId
      }

      if (fuelId) {
        where.fuelId = fuelId
      } else if (fuelType) {
        where.fuel = { name: fuelType, organizationId: user.organizationId }
      }

      if (stationId) {
        where.stationId = stationId
      }

      if (datetime) {
        where.effectiveDate = { lte: new Date(datetime) }
        const price = await prisma.price.findFirst({
          where,
          orderBy: { effectiveDate: 'desc' },
          include: {
            station: { select: { id: true, name: true } },
            fuel: true
          }
        })

        if (!price) {
          return NextResponse.json({ error: 'Price not found for the given date/time' }, { status: 404 })
        }
        return NextResponse.json(price)
      }

      const price = await prisma.price.findFirst({
        where: {
          ...where,
          effectiveDate: { lte: new Date() }
        },
        orderBy: { effectiveDate: 'desc' },
        include: {
          station: { select: { id: true, name: true } },
          fuel: true
        }
      })

      if (!price) {
        return NextResponse.json({ error: 'Current price not found for fuel type' }, { status: 404 })
      }
      return NextResponse.json(price)
    }

    if (current === 'true') {
      const prices = await prisma.price.findMany({
        where: {
          isActive: true,
          organizationId: user.organizationId,
          effectiveDate: { lte: new Date() },
          ...(stationId ? { stationId } : {})
        },
        orderBy: [
          { stationId: 'asc' },
          { fuelId: 'asc' },
          { effectiveDate: 'desc' }
        ],
        include: {
          station: { select: { id: true, name: true } },
          fuel: true
        }
      })
      return NextResponse.json(prices)
    }

    const where: Prisma.PriceWhereInput = {
      organizationId: user.organizationId
    }
    if (stationId) {
      where.stationId = stationId
    }

    const prices = await prisma.price.findMany({
      where,
      include: {
        station: { select: { id: true, name: true } },
        fuel: true
      },
      orderBy: [
        { stationId: 'asc' },
        { fuelId: 'asc' },
        { effectiveDate: 'desc' }
      ]
    })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stationId, fuelId, price, effectiveDate } = body

    if (!stationId || !fuelId || price === undefined || !effectiveDate) {
      return NextResponse.json(
        { error: 'Station ID, fuel ID, price, and effective date are required' },
        { status: 400 }
      )
    }

    const updatedBy = user.username

    const newPrice = await prisma.price.create({
      data: {
        stationId,
        fuelId,
        price: parseFloat(price),
        effectiveDate: new Date(effectiveDate),
        isActive: true,
        updatedBy,
        organizationId: user.organizationId
      },
      include: {
        station: { select: { id: true, name: true } },
        fuel: true
      }
    })

    return NextResponse.json(newPrice, { status: 201 })
  } catch (error) {
    console.error('Error creating price:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
