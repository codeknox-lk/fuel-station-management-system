import { PrismaClient } from '@prisma/client';
import { SIMULATION_CONSTANTS, addMinutes, addDays } from './utils';
import * as actions from './actions';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting System Simulation...\n');

    // Get Org
    const org = await prisma.organization.findFirst({ where: { name: SIMULATION_CONSTANTS.ORG_NAME } });
    if (!org) throw new Error('Org not found. Run seed-base.ts first.');

    // Simulation Start: 1st Jan 2026
    let currentTime = SIMULATION_CONSTANTS.START_DATE;
    const END_DATE = addDays(currentTime, 31); // 1 Month

    while (currentTime < END_DATE) {
        // Start of Day Actions (Midnight)
        if (currentTime.getHours() === 0 && currentTime.getMinutes() === 0) {
            console.log(`\n📅 Simulating Day: ${currentTime.toDateString()}`);
            // Perform Dips at start of day
            await actions.performDip(org.id, currentTime);
            await actions.performExpense(org.id, currentTime);
        }

        // Open Shift
        const shift = await actions.openShift(org.id, currentTime);

        // Simulating the Shift Duration (8 hours)
        const shiftEndTime = addMinutes(currentTime, 8 * 60);

        // Accumulate Sales Data for the Shift
        const fuelSalesData: Record<string, number> = {};
        let cardTotal = 0;
        let creditTotal = 0;

        // Simulate random sales throughout the shift
        // We'll simulate 20-50 sales per shift
        const numberOfSales = Math.floor(Math.random() * 30) + 20;

        for (let i = 0; i < numberOfSales; i++) {
            // Random time within shift
            const saleTime = addMinutes(currentTime, Math.floor(Math.random() * 480));
            const sale = await actions.makeSale(org.id, shift.id, saleTime);

            if (sale) {
                fuelSalesData[sale.nozzleId] = (fuelSalesData[sale.nozzleId] || 0) + sale.liters;
                if (sale.type === 'CARD') cardTotal += sale.amount;
                if (sale.type === 'CREDIT') creditTotal += sale.amount;
            }
        }

        // Close Shift
        await actions.closeShift(org.id, shift.id, shiftEndTime, fuelSalesData, cardTotal, creditTotal);

        // Periodic Checks (After every shift)
        await actions.checkInventory(org.id, shiftEndTime);
        await actions.manageFinance(org.id, shiftEndTime);

        // Move to next shift start
        currentTime = shiftEndTime;
    }

    console.log('✅ Simulation Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
