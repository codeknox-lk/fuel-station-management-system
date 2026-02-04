import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { getJwtSecret } from '@/lib/jwt'

const ACCESS_TOKEN_EXPIRE_MINUTES = 30

export async function POST(request: NextRequest) {
  try {
    interface LoginBody {
      username?: string
      password?: string
      rememberMe?: boolean
    }
    const body = await request.json() as LoginBody

    const { username, password } = body

    // Validate required fields
    if (!username || !password) {
      return NextResponse.json(
        { detail: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Find user in database
    console.log(`🔍 Looking up user: ${username}`)
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ User not found: ${username}`)
      // Check if any users exist in database
      const userCount = await prisma.user.count()
      console.log(`   Total users in database: ${userCount}`)
      if (userCount === 0) {
        console.log(`   ⚠️  WARNING: No users found in database!`)
        console.log(`   💡 Run seed script: npx prisma db seed`)
      }
      return NextResponse.json(
        { detail: 'Incorrect username or password' },
        { status: 401 }
      )
    }

    console.log(`✅ User found: ${user.username} (${user.role})`)
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`)
    console.log(`   Is active: ${user.isActive}`)

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { detail: 'User account is inactive' },
        { status: 403 }
      )
    }

    // Verify password
    let passwordValid = false

    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (user.password.startsWith('$2')) {
      // Password is hashed with bcrypt
      try {
        passwordValid = await bcrypt.compare(password, user.password)
        if (!passwordValid) {
          console.log(`❌ Password mismatch for user: ${username}`)
          console.log(`   Provided password length: ${password.length}`)
          console.log(`   Hash starts with: ${user.password.substring(0, 10)}...`)
        } else {
          console.log(`✅ Password verified for user: ${username}`)
        }
      } catch (error) {
        console.error('❌ Bcrypt compare error:', error)
        passwordValid = false
      }
    } else {
      // Password is plain text (temporary - for migration from old system)
      // In production, all passwords should be hashed
      console.log(`⚠️  Plain text password detected for user: ${username}`)
      passwordValid = password === user.password

      // If login successful with plain text, hash and update password
      if (passwordValid) {
        console.log(`✅ Plain text login successful, hashing password...`)
        const hashedPassword = await bcrypt.hash(password, 10)
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        })
        console.log(`✅ Password hashed and updated for user: ${username}`)
      } else {
        console.log(`❌ Plain text password mismatch for user: ${username}`)
      }
    }

    if (!passwordValid) {
      console.log(`Authentication failed for user: ${username}`)
      return NextResponse.json(
        { detail: 'Incorrect username or password' },
        { status: 401 }
      )
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        failedAttempts: 0 // Reset failed attempts on successful login
      }
    })

    // Create audit log for successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.username,
        userRole: user.role,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: `User ${user.username} logged in successfully`,
        stationId: user.stationId
      }
    })

    // Determine token expiration
    const { rememberMe } = body
    const tokenDuration = rememberMe
      ? 7 * 24 * 60 * 60 // 7 days in seconds
      : ACCESS_TOKEN_EXPIRE_MINUTES * 60 // 30 minutes in seconds

    // Create JWT token
    const accessToken = jwt.sign(
      {
        sub: user.username,
        userId: user.id,
        role: user.role
      },
      getJwtSecret(),
      { expiresIn: tokenDuration }
    )

    // Create response
    const response = NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      requireChangePassword: user.isFirstLogin,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        station_id: user.stationId || null,
        is_active: user.isActive
      }
    })

    // Set secure cookie
    response.cookies.set({
      name: 'accessToken',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenDuration // Uses the duration calculated from rememberMe
    })

    return response
  } catch (error) {
    console.error('❌ Login error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)

      // Check for database connection errors
      if (error.message.includes('Can\'t reach database') ||
        error.message.includes('P1001') ||
        error.message.includes('fetch failed')) {
        return NextResponse.json(
          { detail: 'Database connection failed. Please check if the database is running.' },
          { status: 503 }
        )
      }

      // Check for Prisma errors
      if (error.message.includes('prisma') || error.message.includes('Prisma')) {
        return NextResponse.json(
          { detail: 'Database error. Please try again later.' },
          { status: 500 }
        )
      }
    }

    // Generic error response
    return NextResponse.json(
      { detail: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

