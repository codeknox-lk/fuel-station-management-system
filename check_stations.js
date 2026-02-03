/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stations = await prisma.station.findMany({
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(stations, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
