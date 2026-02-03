
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const duplicateIds = [
        '7c4c8660-2944-4c85-9cbe-05d17ad45873',
        '4578e14f-2f2f-453f-add6-a8c56113ed1d',
        '61773244-2b41-434f-a794-3b613c28f03d'
    ]

    console.log(`Deleting ${duplicateIds.length} duplicate stations...`)

    const result = await prisma.station.deleteMany({
        where: {
            id: {
                in: duplicateIds
            }
        }
    })

    console.log(`Deleted ${result.count} stations.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
