import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stats = {
        organizations: await prisma.organization.count(),
        stations: await prisma.station.count(),
        users: await prisma.user.count(),
        fuels: await prisma.fuel.count(),
        tanks: await prisma.tank.count(),
        pumps: await prisma.pump.count(),
        nozzles: await prisma.nozzle.count(),
        pumpers: await prisma.pumper.count(),
        shifts: await prisma.shift.count()
    }
    console.log('Database Stats:', JSON.stringify(stats, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
