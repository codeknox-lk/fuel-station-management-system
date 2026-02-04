
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createDelivery } from '@/app/api/deliveries/route';
import { POST as createTank } from '@/app/api/tanks/route';
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
        stationId: 'test-station-id'
    })
}));

describe('Integration: Stock Flow (Tank -> Delivery -> Stock Update)', () => {
    let stationId: string;
    let fuelId: string; // We need a fuel type usually (Petrol/Diesel). Can create one or mock?
    // In schema, Fuel is a model? Or just ID? 
    // CreateTankSchema says `fuelId: z.string()`.
    // Let's check Prisma schema for Fuel relation if I need to create it.
    // Assuming I can create a Fuel type 'Diesel' or similar.

    let tankId: string;

    beforeAll(async () => {
        // 1. Create Station
        const station = await prisma.station.create({
            data: {
                name: 'Stock Flow Station',
                address: '456 Stock Rd',
                city: 'Stock City',
                isActive: true
            }
        });
        stationId = station.id;

        // 2. Create Fuel Type (if needed) - usually seeded. 
        // Let's check current DB content or create one.
        // Assuming 'Fuel' model exists.
        // If not, I'll check `tank` relation in `api/tanks/route.ts`... createTank uses `fuelId`.
        // Let's create a Fuel record if possible.
        // If Model Fuel doesn't exist, maybe it's an enum or string?
        // Checking `CreateTankSchema`: `fuelId: z.string()`.
        // Let's try creating a Fuel record.
        /* 
           const fuel = await prisma.fuel.create({ data: { name: 'Diesel', type: 'DIESEL', price: 100 } });
           fuelId = fuel.id;
        */
        // I'll search for existing fuel or create one.
        // For now, I'll assumme I need to create one.

        // Wait, does `prisma.fuel` exist? `api/tanks/route.ts` didn't show imports of Fuel model, but it used `fuelId`.
        // Get schema or try creating.
        // I will attempt to create Fuel.
        const fuel = await prisma.fuel.create({
            data: {
                name: 'Test Diesel',
                code: 'DSL',
                category: 'FUEL'
            }
        });
        fuelId = fuel.id;
    });

    afterAll(async () => {
        if (stationId) {
            await prisma.delivery.deleteMany({ where: { stationId } });
            await prisma.tank.deleteMany({ where: { stationId } });
            await prisma.station.delete({ where: { id: stationId } });
        }
        if (fuelId) {
            await prisma.fuel.delete({ where: { id: fuelId } });
        }
    });

    it('should successfully CREATE a Tank', async () => {
        const payload = {
            stationId,
            fuelId,
            capacity: 20000,
            currentLevel: 5000,
            tankNumber: 'T-1'
        };

        const req = createJsonRequest('http://localhost:3000/api/tanks', 'POST', payload);
        const response = await createTank(req);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.id).toBeDefined();
        expect(data.currentLevel).toBe(5000);

        tankId = data.id;
    });

    it('should successfully ADD a Delivery and UPDATE stock', async () => {
        const deliveryQty = 4000;
        const initialLevel = 5000;

        const payload = {
            stationId,
            tankId,
            invoiceQuantity: deliveryQty,
            supplier: 'Test Supplier',
            invoiceNumber: 'INV-123',
            beforeDipReading: initialLevel
        };

        const req = createJsonRequest('http://localhost:3000/api/deliveries', 'POST', payload);
        const response = await createDelivery(req);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.id).toBeDefined();

        // Verify Delivery to trigger stock update
        const { POST: verifyDelivery } = await import('@/app/api/deliveries/[id]/verify/route');

        const verifyPayload = {
            afterDipReading: initialLevel + deliveryQty,
            verifiedBy: 'Integration Stock Manager'
        };

        const reqVerify = createJsonRequest(`http://localhost:3000/api/deliveries/${data.id}/verify`, 'POST', verifyPayload);
        const resVerify = await verifyDelivery(reqVerify, { params: Promise.resolve({ id: data.id }) });

        expect(resVerify.status).toBe(200);

        // Verify Tank Level Updated
        const updatedTank = await prisma.tank.findUnique({ where: { id: tankId } });
        expect(updatedTank).toBeDefined();
        expect(updatedTank?.currentLevel).toBe(initialLevel + deliveryQty);
    });

    // We could verify Shift Close reduction here, but that requires setting up:
    // Shift -> ShiftAssignment -> Nozzle -> Pump -> Tank.
    // That's complex for this test file. "Stock Flow" via Delivery is good enough for now.
    // The "Shift Cycle" test could be expanded to check stock reduction if we added assignments.
});
