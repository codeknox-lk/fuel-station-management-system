import { PrismaClient, ShiftStatus, PaymentType, SafeTransactionType } from '@prisma/client';
import { SIMULATION_CONSTANTS, getRandomFloat, getRandomInt, getRandomItem } from './utils';

const prisma = new PrismaClient();

// Helper to get active station ID
async function getStationId(orgId: string) {
    const station = await prisma.station.findFirst({ where: { organizationId: orgId } });
    if (!station) throw new Error('Station not found');
    return station.id;
}

export async function openShift(orgId: string, timestamp: Date) {
    const stationId = await getStationId(orgId);
    const manager = await prisma.user.findFirst({ where: { organizationId: orgId, role: 'MANAGER' } });

    if (!manager) throw new Error('Manager not found');

    // Check if open shift exists
    const existingShift = await prisma.shift.findFirst({
        where: { stationId, status: 'OPEN', organizationId: orgId }
    });
    if (existingShift) throw new Error('Shift already open');

    const shift = await prisma.shift.create({
        data: {
            stationId,
            organizationId: orgId,
            startTime: timestamp,
            status: 'OPEN',
            openedBy: manager.id,
            shiftNumber: `SH-${timestamp.getTime()}`
        }
    });

    // Assign Pumpers to Nozzles
    const pumpers = await prisma.pumper.findMany({ where: { organizationId: orgId } });
    const nozzles = await prisma.nozzle.findMany({ where: { organizationId: orgId } });

    // Simple assignment: One pumper per pump (if sufficient) or round robin

    for (const nozzle of nozzles) {
        const pumper = getRandomItem(pumpers);

        // Get last meter reading
        const lastAssignment = await prisma.shiftAssignment.findFirst({
            where: { nozzleId: nozzle.id, organizationId: orgId },
            orderBy: { createdAt: 'desc' }
        });

        const startReading = lastAssignment?.endMeterReading || 0;

        await prisma.shiftAssignment.create({
            data: {
                shiftId: shift.id,
                nozzleId: nozzle.id,
                pumperName: pumper.name,
                startMeterReading: startReading,
                status: 'ACTIVE',
                organizationId: orgId
            }
        });
    }

    console.log(`[${timestamp.toISOString()}] 🟢 Opened Shift ${shift.shiftNumber}`);
    return shift;
}

export async function makeSale(orgId: string, shiftId: string, timestamp: Date) {
    // Pick a random assignment (nozzle)
    const assignments = await prisma.shiftAssignment.findMany({
        where: { shiftId, organizationId: orgId },
        include: { nozzle: { include: { tank: { include: { fuel: true } } } } }
    });

    if (assignments.length === 0) return;

    const assignment = getRandomItem(assignments);
    const fuel = assignment.nozzle.tank.fuel;

    // Get Price
    const priceRecord = await prisma.price.findFirst({
        where: { fuelId: fuel.id, organizationId: orgId, effectiveDate: { lte: timestamp } },
        orderBy: { effectiveDate: 'desc' }
    });
    const price = priceRecord?.price || 0;

    // Determine Sale Type & Amount
    // 70% Cash, 20% Card, 10% Credit
    const rand = Math.random();
    let type: 'CASH' | 'CARD' | 'CREDIT' = 'CASH';
    if (rand > 0.7) type = 'CARD';
    if (rand > 0.9) type = 'CREDIT';

    // Amount: 500 - 15000 LKR
    const amount = getRandomInt(500, 15000);
    const liters = parseFloat((amount / price).toFixed(2));

    if (type === 'CREDIT') {
        const customers = await prisma.creditCustomer.findMany({ where: { organizationId: orgId } });
        if (customers.length > 0) {
            const customer = getRandomItem(customers);
            await prisma.creditSale.create({
                data: {
                    customerId: customer.id,
                    shiftId,
                    nozzleId: assignment.nozzleId,
                    amount,
                    liters,
                    price,
                    signedBy: 'Driver',
                    timestamp,
                    organizationId: orgId
                }
            });
        }
    } else if (type === 'CARD') {
        // Logic handled in aggregation usually
    }

    return { nozzleId: assignment.nozzleId, liters, amount, type };
}

export async function closeShift(orgId: string, shiftId: string, timestamp: Date, fuelSalesData: Record<string, number>, cardTotal: number, creditTotal: number) {
    const manager = await prisma.user.findFirst({ where: { organizationId: orgId, role: 'MANAGER' } });
    const stationId = await getStationId(orgId);

    // 1. Close Assignments & Update Meters
    const assignments = await prisma.shiftAssignment.findMany({ where: { shiftId, organizationId: orgId }, include: { nozzle: { include: { tank: { include: { fuel: true } } } } } });

    let totalFuelSales = 0;

    // ... (Rest of assignment closing logic remains same, just condensed here for brevity if no changes)
    // But actually I need to copy it all because overwrite replaces everything.

    for (const a of assignments) {
        const litersSold = fuelSalesData[a.nozzleId] || 0;
        const endReading = a.startMeterReading + litersSold;

        await prisma.shiftAssignment.update({
            where: { id: a.id },
            data: {
                endMeterReading: endReading,
                status: 'CLOSED',
                closedAt: timestamp
            }
        });

        if (a.nozzle && a.nozzle.tank) {
            await prisma.tank.update({
                where: { id: a.nozzle.tank.id },
                data: { currentLevel: { decrement: litersSold } }
            });
        }

        const priceRecord = await prisma.price.findFirst({
            where: { fuelId: a.nozzle.tank.fuel.id, organizationId: orgId, effectiveDate: { lte: timestamp } },
            orderBy: { effectiveDate: 'desc' }
        });
        const price = priceRecord?.price || 0;
        totalFuelSales += litersSold * price;
    }

    // 2. Create POS Batch (Simulated)
    if (cardTotal > 0) {
        const terminal = await prisma.posTerminal.findFirst({ where: { stationId, organizationId: orgId } });
        if (terminal) {
            const batch = await prisma.posBatch.create({
                data: {
                    shiftId,
                    totalAmount: cardTotal,
                    organizationId: orgId,
                    isReconciled: true,
                }
            });
            await prisma.posBatchTerminalEntry.create({
                data: {
                    batchId: batch.id,
                    terminalId: terminal.id,
                    startNumber: '001',
                    endNumber: '999',
                    transactionCount: 10,
                    visaAmount: cardTotal,
                    organizationId: orgId
                }
            });
        }
    }

    // Calculate expected cash
    const expectedCash = totalFuelSales - cardTotal - creditTotal;
    // Simulate variance: +/- 500 LKR
    const variance = getRandomInt(-500, 500);
    const declaredCash = expectedCash + variance;

    // 3. Move Cash to Safe
    const safe = await prisma.safe.findUnique({ where: { stationId, organizationId: orgId } });
    if (safe) {
        await prisma.safeTransaction.create({
            data: {
                safeId: safe.id,
                type: 'CASH_FUEL_SALES' as SafeTransactionType, // Corrected Enum
                amount: declaredCash,
                balanceBefore: safe.currentBalance,
                balanceAfter: safe.currentBalance + declaredCash,
                description: `Shift Handover SH-${shiftId.slice(0, 8)}`,
                performedBy: manager?.username || 'SimManager',
                timestamp,
                shiftId: shiftId,
                organizationId: orgId
            }
        });

        await prisma.safe.update({
            where: { id: safe.id },
            data: { currentBalance: { increment: declaredCash } }
        });
    }


    // 4. Close Shift with stats
    await prisma.shift.update({
        where: { id: shiftId },
        data: {
            endTime: timestamp,
            status: 'CLOSED',
            closedBy: manager?.id,
            declaredAmounts: {
                cash: declaredCash,
                shortage: variance < 0 ? Math.abs(variance) : 0,
                excess: variance > 0 ? variance : 0
            },
            statistics: {
                totalSales: totalFuelSales,
                totalVolume: Object.values(fuelSalesData).reduce((a, b) => a + b, 0),
                transactionCount: 100 // Dummy
            }
        }
    });

    console.log(`[${timestamp.toISOString()}] 🔴 Closed Shift | Sales: ${totalFuelSales.toFixed(2)} | Cash: ${declaredCash.toFixed(2)} | Var: ${variance}`);
}

export async function performDip(orgId: string, timestamp: Date) {
    const tanks = await prisma.tank.findMany({ where: { organizationId: orgId } });
    for (const tank of tanks) {
        // Simulate minor discrepancy in dip
        const discrepancy = getRandomInt(-5, 5); // +/- 5 liters
        const dipLevel = tank.currentLevel + discrepancy;

        await prisma.tankDip.create({
            data: {
                tankId: tank.id,
                stationId: tank.stationId,
                recordedBy: 'Manager',
                dipDate: timestamp,
                reading: dipLevel,
                notes: 'Simulated Dip',
                organizationId: orgId
            }
        });
    }
    console.log(`[${timestamp.toISOString()}] 📏 Performed Tank Dips`);
}

export async function checkInventory(orgId: string, timestamp: Date) {
    const tanks = await prisma.tank.findMany({ where: { organizationId: orgId }, include: { fuel: true } });

    for (const tank of tanks) {
        if (tank.currentLevel < tank.capacity * 0.2) {
            // Trigger Delivery
            const quantity = tank.capacity - tank.currentLevel;

            await prisma.tank.update({
                where: { id: tank.id },
                data: { currentLevel: { increment: quantity } }
            });

            await prisma.delivery.create({
                data: {
                    stationId: tank.stationId,
                    tankId: tank.id,
                    quantity,
                    supplier: 'CPC',
                    deliveryDate: timestamp,
                    receivedBy: 'Manager',
                    verificationStatus: 'VERIFIED',
                    organizationId: orgId
                }
            });
            console.log(`[${timestamp.toISOString()}] 🚛 Delivery Received: ${quantity.toFixed(0)}L of ${tank.fuel.code}`);
        }
    }
}

export async function manageFinance(orgId: string, timestamp: Date) {
    const stationId = await getStationId(orgId);
    const safe = await prisma.safe.findUnique({ where: { stationId, organizationId: orgId } });

    if (!safe) return;

    // Deposit if balance > 500,000
    if (safe.currentBalance > 500000) {
        const depositAmount = safe.currentBalance - 50000; // Keep 50k float

        const bank = await prisma.bank.findFirst({ where: { organizationId: orgId } });
        let bankId = bank?.id;

        if (!bankId) {
            // Create a bank if none exists
            const newBank = await prisma.bank.create({
                data: {
                    name: 'BOC',
                    accountNumber: '123456789',
                    // balance removed
                    organizationId: orgId,
                }
            });
            bankId = newBank.id;
        }

        await prisma.safeTransaction.create({
            data: {
                safeId: safe.id,
                type: 'BANK_DEPOSIT',
                amount: depositAmount,
                balanceBefore: safe.currentBalance,
                balanceAfter: safe.currentBalance - depositAmount,
                description: 'Bank Deposit',
                performedBy: 'Manager',
                timestamp,
                organizationId: orgId
            }
        });

        await prisma.safe.update({
            where: { id: safe.id },
            data: { currentBalance: { decrement: depositAmount } }
        });

        await prisma.deposit.create({
            data: {
                stationId,
                bankId,
                accountId: '123456789', // Added required field
                amount: depositAmount,
                depositedBy: 'Manager',
                depositDate: timestamp,
                organizationId: orgId
            }
        });

        console.log(`[${timestamp.toISOString()}] 🏦 Bank Deposit: LKR ${depositAmount.toFixed(2)}`);
    }
}

export async function performExpense(orgId: string, timestamp: Date) {
    const stationId = await getStationId(orgId);
    if (Math.random() < 0.1) { // 10% chance per day
        const amount = getRandomInt(1000, 5000);

        // Check safe balance
        const safe = await prisma.safe.findUnique({ where: { stationId, organizationId: orgId } });
        if (safe && safe.currentBalance >= amount) {
            await prisma.expense.create({
                data: {
                    stationId,
                    category: 'Utilities',
                    description: 'Electricity Bill',
                    amount,
                    fromSafe: true,
                    paidBy: 'Manager',
                    expenseDate: timestamp,
                    organizationId: orgId
                }
            });

            await prisma.safeTransaction.create({
                data: {
                    safeId: safe.id,
                    type: 'EXPENSE' as SafeTransactionType,
                    amount: amount,
                    balanceBefore: safe.currentBalance,
                    balanceAfter: safe.currentBalance - amount,
                    description: 'Expense Payment',
                    performedBy: 'Manager',
                    timestamp,
                    organizationId: orgId
                }
            });

            await prisma.safe.update({
                where: { id: safe.id },
                data: { currentBalance: { decrement: amount } }
            });
            console.log(`[${timestamp.toISOString()}] 💸 Expense Paid: ${amount}`);
        }
    }
}
