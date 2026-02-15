import { PrismaClient } from '@prisma/client';
import { SIMULATION_CONSTANTS, FUEL_TYPES } from './utils';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Base Simulation Seeding...');

    // 1. Find or Create Organization
    let org = await prisma.organization.findFirst({
        where: { name: SIMULATION_CONSTANTS.ORG_NAME }
    });

    if (org) {
        console.log(`🧹 Cleaning up existing data for ${org.name}...`);
        // Delete in order to avoid foreign key constraints

        // Financials
        await prisma.safeTransaction.deleteMany({ where: { organizationId: org.id } });
        await prisma.safe.deleteMany({ where: { organizationId: org.id } });
        await prisma.expense.deleteMany({ where: { organizationId: org.id } });
        await prisma.deposit.deleteMany({ where: { organizationId: org.id } });
        await prisma.cheque.deleteMany({ where: { organizationId: org.id } });
        await prisma.bankTransaction.deleteMany({ where: { organizationId: org.id } });
        await prisma.bank.deleteMany({ where: { organizationId: org.id } });

        // Sales & Customers
        await prisma.creditPayment.deleteMany({ where: { organizationId: org.id } });
        await prisma.creditSale.deleteMany({ where: { organizationId: org.id } });
        await prisma.creditCustomer.deleteMany({ where: { organizationId: org.id } });

        // Operations
        await prisma.shiftAssignment.deleteMany({ where: { organizationId: org.id } });
        await prisma.tender.deleteMany({ where: { organizationId: org.id } });
        await prisma.testPour.deleteMany({ where: { organizationId: org.id } });
        await prisma.meterAudit.deleteMany({ where: { organizationId: org.id } });

        // POS
        await prisma.posBatchTerminalEntry.deleteMany({ where: { organizationId: org.id } });
        await prisma.posBatch.deleteMany({ where: { organizationId: org.id } });
        await prisma.posMissingSlip.deleteMany({ where: { organizationId: org.id } });
        await prisma.posTerminal.deleteMany({ where: { organizationId: org.id } });

        // Inventory
        await prisma.delivery.deleteMany({ where: { organizationId: org.id } });
        await prisma.tankDip.deleteMany({ where: { organizationId: org.id } });

        // Shifts
        await prisma.shift.deleteMany({ where: { organizationId: org.id } });
        await prisma.shiftTemplate.deleteMany({ where: { organizationId: org.id } });

        // Infrastructure
        await prisma.nozzle.deleteMany({ where: { organizationId: org.id } });
        await prisma.pump.deleteMany({ where: { organizationId: org.id } });
        await prisma.tank.deleteMany({ where: { organizationId: org.id } });
        await prisma.price.deleteMany({ where: { organizationId: org.id } });
        await prisma.fuel.deleteMany({ where: { organizationId: org.id } });

        // HR
        await prisma.loanPumper.deleteMany({ where: { organizationId: org.id } });
        await prisma.loanOfficeStaff.deleteMany({ where: { organizationId: org.id } });
        await prisma.loanExternal.deleteMany({ where: { organizationId: org.id } });
        await prisma.salaryPayment.deleteMany({ where: { organizationId: org.id } });
        await prisma.officeStaffSalaryPayment.deleteMany({ where: { organizationId: org.id } });
        await prisma.pumper.deleteMany({ where: { organizationId: org.id } });
        await prisma.officeStaff.deleteMany({ where: { organizationId: org.id } });

        // Users & Station & AuditLogs
        const usersToDelete = await prisma.user.findMany({ where: { organizationId: org.id } });
        const userIds = usersToDelete.map(u => u.id);

        if (userIds.length > 0) {
            await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
        }

        await prisma.station.deleteMany({ where: { organizationId: org.id } });
        await prisma.user.deleteMany({ where: { organizationId: org.id } });

        console.log('✅ Cleanup complete.');
    } else {
        org = await prisma.organization.create({
            data: {
                name: SIMULATION_CONSTANTS.ORG_NAME,
                slug: SIMULATION_CONSTANTS.ORG_NAME.toLowerCase().replace(/ /g, '-'),
                plan: 'PREMIUM'
            }
        });
        console.log(`✅ Created organization: ${org.name}`);
    }

    // 2. Create Station
    const station = await prisma.station.create({
        data: {
            name: SIMULATION_CONSTANTS.STATION_NAME,
            address: '123 Simulation Road',
            city: 'Colombo',
            organizationId: org.id,
            openingHours: '24/7'
        }
    });
    console.log(`✅ Created station: ${station.name}`);

    // 3. Create Manager User
    const hashedPassword = await bcrypt.hash(SIMULATION_CONSTANTS.MANAGER_PASSWORD, 10);
    await prisma.user.create({
        data: {
            username: 'sim_manager',
            email: SIMULATION_CONSTANTS.MANAGER_EMAIL,
            password: hashedPassword,
            role: 'MANAGER',
            organizationId: org.id,
            stationId: station.id,
            isActive: true
        }
    });
    console.log(`✅ Created manager: ${SIMULATION_CONSTANTS.MANAGER_EMAIL}`);

    // 4. Create Fuels & Prices
    const fuelMap = new Map<string, string>(); // Code -> ID

    for (const fuel of FUEL_TYPES) {
        const f = await prisma.fuel.create({
            data: {
                code: fuel.code,
                name: fuel.name,
                category: fuel.category,
                organizationId: org.id,
                isActive: true
            }
        });
        fuelMap.set(fuel.code, f.id);

        // Set Initial Price
        await prisma.price.create({
            data: {
                stationId: station.id,
                fuelId: f.id,
                price: fuel.price,
                effectiveDate: new Date('2025-01-01'), // Way before simulation start
                organizationId: org.id
            }
        });
    }
    console.log('✅ Created fuels and initial prices');

    // 5. Create Tanks
    const tanks = [];
    const tankConfigs = [
        { fuelCode: 'LP92', capacity: 13500, initial: 5000 },
        { fuelCode: 'LP95', capacity: 9000, initial: 4000 },
        { fuelCode: 'LAD', capacity: 13500, initial: 8000 },
        { fuelCode: 'LSD', capacity: 9000, initial: 3000 },
    ];

    for (let i = 0; i < tankConfigs.length; i++) {
        const config = tankConfigs[i];
        const tank = await prisma.tank.create({
            data: {
                stationId: station.id,
                tankNumber: `TANK-${i + 1}`,
                fuelId: fuelMap.get(config.fuelCode)!,
                capacity: config.capacity,
                currentLevel: config.initial,
                organizationId: org.id
            }
        });
        tanks.push(tank);
    }
    console.log(`✅ Created ${tanks.length} tanks`);

    // 6. Create Pumps & Nozzles

    const pumpConfigs = [
        { number: 'P1', nozzles: ['LP92', 'LAD'] },
        { number: 'P2', nozzles: ['LP92', 'LAD'] },
        { number: 'P3', nozzles: ['LP95', 'LSD'] },
        { number: 'P4', nozzles: ['LP95', 'LSD'] },
    ];

    for (const config of pumpConfigs) {
        const pump = await prisma.pump.create({
            data: {
                stationId: station.id,
                pumpNumber: config.number,
                organizationId: org.id
            }
        });

        for (let i = 0; i < config.nozzles.length; i++) {
            const fuelCode = config.nozzles[i];
            // Better way: find tank by fuelId
            const tankForFuel = await prisma.tank.findFirst({
                where: {
                    stationId: station.id,
                    fuelId: fuelMap.get(fuelCode)
                }
            });

            if (tankForFuel) {
                await prisma.nozzle.create({
                    data: {
                        pumpId: pump.id,
                        tankId: tankForFuel.id,
                        nozzleNumber: `N${(parseInt(config.number.replace('P', '')) - 1) * 2 + i + 1}`, // N1, N2...
                        organizationId: org.id,
                        meterMax: 9999999, // Standard 7 digit
                    }
                });
            }
        }
    }
    console.log(`✅ Created ${pumpConfigs.length} pumps and nozzles`);

    // 7. Create Credit Customers
    await prisma.creditCustomer.createMany({
        data: [
            { name: 'ABC Logistics', address: 'Colombo', phone: '0771112222', creditLimit: 100000, organizationId: org.id },
            { name: 'City Cabs', address: 'Kandy', phone: '0773334444', creditLimit: 50000, organizationId: org.id },
            { name: 'Govt Transport', address: 'Colombo', phone: '0112223333', creditLimit: 500000, organizationId: org.id },
        ]
    });
    console.log('✅ Created Credit Customers');

    // 8. Create POS Terminals
    const terminals = [
        { name: 'POS-01', number: 'TERM001', bank: 'BOC' },
        { name: 'POS-02', number: 'TERM002', bank: 'ComBank' }
    ];

    for (const t of terminals) {
        await prisma.posTerminal.create({
            data: {
                stationId: station.id,
                terminalNumber: t.number,
                name: t.name,
                organizationId: org.id
            }
        });
    }
    console.log('✅ Created POS Terminals');

    // 9. Create Staff (Pumpers)
    const pumperNames = ['Kamal', 'Nimal', 'Sunil', 'Banda'];
    for (const name of pumperNames) {
        await prisma.pumper.create({
            data: {
                name,
                stationId: station.id,
                // nic removed
                phone: `077${Math.floor(Math.random() * 10000000)}`,
                hireDate: new Date('2025-01-01'),
                organizationId: org.id
            }
        });
    }
    console.log(`✅ Created ${pumperNames.length} pumpers`);

    // 8. Create Office Staff
    const officeStaffNames = ['Mala', 'Chitra'];
    for (const name of officeStaffNames) {
        await prisma.officeStaff.create({
            data: {
                name,
                stationId: station.id,
                // nic removed
                phone: `071${Math.floor(Math.random() * 10000000)}`,
                role: 'OFFICE_STAFF',
                hireDate: new Date('2025-01-01'),
                organizationId: org.id
            }
        });
    }
    console.log(`✅ Created ${officeStaffNames.length} office staff`);

    // 9. Init Safe
    await prisma.safe.create({
        data: {
            stationId: station.id,
            openingBalance: 0,
            currentBalance: 0,
            organizationId: org.id
        }
    });
    console.log('✅ Created Safe');

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
