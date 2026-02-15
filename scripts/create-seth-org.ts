import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const existing = await prisma.organization.findUnique({ where: { slug: 'seth-fs' } })
    if (existing) {
        console.log('✅ Seth FS already exists')
        return
    }

    await prisma.organization.create({
        data: {
            name: 'Seth FS',
            slug: 'seth-fs',
            plan: 'PREMIUM',
            subscription: {
                create: {
                    planId: 'PREMIUM',
                    status: 'ACTIVE',
                    maxStations: 10,
                    trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            }
        }
    })
    console.log('✅ Created Seth FS organization')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
