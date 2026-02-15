import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const station = await prisma.station.findFirst()
    const pumper = await prisma.pumper.findFirst()
    const nozzles = await prisma.nozzle.findMany()
    const organization = await prisma.organization.findUnique({ where: { slug: 'default' } })

    console.log(JSON.stringify({
        organizationId: organization?.id,
        stationId: station?.id,
        pumperId: pumper?.id,
        nozzles: nozzles.map(n => ({ id: n.id, num: n.nozzleNumber }))
    }, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
