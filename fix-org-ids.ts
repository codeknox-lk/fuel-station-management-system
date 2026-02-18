
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Starting Organization ID Fix ---')

    // 1. Fix models that have stationId
    const modelsWithStation = [
        'pump',
        'nozzle', // Nozzle also has pumpId which belongs to a station
        'shiftTemplate',
        'delivery',
        'expense',
        'posTerminal'
    ]

    for (const modelName of modelsWithStation) {
        console.log(`Processing model "${modelName}"...`)
        // @ts-ignore
        const records = await prisma[modelName].findMany({
            where: { organizationId: null },
            include: {
                ...(modelName === 'nozzle' ? { pump: { select: { stationId: true } } } : {})
            }
        })

        console.log(`Found ${records.length} orphaned records in "${modelName}"`)

        for (const record of records) {
            let stationId = record.stationId
            if (modelName === 'nozzle' && record.pump) {
                stationId = record.pump.stationId
            }

            if (stationId) {
                const station = await prisma.station.findUnique({
                    where: { id: stationId },
                    select: { organizationId: true }
                })

                if (station?.organizationId) {
                    // @ts-ignore
                    await prisma[modelName].update({
                        where: { id: record.id },
                        data: { organizationId: station.organizationId }
                    })
                    console.log(`  Updated ${modelName} ${record.id} with orgId ${station.organizationId}`)
                }
            }
        }
    }

    // 2. Fix SafeTransaction
    console.log('Processing model "safeTransaction"...')
    const safeTransactions = await prisma.safeTransaction.findMany({
        where: { organizationId: null },
        include: {
            safe: {
                select: {
                    stationId: true
                }
            }
        }
    })

    console.log(`Found ${safeTransactions.length} orphaned records in "safeTransaction"`)
    for (const tx of safeTransactions) {
        if (tx.safe?.stationId) {
            const station = await prisma.station.findUnique({
                where: { id: tx.safe.stationId },
                select: { organizationId: true }
            })

            if (station?.organizationId) {
                await prisma.safeTransaction.update({
                    where: { id: tx.id },
                    data: { organizationId: station.organizationId }
                })
                console.log(`  Updated safeTransaction ${tx.id} with orgId ${station.organizationId}`)
            }
        }
    }

    // 3. Fix AuditLog
    console.log('Processing model "auditLog"...')
    const auditLogs = await prisma.auditLog.findMany({
        where: { organizationId: null }
    })

    console.log(`Found ${auditLogs.length} orphaned records in "auditLog"`)
    for (const log of auditLogs) {
        // If we can't find orgId, we might need to use a default or first org for dev logs
        // But let's check if the log belongs to a user
        if (log.userId) {
            const user = await prisma.user.findUnique({
                where: { id: log.userId },
                select: { organizationId: true }
            })
            if (user?.organizationId) {
                await prisma.auditLog.update({
                    where: { id: log.id },
                    data: { organizationId: user.organizationId }
                })
                console.log(`  Updated auditLog ${log.id} with orgId ${user.organizationId}`)
            }
        }
    }

    console.log('--- Organization ID Fix Complete ---')
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
