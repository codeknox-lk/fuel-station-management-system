import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding operational data...')

    // 1. Get Organization and Station
    const org = await prisma.organization.findUnique({ where: { slug: 'default' } })
    if (!org) throw new Error('Run migrate-to-saas first')

    const station = await prisma.station.findFirst({ where: { organizationId: org.id } })
    if (!station) {
        console.log('Creating default station...')
        await prisma.station.create({
            data: {
                name: 'Test Station',
                address: '123 Test St',
                city: 'Test City',
                organizationId: org.id
            }
        })
    }
    const activeStation = await prisma.station.findFirst({ where: { organizationId: org.id } })!
    if (!activeStation) throw new Error('Failed to ensure station')

    // 2. Create Fuels
    console.log('Creating fuels...')
    const petrol = await prisma.fuel.upsert({
        where: { code_organizationId: { code: 'P92', organizationId: org.id } },
        update: {},
        create: { code: 'P92', name: 'Petrol 92', category: 'PETROL', organizationId: org.id }
    })
    const diesel = await prisma.fuel.upsert({
        where: { code_organizationId: { code: 'D', organizationId: org.id } },
        update: {},
        create: { code: 'D', name: 'Auto Diesel', category: 'DIESEL', organizationId: org.id }
    })

    // 3. Create Tanks
    console.log('Creating tanks...')
    const tank1 = await prisma.tank.upsert({
        where: { stationId_tankNumber: { stationId: activeStation.id, tankNumber: 'T1' } },
        update: {},
        create: { stationId: activeStation.id, tankNumber: 'T1', capacity: 20000, currentLevel: 10000, fuelId: petrol.id, organizationId: org.id }
    })
    const tank2 = await prisma.tank.upsert({
        where: { stationId_tankNumber: { stationId: activeStation.id, tankNumber: 'T2' } },
        update: {},
        create: { stationId: activeStation.id, tankNumber: 'T2', capacity: 15000, currentLevel: 8000, fuelId: diesel.id, organizationId: org.id }
    })

    // 4. Create Pump
    console.log('Creating pump...')
    const pump = await prisma.pump.upsert({
        where: { stationId_pumpNumber: { stationId: activeStation.id, pumpNumber: 'P1' } },
        update: {},
        create: { stationId: activeStation.id, pumpNumber: 'P1', organizationId: org.id }
    })

    // 5. Create Nozzles
    console.log('Creating nozzles...')
    await prisma.nozzle.upsert({
        where: { pumpId_nozzleNumber: { pumpId: pump.id, nozzleNumber: 'N1' } },
        update: {},
        create: { pumpId: pump.id, tankId: tank1.id, nozzleNumber: 'N1', organizationId: org.id }
    })
    await prisma.nozzle.upsert({
        where: { pumpId_nozzleNumber: { pumpId: pump.id, nozzleNumber: 'N2' } },
        update: {},
        create: { pumpId: pump.id, tankId: tank2.id, nozzleNumber: 'N2', organizationId: org.id }
    })

    // 6. Create Pumper
    console.log('Creating pumper...')
    await prisma.pumper.create({
        data: { name: 'John Doe', stationId: activeStation.id, organizationId: org.id }
    })

    // 7. Create Prices
    console.log('Creating prices...')
    await prisma.price.create({
        data: { fuelId: petrol.id, stationId: activeStation.id, price: 350.00, effectiveDate: new Date(), organizationId: org.id }
    })
    await prisma.price.create({
        data: { fuelId: diesel.id, stationId: activeStation.id, price: 320.00, effectiveDate: new Date(), organizationId: org.id }
    })

    console.log('✅ Operational seeding complete!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
