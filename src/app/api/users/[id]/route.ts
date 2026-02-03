import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcrypt'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Format response
    const formattedUser = {
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      stationId: user.stationId,
      stationName: user.station?.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username, email, password, role, stationId, status } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for duplicate username or email (excluding current user)
    if (username || email) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(username ? [{ username: username.trim() }] : []),
                ...(email ? [{ email: email.trim() }] : [])
              ]
            }
          ]
        }
      })

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'A user with this username or email already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Prisma.UserUncheckedUpdateInput = {}
    if (username !== undefined) updateData.username = username.trim()
    if (email !== undefined) updateData.email = email.trim()
    if (role !== undefined) updateData.role = role
    if (stationId !== undefined) updateData.stationId = stationId || null
    if (status !== undefined) updateData.isActive = status === 'active'

    // Hash new password if provided
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
      id: updatedUser.id,
      name: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.isActive ? 'active' : 'inactive',
      stationId: updatedUser.stationId,
      stationName: updatedUser.station?.name,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString()
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    console.error('Error updating user:', error)

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A user with this username or email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion of DEVELOPER users (only DEVELOPER can delete DEVELOPER)
    const userRole = request.headers.get('x-user-role')
    if (user.role === 'DEVELOPER' && userRole !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can delete developer accounts' },
        { status: 403 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)

    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete user. They may have associated audit logs or other records.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

