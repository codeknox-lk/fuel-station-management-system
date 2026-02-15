
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient()

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    try {
        // 1. Validate Authentication (Basic check if not using middleware for this specific route yet)
        // For now, let's assume middleware handles basic auth, but we should verify access to THIS organization.
        // In a real app, we check if the user belongs to this org.

        // 2. Fetch Organization
        const organization = await prisma.organization.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                subscription: {
                    select: {
                        status: true,
                        trialEndDate: true,
                        planId: true
                    }
                }
            }
        })

        if (!organization) {
            return NextResponse.json(
                { error: 'Organization not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(organization)
    } catch (error) {
        console.error('Failed to fetch organization:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    } finally {
        await prisma.$disconnect()
    }
}
