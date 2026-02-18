
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stationName = 'Dammika Test Station 1'
    const station = await prisma.station.findFirst({
        where: { name: stationName }
    })

    if (!station) {
        console.log(`Station "${stationName}" not found.`)
        return
    }

    console.log(`Station found: ${station.name} (${station.id})`)
    const orgId = station.organizationId
    console.log(`Organization ID: ${orgId}`)

    const nozzles = await prisma.nozzle.findMany({
        where: {
            pump: {
                stationId: station.id
            }
        },
        include: {
            pump: true
        }
    })

    const nozzleIds = nozzles.map(n => n.id)
    console.log(`Total nozzles found for station: ${nozzles.length}`)

    const allActiveShifts = await prisma.shift.findMany({
        where: {
            organizationId: orgId,
            status: 'OPEN'
        },
        include: {
            station: true,
            assignments: {
                where: {
                    status: 'ACTIVE'
                }
            }
        }
    })

    console.log(`Total active shifts found in organization: ${allActiveShifts.length}`)

    let foundMatch = false
    for (const s of allActiveShifts) {
        console.log(`- Shift ${s.id} at Station "${s.station.name}" (Status: ${s.status})`)
        console.log(`  Assignments: ${s.assignments.length}`)
        for (const a of s.assignments) {
            const isThisStationNozzle = nozzleIds.includes(a.nozzleId)
            if (isThisStationNozzle) {
                console.log(`    - Nozzle ${a.nozzleId} !!! MATCHES THIS STATION !!! (Nozzle Index in station list: ${nozzleIds.indexOf(a.nozzleId)})`)
                foundMatch = true
            } else {
                // console.log(`    - Nozzle ${a.nozzleId} (Different station)`)
            }
        }
    }

    if (!foundMatch && allActiveShifts.length > 0) {
        console.log("No nozzles from this station are in any active shift assignments.")
    } else if (allActiveShifts.length === 0) {
        console.log("No active shifts found in the entire organization.")
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
