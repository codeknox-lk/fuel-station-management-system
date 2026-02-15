import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Starting Legacy Data Cleanup...')

    // 1. Find Default Organization
    const defaultOrg = await prisma.organization.findUnique({
        where: { slug: 'default' }
    })

    if (!defaultOrg) {
        console.log('❌ Default organization not found. Aborting.')
        return
    }

    console.log(`📍 Targeting Organization: ${defaultOrg.name} (${defaultOrg.id})`)

    // Check for stations to delete
    const stationsToDelete = await prisma.station.findMany({
        where: {
            organizationId: defaultOrg.id
        }
    })

    console.log(`found ${stationsToDelete.length} stations in Default Org to delete.`)

    for (const station of stationsToDelete) {
        console.log(`   - Processing Station: ${station.name} (${station.id})`)
        try {
            console.log(`     - Deleting dependent data...`)

            // --- LEVEL 1: Deepest Dependencies (Transaction Details) ---

            // 1. Meter Audits & Test Pours (Depend on Nozzle & Shift)
            // Use Relation filtering
            await prisma.meterAudit.deleteMany({ where: { nozzle: { pump: { stationId: station.id } } } })
            await prisma.testPour.deleteMany({ where: { nozzle: { pump: { stationId: station.id } } } })

            // 2. Shift Related Data (Depend on Shift)
            const shifts = await prisma.shift.findMany({ where: { stationId: station.id }, select: { id: true } })
            const shiftIds = shifts.map(s => s.id)

            if (shiftIds.length > 0) {
                // POS Data
                await prisma.posBatchTerminalEntry.deleteMany({ where: { batch: { shiftId: { in: shiftIds } } } })
                await prisma.posBatch.deleteMany({ where: { shiftId: { in: shiftIds } } })
                await prisma.posMissingSlip.deleteMany({ where: { shiftId: { in: shiftIds } } })

                // Shop Data (Sales linked to Shift)
                await prisma.shopSale.deleteMany({ where: { assignment: { shiftId: { in: shiftIds } } } })
                await prisma.shopShiftItem.deleteMany({ where: { assignment: { shiftId: { in: shiftIds } } } })
                await prisma.shopAssignment.deleteMany({ where: { shiftId: { in: shiftIds } } })

                // Shift Assignments (Pumper work)
                await prisma.shiftAssignment.deleteMany({ where: { shiftId: { in: shiftIds } } })

                // Financials linked to Shift
                await prisma.creditSale.deleteMany({ where: { shiftId: { in: shiftIds } } })
                await prisma.tender.deleteMany({ where: { shiftId: { in: shiftIds } } })

                // Finally delete Shifts
                await prisma.shift.deleteMany({ where: { id: { in: shiftIds } } })
            }

            // 3. Shop Products & Inventory (Linked to Station)
            // Delete batches first
            await prisma.shopPurchaseBatch.deleteMany({ where: { product: { stationId: station.id } } })
            await prisma.shopWastage.deleteMany({ where: { product: { stationId: station.id } } })
            // Loose Sales not linked to shift assignment? (Should be rare but possible)
            await prisma.shopSale.deleteMany({ where: { product: { stationId: station.id } } })
            await prisma.shopShiftItem.deleteMany({ where: { product: { stationId: station.id } } })

            await prisma.shopProduct.deleteMany({ where: { stationId: station.id } })


            // 4. Shift Templates
            await prisma.shiftTemplate.deleteMany({ where: { stationId: station.id } })

            // 5. Safe & Bank Transactions
            const safe = await prisma.safe.findUnique({ where: { stationId: station.id } })
            if (safe) {
                await prisma.safeTransaction.deleteMany({ where: { safeId: safe.id } })
                await prisma.safe.delete({ where: { id: safe.id } })
            }

            // Delete Bank Transactions linked to this station's cheques or directly
            await prisma.bankTransaction.deleteMany({ where: { stationId: station.id } })
            await prisma.cheque.deleteMany({ where: { stationId: station.id } })

            // 6. Inventory (Tanks, Pumps, Nozzles)
            await prisma.nozzle.deleteMany({ where: { pump: { stationId: station.id } } })
            await prisma.pump.deleteMany({ where: { stationId: station.id } })

            await prisma.delivery.deleteMany({ where: { stationId: station.id } })
            await prisma.tankDip.deleteMany({ where: { stationId: station.id } })
            await prisma.tank.deleteMany({ where: { stationId: station.id } })

            // 7. Other station data
            await prisma.expense.deleteMany({ where: { stationId: station.id } })
            await prisma.deposit.deleteMany({ where: { stationId: station.id } })
            await prisma.loanPumper.deleteMany({ where: { stationId: station.id } })
            await prisma.loanOfficeStaff.deleteMany({ where: { stationId: station.id } })
            await prisma.loanExternal.deleteMany({ where: { stationId: station.id } })

            await prisma.notification.deleteMany({ where: { stationId: station.id } })
            await prisma.oilSale.deleteMany({ where: { stationId: station.id } })
            await prisma.salaryPayment.deleteMany({ where: { stationId: station.id } })
            await prisma.officeStaffSalaryPayment.deleteMany({ where: { stationId: station.id } })

            // Terminals depend on Bank and Station
            await prisma.posBatchTerminalEntry.deleteMany({ where: { terminal: { stationId: station.id } } }) // Just in case
            await prisma.posMissingSlip.deleteMany({ where: { terminal: { stationId: station.id } } }) // Just in case
            await prisma.posTerminal.deleteMany({ where: { stationId: station.id } })

            await prisma.pumper.deleteMany({ where: { stationId: station.id } })
            await prisma.officeStaff.deleteMany({ where: { stationId: station.id } })
            await prisma.price.deleteMany({ where: { stationId: station.id } })


            // Finally Delete Station
            await prisma.station.delete({
                where: { id: station.id }
            })
            console.log(`     ✅ Deleted Station: ${station.name}`)
        } catch (error) {
            console.error(`     ❌ Failed to delete ${station.name}:`, error)
        }
    }

    // --- LEVEL 2: Organization Level Data ---

    const banks = await prisma.bank.findMany({ where: { organizationId: defaultOrg.id } })
    const bankIds = banks.map(b => b.id)
    if (bankIds.length > 0) {
        await prisma.bankTransaction.deleteMany({ where: { bankId: { in: bankIds } } })
        await prisma.cheque.deleteMany({ where: { bankId: { in: bankIds } } })
        await prisma.deposit.deleteMany({ where: { bankId: { in: bankIds } } })
        await prisma.posTerminal.deleteMany({ where: { bankId: { in: bankIds } } })
    }

    await prisma.creditPayment.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.cheque.deleteMany({ where: { organizationId: defaultOrg.id } })

    // Now safe to delete Banks
    await prisma.bank.deleteMany({ where: { organizationId: defaultOrg.id } })

    await prisma.creditSale.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.creditCustomer.deleteMany({ where: { organizationId: defaultOrg.id } })

    // Clean up any remaining Shop/Fuel data not linked to station
    await prisma.shopSale.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.shopShiftItem.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.shopWastage.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.shopPurchaseBatch.deleteMany({ where: { organizationId: defaultOrg.id } })
    await prisma.shopProduct.deleteMany({ where: { organizationId: defaultOrg.id } })

    await prisma.fuel.deleteMany({ where: { organizationId: defaultOrg.id } })


    const usersToDelete = await prisma.user.findMany({
        where: {
            organizationId: defaultOrg.id,
            role: { not: 'OWNER' }
        }
    })

    console.log(`found ${usersToDelete.length} users in Default Org to delete.`)
    for (const user of usersToDelete) {
        if (['developer', 'admin'].includes(user.username)) continue;

        console.log(`   - Deleting User: ${user.username}`)
        try {
            await prisma.auditLog.deleteMany({ where: { userId: user.id } })
            await prisma.user.delete({
                where: { id: user.id }
            })
            console.log(`     ✅ Deleted User: ${user.username}`)
        } catch (error) {
            console.error(`     ❌ Failed to delete ${user.username}:`, error)
        }
    }


    console.log('✨ Cleanup Complete!')
}

main()
    .catch((e) => {
        console.error(e)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
