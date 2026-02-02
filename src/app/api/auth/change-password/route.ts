import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { currentPassword, newPassword } = body

        // Get user ID from token (check both Authorization header and cookies)
        const authHeader = request.headers.get('authorization')
        const tokenFromHeader = authHeader?.replace('Bearer ', '')
        const tokenFromCookie = request.cookies.get('accessToken')?.value
        const token = tokenFromHeader || tokenFromCookie

        if (!token) {
            return NextResponse.json(
                { detail: 'Not authenticated' },
                { status: 401 }
            )
        }

        // Decode token to get user ID
        const userId = await getUserIdFromToken(token)
        if (!userId) {
            return NextResponse.json(
                { detail: 'Invalid token' },
                { status: 401 }
            )
        }

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { detail: 'Current password and new password are required' },
                { status: 400 }
            )
        }

        // Validate new password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/
        if (!passwordRegex.test(newPassword)) {
            return NextResponse.json(
                { detail: 'Password does not meet security requirements' },
                { status: 400 }
            )
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return NextResponse.json(
                { detail: 'User not found' },
                { status: 404 }
            )
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { detail: 'Current password is incorrect' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update user password and set isFirstLogin to false
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isFirstLogin: false,
            },
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: userId,
                userName: user.username,
                userRole: user.role,
                action: 'UPDATE',
                entity: 'User',
                entityId: userId,
                details: 'User changed password (force change on first login)',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            },
        })

        return NextResponse.json({
            message: 'Password changed successfully',
        })
    } catch (error) {
        console.error('Change password error:', error)
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to extract user ID from JWT token
async function getUserIdFromToken(token: string): Promise<string | null> {
    try {
        // Import jwt library
        // Use top-level import instead of require
        const jwt = (await import('jsonwebtoken')).default

        // Verify and decode token
        interface DecodedToken {
            userId?: string
            id?: string
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken
        return decoded.userId || decoded.id || null
    } catch (error) {
        console.error('Token verification error:', error)
        return null
    }
}
