
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const cheques = await prisma.cheque.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    })
    console.log('Recent Cheques:', JSON.stringify(cheques, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
