import { NextRequest, NextResponse } from 'next/server'

// This would typically import from a shared data file, but for now we'll use the same mock data
const users = [
  {
    id: 'user_1',
    name: 'John Owner',
    email: 'owner@example.com',
    role: 'OWNER' as const,
    status: 'active' as const,
    lastLogin: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'user_2',
    name: 'Jane Manager',
    email: 'manager@example.com',
    role: 'MANAGER' as const,
    status: 'active' as const,
    lastLogin: '2024-01-15T09:15:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-15T09:15:00Z'
  },
  {
    id: 'user_3',
    name: 'Bob Accountant',
    email: 'accounts@example.com',
    role: 'ACCOUNTS' as const,
    status: 'active' as const,
    lastLogin: '2024-01-14T16:45:00Z',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z'
  }
]

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    users[userIndex] = {
      ...users[userIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(users[userIndex])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const userIndex = users.findIndex(u => u.id === id)
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deletion of OWNER users
    if (users[userIndex].role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot delete owner users' }, { status: 403 })
    }

    users.splice(userIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

