
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stations = await prisma.station.findMany()
    console.log('--- All Stations ---')
    stations.forEach(s => {
        console.log(`ID: ${s.id} | Name: ${s.name} | City: ${s.city}`)
    })
    console.log('--------------------')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
