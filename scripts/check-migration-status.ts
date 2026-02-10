
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Migration Status Check ---')

    // 1. Check for Default Organization
    const defaultOrg = await prisma.organization.findUnique({
        where: { slug: 'default' }
    })
    console.log(`Default Organization: ${defaultOrg ? 'EXISTS (' + defaultOrg.id + ')' : 'MISSING'}`)

    // 2. Check for other Organizations
    const orgCount = await prisma.organization.count()
    console.log(`Total Organizations: ${orgCount}`)

    // 3. Check for Unassigned Records (Orphans)
    const unassignedUsers = await prisma.user.count({ where: { organizationId: null } })
    const unassignedStations = await prisma.station.count({ where: { organizationId: null } })
    const unassignedCustomers = await prisma.creditCustomer.count({ where: { organizationId: null } })
    const unassignedFuels = await prisma.fuel.count({ where: { organizationId: null } })
    const unassignedBanks = await prisma.bank.count({ where: { organizationId: null } })
    const unassignedProducts = await prisma.shopProduct.count({ where: { organizationId: null } })

    console.log('\n--- Unassigned Records (Need Migration) ---')
    console.log(`Users: ${unassignedUsers}`)
    console.log(`Stations: ${unassignedStations}`)
    console.log(`Credit Customers: ${unassignedCustomers}`)
    console.log(`Fuels: ${unassignedFuels}`)
    console.log(`Banks: ${unassignedBanks}`)
    console.log(`Shop Products: ${unassignedProducts}`)

    if (unassignedUsers > 0 || unassignedStations > 0) {
        console.log('\n[!] Migration is REQUIRED.')
    } else {
        console.log('\n[OK] Data appears to be fully migrated.')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
