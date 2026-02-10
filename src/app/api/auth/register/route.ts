
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'
import { z } from 'zod'

// Validation Schema
const RegisterSchema = z.object({
    companyName: z.string().min(2, 'Company name is required'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const result = RegisterSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { companyName, username, email, password } = result.data

        // Check availability
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }]
            }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username or email already taken' },
                { status: 409 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Transaction: Create Org + User
        const newOrganization = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            // Generate simple slug from name (remove spaces, lowercase)
            let slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')

            // Ensure slug uniqueness (basic check)
            const existingOrg = await tx.organization.findUnique({ where: { slug } })
            if (existingOrg) {
                slug = `${slug}-${Date.now()}` // Fallback for uniqueness
            }

            const org = await tx.organization.create({
                data: {
                    name: companyName,
                    slug,
                    plan: 'BASIC'
                }
            })

            // 2. Create User (Owner)
            await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role: 'OWNER',
                    organizationId: org.id,
                    isActive: true
                }
            })

            return org
        })

        return NextResponse.json({
            success: true,
            message: 'Registration successful',
            organization: {
                id: newOrganization.id,
                name: newOrganization.name
            }
        }, { status: 201 })

    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
