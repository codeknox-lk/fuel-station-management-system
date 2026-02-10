
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createCustomer } from '@/app/api/credit/customers/route';
import { POST as createSale } from '@/app/api/credit/sales/route';
import { POST as createPayment } from '@/app/api/credit/payments/route';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

// Helpers
const createJsonRequest = (url: string, method: string, body: unknown) => {
    return new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
};

// Mock Auth
import { vi } from 'vitest';
vi.mock('@/lib/auth-server', () => ({
    getServerUser: vi.fn().mockResolvedValue({
        userId: 'test-user-id',
        username: 'Test Manager',
        role: 'MANAGER',
        stationId: 'test-station-id',
        organizationId: 'test-org-id'
    })
}));

describe('Integration: Credit Flow (Customer -> Sale -> Payment)', () => {
    let stationId: string;
    let customerId: string;
    let shiftId: string;
    let nozzleId: string;

    beforeAll(async () => {
        // 1. Setup Station
        const station = await prisma.station.create({
            data: {
                name: 'Credit Flow Station',
                address: '789 Credit Rd',
                city: 'Credit City',
                isActive: true,
                organizationId: 'test-org-id'
            }
        });
        stationId = station.id;

        // 2. Setup Fuel & Infrastructure (needed for Sale)
        // Use upsert to avoid unique constraint errors
        const fuel = await prisma.fuel.upsert({
            where: { code_organizationId: { code: 'C-DSL', organizationId: 'test-org-id' } },
            update: {},
            create: {
                name: 'Credit Diesel',
                code: 'C-DSL',
                category: 'FUEL',
                organizationId: 'test-org-id'
            }
        });

        const tank = await prisma.tank.create({
            data: {
                stationId,
                fuelId: fuel.id,
                capacity: 10000,
                currentLevel: 5000,
                tankNumber: 'T-C1',
                organizationId: 'test-org-id'
            }
        });

        const pump = await prisma.pump.create({
            data: { stationId, pumpNumber: 'P-C1', organizationId: 'test-org-id' }
        });

        const nozzle = await prisma.nozzle.create({
            data: { pumpId: pump.id, tankId: tank.id, nozzleNumber: 'N-C1', organizationId: 'test-org-id' }
        });
        nozzleId = nozzle.id;

        // 3. Setup Shift (needed for Sale)
        const template = await prisma.shiftTemplate.create({
            data: {
                stationId,
                name: 'Credit Template',
                startTime: '06:00',
                endTime: '14:00',
                organizationId: 'test-org-id'
            }
        });

        const shift = await prisma.shift.create({
            data: {
                stationId,
                templateId: template.id,
                startTime: new Date(),
                status: 'OPEN',
                openedBy: 'Credit Mgr',
                organizationId: 'test-org-id'
            }
        });
        shiftId = shift.id;
    });

    afterAll(async () => {
        // Cleanup based on relationships (cascade might handle some, but explicit is safer for tests)
        if (customerId) {
            await prisma.creditSale.deleteMany({ where: { customerId } });
            await prisma.creditPayment.deleteMany({ where: { customerId } });
            await prisma.creditCustomer.delete({ where: { id: customerId } });
        }

        // Remove Shift Dependencies
        if (shiftId) await prisma.shift.delete({ where: { id: shiftId } });

        // Infrastructure Cleanup (Order matters!)
        // Nozzle depends on Pump and Tank
        if (stationId) {
            // Find pumps for this station to delete nozzles
            const pumps = await prisma.pump.findMany({ where: { stationId } });

            // Delete all nozzles for these pumps
            for (const p of pumps) {
                await prisma.nozzle.deleteMany({ where: { pumpId: p.id } });
            }

            await prisma.tank.deleteMany({ where: { stationId } });
            await prisma.pump.deleteMany({ where: { stationId } });
            await prisma.shiftTemplate.deleteMany({ where: { stationId } }); // Clean up templates
            await prisma.safe.deleteMany({ where: { stationId } }); // Clean up Safe created by payment
            await prisma.station.delete({ where: { id: stationId } });
        }

        // Fuel cleanup
        const fuel = await prisma.fuel.findFirst({ where: { code: 'C-DSL' } });
        // Only delete if no other tanks are using it (though our test tanks are gone)
        if (fuel) {
            const tanksUsingFuel = await prisma.tank.count({ where: { fuelId: fuel.id } });
            if (tanksUsingFuel === 0) {
                await prisma.fuel.delete({ where: { id: fuel.id } });
            }
        }
    });

    it('should Create a Credit Customer', async () => {
        const payload = {
            name: 'Test Credit Client',
            phone: '555-0199',
            address: '123 Debt Lane',
            creditLimit: 50000,
            email: 'client@test.com'
        };

        const req = createJsonRequest('http://localhost:3000/api/credit/customers', 'POST', payload);
        const response = await createCustomer(req);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.id).toBeDefined();
        expect(data.currentBalance).toBe(0);

        customerId = data.id;
    });

    it('should Record a Credit Sale (Increase Balance)', async () => {
        const saleAmount = 5000;
        const payload = {
            customerId,
            shiftId,
            nozzleId,
            amount: saleAmount,
            liters: 10,
            price: 500,
            signedBy: 'Driver A',
            timestamp: new Date().toISOString()
        };

        const req = createJsonRequest('http://localhost:3000/api/credit/sales', 'POST', payload);
        const response = await createSale(req);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.id).toBeDefined();

        // Check Customer Balance
        const customer = await prisma.creditCustomer.findUnique({ where: { id: customerId } });
        expect(customer?.currentBalance).toBe(5000);
    });

    it('should Record a Payment (Decrease Balance)', async () => {
        const paymentAmount = 2000;
        const payload = {
            customerId,
            amount: paymentAmount,
            paymentType: 'CASH', // Should trigger Safe transaction if logic works
            receivedBy: 'Cashier B',
            stationId, // Important for Safe Transaction logic
        };

        const req = createJsonRequest('http://localhost:3000/api/credit/payments', 'POST', payload);
        const response = await createPayment(req);

        expect(response.status).toBe(201);

        // Check Customer Balance (5000 - 2000 = 3000)
        const customer = await prisma.creditCustomer.findUnique({ where: { id: customerId } });
        expect(customer?.currentBalance).toBe(3000);

        // Optional: Check Safe Transaction
        const safe = await prisma.safe.findUnique({ where: { stationId } });
        expect(safe).toBeDefined();
        // Check if transaction exists
        const tx = await prisma.safeTransaction.findFirst({
            where: { safeId: safe?.id, type: 'CREDIT_PAYMENT', amount: paymentAmount }
        });
        expect(tx).toBeDefined();
    });
});
