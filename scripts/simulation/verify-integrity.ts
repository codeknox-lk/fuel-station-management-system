import { PrismaClient } from '@prisma/client';
import { SIMULATION_CONSTANTS } from './utils';

const prisma = new PrismaClient();

async function main() {
    console.log('🕵️‍♀️ Starting Deep Integrity Verification...\n');

    const org = await prisma.organization.findFirst({ where: { name: SIMULATION_CONSTANTS.ORG_NAME } });
    if (!org) throw new Error('Org not found');

    // 1. Fuel & Cash Reconciliation
    console.log('--- 1. Fuel & Cash Reconciliation ---');
    const shifts = await prisma.shift.findMany({
        where: { organizationId: org.id, status: 'CLOSED' },
        include: {
            assignments: true,
            posBatches: true,
            creditSales: true
        }
    });

    let totalSalesValue = 0;
    let totalDeclaredCash = 0;
    let totalCard = 0;
    let totalCredit = 0;
    let totalShortage = 0;
    let totalExcess = 0;

    for (const shift of shifts) {
        const stats = shift.statistics as any;
        const declared = shift.declaredAmounts as any;

        totalSalesValue += stats?.totalSales || 0;
        totalDeclaredCash += declared?.cash || 0;
        totalShortage += declared?.shortage || 0;
        totalExcess += declared?.excess || 0;

        for (const b of shift.posBatches) totalCard += b.totalAmount;
        for (const c of shift.creditSales) totalCredit += c.amount;
    }

    console.log(`Total Fuel Sales Value: ${totalSalesValue.toFixed(2)}`);
    console.log(`Total Declared Cash:    ${totalDeclaredCash.toFixed(2)}`);
    console.log(`Total Card Sales:       ${totalCard.toFixed(2)}`);
    console.log(`Total Credit Sales:     ${totalCredit.toFixed(2)}`);

    const reconstructedTotal = totalDeclaredCash + totalCard + totalCredit;
    const variance = reconstructedTotal - totalSalesValue;

    console.log(`Reconstructed Total:    ${reconstructedTotal.toFixed(2)}`);
    console.log(`Net Variance:           ${variance.toFixed(2)}`);
    console.log(`Accumulated Shortage:   ${totalShortage.toFixed(2)}`);
    console.log(`Accumulated Excess:     ${totalExcess.toFixed(2)}`);

    if (Math.abs(variance) < 50000) { // Allow for random variance accumulation
        console.log('✅ Cash Reconciliation Passed (Within acceptable variance)');
    } else {
        console.log('❌ Cash Reconciliation FAILED (Variance too high)');
    }

    // 2. Inventory Check
    console.log('\n--- 2. Inventory Reconciliation ---');
    const tanks = await prisma.tank.findMany({ where: { organizationId: org.id }, include: { fuel: true } });

    const initialLevels: Record<string, number> = {
        '92 Octane': 5000, // Name might vary, rely on Code if possible
        '95 Octane': 4000,
        'Auto Diesel': 8000,
        'Super Diesel': 3000
        // Map codes better
    };

    // Map based on Seed Data codes
    const codeMap: Record<string, number> = {
        'LP92': 5000,
        'LP95': 4000,
        'LAD': 8000,
        'LSD': 3000
    };

    for (const tank of tanks) {
        // Get all deliveries
        const deliveries = await prisma.delivery.findMany({ where: { tankId: tank.id, organizationId: org.id } });
        const totalDelivered = deliveries.reduce((sum, d) => sum + d.quantity, 0);

        // Get all sales for this tank
        // Need to query ShiftAssignments for nozzles linked to this tank
        const assignments = await prisma.shiftAssignment.findMany({
            where: { nozzle: { tankId: tank.id }, organizationId: org.id, endMeterReading: { not: null } }
        });

        const totalSold = assignments.reduce((sum, a) => sum + ((a.endMeterReading || 0) - a.startMeterReading), 0);

        // Initial Level was Capacity * 0.5 (from seed-base)
        const initialLevel = codeMap[tank.fuel.code] || tank.capacity * 0.5;
        const expectedCurrent = initialLevel + totalDelivered - totalSold;

        // Tolerance?
        const diff = expectedCurrent - tank.currentLevel;

        console.log(`Tank ${tank.tankNumber} (${tank.fuel.code}): Start ${initialLevel} + In ${totalDelivered} - Out ${totalSold.toFixed(2)} = Expected ${expectedCurrent.toFixed(2)} | Actual ${tank.currentLevel.toFixed(2)}`);

        if (Math.abs(diff) < 100) { // Tolerance for minor dips/simulation quirks
            console.log(`✅ ${tank.tankNumber} Inventory Balanced`);
        } else {
            console.log(`❌ ${tank.tankNumber} Inventory Mismatch (Diff: ${diff.toFixed(2)})`);
        }
    }

    // 3. Financial Check
    console.log('\n--- 3. Financial System Check ---');
    // Use findFirst instead of findUnique for organizationId
    const safe = await prisma.safe.findFirst({ where: { organizationId: org.id } });
    console.log(`Current Safe Balance: ${safe?.currentBalance.toFixed(2)}`);

    const bank = await prisma.bank.findFirst({ where: { organizationId: org.id }, include: { deposits: true } });
    const totalDeposited = bank?.deposits.reduce((sum, d) => sum + d.amount, 0) || 0;
    console.log(`Total Bank Deposits:  ${totalDeposited.toFixed(2)}`);

    const expenses = await prisma.expense.findMany({ where: { organizationId: org.id } });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`Total Expenses Paid:  ${totalExpenses.toFixed(2)}`);

    // Approximate logical check:
    // Safe Balance ~= Total Declared Cash - Bank Deposits - Expenses
    // (Ignoring initial safe balance which was 0)
    // And assuming no other transactions

    const expectedSafe = totalDeclaredCash - totalDeposited - totalExpenses;
    const safeDiff = expectedSafe - (safe?.currentBalance || 0);

    console.log(`Expected Safe Balance: ${expectedSafe.toFixed(2)}`);
    console.log(`Safe Diff:             ${safeDiff.toFixed(2)}`);

    if (Math.abs(safeDiff) < 10) {
        console.log('✅ Financial System Balanced');
    } else {
        console.log('❌ Financial System Mismatch');
    }

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
