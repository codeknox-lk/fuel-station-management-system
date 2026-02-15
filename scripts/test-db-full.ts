
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing Full DB Query for Stations...')
        const org = await prisma.organization.findFirst()
        if (!org) {
            console.log('No organization found')
            return
        }
        console.log('Found Organization:', org.id)

        // Replicate API query EXACTLY
        console.log('Running findMany with exact select...')
        const stations = await prisma.station.findMany({
            where: {
                organizationId: org.id
            },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                phone: true,
                email: true,
                openingHours: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { name: 'asc' }
        })

        console.log('Success! Stations found:', stations.length)
        if (stations.length > 0) {
            console.log('First station sample:', JSON.stringify(stations[0], null, 2))
        }

    } catch (error) {
        console.error('FATAL ERROR fetching stations:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
