import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Updating Petrol 92 and 95 icons...')

    const petrol92 = await prisma.fuel.updateMany({
        where: {
            OR: [
                { name: { contains: '92' } },
                { code: { contains: '92' } }
            ]
        },
        data: {
            icon: '92'
        }
    })

    const petrol95 = await prisma.fuel.updateMany({
        where: {
            OR: [
                { name: { contains: '95' } },
                { code: { contains: '95' } }
            ]
        },
        data: {
            icon: '95'
        }
    })

    console.log(`Updated ${petrol92.count} Petrol 92 records.`)
    console.log(`Updated ${petrol95.count} Petrol 95 records.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
