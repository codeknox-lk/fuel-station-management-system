import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt, { JwtPayload } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { getJwtSecret } from '@/lib/jwt'

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
      decoded = jwt.verify(token, getJwtSecret()) as JwtPayload
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
    console.error('Get profile error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
      decoded = jwt.verify(token, getJwtSecret()) as JwtPayload
    } catch (error) {
      return NextResponse.json(
        { detail: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { username } = body

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { username: decoded.sub as string }
    })

    if (!user) {
      return NextResponse.json(
        { detail: 'User not found' },
        { status: 404 }
      )
    }

    // Check if new username is provided and different
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUser) {
        return NextResponse.json(
          { detail: 'Username already taken' },
          { status: 400 }
        )
      }

      // Update username
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { username },
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

      return NextResponse.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        station_id: updatedUser.stationId || null,
        is_active: updatedUser.isActive,
        station: updatedUser.station
      })
    }

    // Return current user data if no update needed
    const userWithStation = await prisma.user.findUnique({
      where: { id: user.id },
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

    return NextResponse.json({
      id: userWithStation!.id,
      username: userWithStation!.username,
      email: userWithStation!.email,
      role: userWithStation!.role,
      station_id: userWithStation!.stationId || null,
      is_active: userWithStation!.isActive,
      station: userWithStation!.station
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

