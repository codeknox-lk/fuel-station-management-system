
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stationId = '525ada85-3338-44b2-b91f-3f34a65b9ec4'

    const station = await prisma.station.findUnique({
        where: { id: stationId }
    })
    console.log(`Station: ${station?.name}, OrgId: ${station?.organizationId}`)

    const pumps = await prisma.pump.findMany({
        where: { stationId }
    })

    console.log(`Pumps found with stationId only: ${pumps.length}`)
    pumps.forEach(p => {
        console.log(`- Pump ${p.pumpNumber} (ID: ${p.id}), OrgId: ${p.organizationId}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
