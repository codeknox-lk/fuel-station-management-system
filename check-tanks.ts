
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stationId = '525ada85-3338-44b2-b91f-3f34a65b9ec4'

    const tanks = await prisma.tank.findMany({
        where: { stationId }
    })

    console.log(`Tanks found for station: ${tanks.length}`)
    tanks.forEach(t => {
        console.log(`- Tank ${t.tankNumber} (ID: ${t.id}), OrgId: ${t.organizationId}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
