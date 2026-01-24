import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { generateTempPassword } from '@/lib/passwordGenerator'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId } = body as { userId: string }

        // Get admin info from token
        const token = request.cookies.get('accessToken')?.value
        if (!token) {
            return NextResponse.json(
                { detail: 'Not authenticated' },
                { status: 401 }
            )
        }

        // Get admin user ID from token
        const adminId = await getUserIdFromToken(token)
        if (!adminId) {
            return NextResponse.json(
                { detail: 'Invalid token' },
                { status: 401 }
            )
        }

        // Get admin user to check role
        const admin = await prisma.user.findUnique({
            where: { id: adminId },
        })

        if (!admin) {
            return NextResponse.json(
                { detail: 'Admin user not found' },
                { status: 404 }
            )
        }

        // Check if admin has permission (OWNER or DEVELOPER only)
        const allowedRoles = ['OWNER', 'DEVELOPER']
        if (!allowedRoles.includes(admin.role)) {
            return NextResponse.json(
                { detail: 'Insufficient permissions. Only OWNER and DEVELOPER can reset passwords.' },
                { status: 403 }
            )
        }

        // Validate input
        if (!userId) {
            return NextResponse.json(
                { detail: 'User ID is required' },
                { status: 400 }
            )
        }

        // Prevent admin from resetting their own password
        if (userId === adminId) {
            return NextResponse.json(
                { detail: 'You cannot reset your own password using this method' },
                { status: 400 }
            )
        }

        // Get target user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })

        if (!user) {
            return NextResponse.json(
                { detail: 'User not found' },
                { status: 404 }
            )
        }

        // Generate temporary password
        const tempPassword = generateTempPassword()

        // Hash the temporary password
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // Update user with new password and set isFirstLogin to true
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isFirstLogin: true,
            },
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: adminId,
                userName: admin.username,
                userRole: admin.role,
                action: 'UPDATE',
                entity: 'User',
                entityId: userId,
                details: `Admin ${admin.username} reset password for user ${user.username}`,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            },
        })

        return NextResponse.json({
            message: 'Password reset successfully',
            tempPassword: tempPassword,
            username: user.username,
        })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to extract user ID from JWT token
async function getUserIdFromToken(token: string): Promise<string | null> {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId?: string; id?: string }
        return decoded.userId || decoded.id || null
    } catch (error) {
        console.error('Token verification error:', error)
        return null
    }
}
