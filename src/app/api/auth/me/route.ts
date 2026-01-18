import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt, { JwtPayload } from 'jsonwebtoken'

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { detail: 'Authorization header missing or invalid' },
        { status: 401 }
      )
    }

    // Extract token
    const token = authHeader.substring(7)

    // Verify token
    let decoded: JwtPayload | string
    try {
      decoded = jwt.verify(token, SECRET_KEY) as JwtPayload
    } catch (error) {
      return NextResponse.json(
        { detail: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { username: decoded.sub as string },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { detail: 'User account is inactive' },
        { status: 403 }
      )
    }

    // Return user data
    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      station_id: user.stationId || null,
      is_active: user.isActive,
      station: user.station
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

