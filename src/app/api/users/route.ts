import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        stationId: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        station: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to frontend format
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      stationId: user.stationId,
      stationName: user.station?.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    interface UserBody {
      name?: string
      username?: string
      email?: string
      password?: string
      role?: string
      stationId?: string
      status?: string
    }
    const body = await request.json() as UserBody
    const { name, username, email, password, role, stationId, status } = body

    // Validation
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Username, email, password, and role are required' },
        { status: 400 }
      )
    }

    // Check for duplicate username or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim() }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this username or email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: (role as any) || 'MANAGER',
        stationId: stationId || null,
        isActive: status === 'active' || status === undefined ? true : false
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        stationId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Format response
    const formattedUser = {
      id: newUser.id,
      name: newUser.username,
      email: newUser.email,
      role: newUser.role,
      status: newUser.isActive ? 'active' : 'inactive',
      lastLogin: null,
      stationId: newUser.stationId,
      stationName: newUser.station?.name,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString()
    }

    // Create audit log for user creation
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system', // TODO: Extract from JWT token
          userName: 'System User', // TODO: Extract from JWT token  
          userRole: 'OWNER', // TODO: Extract from JWT token
          action: 'CREATE',
          entity: 'User',
          entityId: newUser.id,
          details: `Created user: ${newUser.username} with role ${newUser.role}`,
          stationId: newUser.stationId || undefined
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return NextResponse.json(formattedUser, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A user with this username or email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

