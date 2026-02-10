import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'
import { CreateUserSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const where: Prisma.UserWhereInput = {
      organizationId: user.organizationId,
      ...(activeOnly ? { isActive: true } : {})
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        organizationId: true,
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
    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.username,
      email: u.email,
      role: u.role,
      status: u.isActive ? 'active' : 'inactive',
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
      stationId: u.stationId,
      stationName: u.station?.name,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString()
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user (creator)
    const currentUser = await getServerUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Zod Validation
    const result = CreateUserSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { username, email, password, role, stationId, status } = result.data

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

    // Create user linked to Creator's Organization
    const newUser = await prisma.user.create({
      data: {
        organizationId: currentUser.organizationId,
        username: username.trim(),
        email: email.trim(),
        password: hashedPassword,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: (role as any),
        stationId: stationId || null,
        isActive: status === 'active',
        isFirstLogin: true // New users created by admin should probably change password
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        organizationId: true,
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
          userId: currentUser.userId,
          userName: currentUser.username,
          userRole: currentUser.role,
          organizationId: currentUser.organizationId,
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

