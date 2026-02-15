
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing Prisma Connection...')
        // specific org ID from user logs if possible, or just first one
        const org = await prisma.organization.findFirst()
        if (!org) {
            console.log('No organization found')
            return
        }
        console.log('Found Organization:', org.id, org.name)

        console.log('Fetching Stations...')
        const stations = await prisma.station.findMany({
            where: {
                organizationId: org.id
            },
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                isActive: true
            }
        })
        console.log('Stations found:', stations.length)
        console.log(stations)

    } catch (error) {
        console.error('Error fetching stations:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
