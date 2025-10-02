import { NextRequest, NextResponse } from 'next/server'

// Mock users data
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

export async function GET() {
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const newUser = {
      id: `user_${Date.now()}`,
      ...body,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    users.push(newUser)
    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
