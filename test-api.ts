
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stationId = '525ada85-3338-44b2-b91f-3f34a65b9ec4'
    const orgId = '8595e95e-6367-433d-a0ee-f6771388e8a2'

    console.log(`Checking nozzles for stationId: ${stationId}`)

    const pumps = await prisma.pump.findMany({
        where: { stationId, organizationId: orgId },
        select: { id: true }
    })

    const pumpIds = pumps.map(p => p.id)
    console.log(`Pumps found: ${pumpIds.length}`)

    if (pumpIds.length === 0) {
        console.log('No pumps found.')
        return
    }

    const nozzles = await prisma.nozzle.findMany({
        where: {
            pumpId: { in: pumpIds },
            organizationId: orgId
        },
        include: {
            pump: {
                select: {
                    id: true,
                    pumpNumber: true,
                    stationId: true,
                    isActive: true
                }
            },
            tank: {
                select: {
                    id: true,
                    fuelId: true,
                    fuel: true,
                    capacity: true,
                    currentLevel: true
                }
            }
        },
        orderBy: { nozzleNumber: 'asc' }
    })

    console.log(`Nozzles found: ${nozzles.length}`)
    nozzles.forEach(n => {
        console.log(`- ${n.nozzleNumber} on pump ${n.pump.pumpNumber} (ID: ${n.id})`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
