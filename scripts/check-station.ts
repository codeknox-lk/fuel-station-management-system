import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const station = await prisma.station.findFirst({ where: { name: 'Sethu Station 1' } })
    console.log(JSON.stringify(station, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
