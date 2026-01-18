import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt, { JwtPayload } from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production'

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
      decoded = jwt.verify(token, SECRET_KEY) as JwtPayload
    } catch (error) {
      return NextResponse.json(
        { detail: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return NextResponse.json(
        { detail: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { detail: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

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

    // Verify current password
    let passwordValid = false
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (user.password.startsWith('$2')) {
      // Password is hashed with bcrypt
      try {
        passwordValid = await bcrypt.compare(current_password, user.password)
      } catch (error) {
        console.error('Bcrypt compare error:', error)
        passwordValid = false
      }
    } else {
      // Password is plain text (for migration purposes)
      passwordValid = current_password === user.password
    }

    if (!passwordValid) {
      return NextResponse.json(
        { detail: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10)

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      detail: 'Password updated successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

