import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createShift } from '@/app/api/shifts/route';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';

// Helpers to simulate requests
const createJsonRequest = (url: string, method: string, body: unknown) => {
    return new NextRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
};

describe('Integration: Shift Cycle (Open -> Assign -> Close)', () => {
    let organizationId: string;
    let stationId: string;
    let shiftTemplateId: string;
    let shiftId: string;
    let testPumperId: string;
    let testNozzleId: string;

    // Setup: Create a test organization, station and template
    beforeAll(async () => {
        // 0. Create Organization
        const org = await prisma.organization.create({
            data: {
                name: 'Integration Test Org',
                slug: `test-org-${Date.now()}`
            }
        });
        organizationId = org.id;

        // 1. Create Station
        const station = await prisma.station.create({
            data: {
                name: 'Integration Test Station Make',
                address: '123 Test St',
                city: 'Test City',
                isActive: true,
                organizationId: organizationId
            }
        });
        stationId = station.id;

        // 2. Create Shift Template
        const template = await prisma.shiftTemplate.create({
            data: {
                name: 'Test Morning Shift',
                startTime: '06:00',
                endTime: '14:00',
                stationId: stationId,
                organizationId: organizationId
            }
        });
        shiftTemplateId = template.id;

        // 3. Create Fuel
        const fuel = await prisma.fuel.create({
            data: {
                name: 'Test Petrol',
                code: 'TP',
                category: 'PETROL',
                organizationId
            }
        });

        // 4. Create Tank
        const tank = await prisma.tank.create({
            data: {
                tankNumber: 'T1',
                fuelId: fuel.id,
                stationId,
                organizationId,
                capacity: 10000,
                currentLevel: 5000
            }
        });

        // 5. Create Pumper
        const pumper = await prisma.pumper.create({
            data: {
                name: 'Test Pumper One',
                employeeId: `T${Date.now()}`,
                stationId,
                organizationId
            }
        });
        testPumperId = pumper.id;

        // 5.5 Create Pump
        const pump = await prisma.pump.create({
            data: {
                pumpNumber: 'P1',
                stationId,
                organizationId
            }
        });

        // 6. Create Nozzle
        const nozzle = await prisma.nozzle.create({
            data: {
                nozzleNumber: 'N1',
                pumpId: pump.id,
                tankId: tank.id,
                organizationId
            }
        });
        testNozzleId = nozzle.id;

        // 7. Create Test User (for Audit Logging)
        await prisma.user.create({
            data: {
                id: '00000000-0000-0000-0000-000000000001',
                username: 'test-user',
                email: 'test@example.com',
                password: 'hashed-password',
                role: 'MANAGER',
                organizationId
            }
        });
    });

    // Teardown: Cleanup
    afterAll(async () => {
        if (organizationId) {
            await prisma.shiftAssignment.deleteMany({ where: { organizationId } });
            await prisma.shift.deleteMany({ where: { organizationId } });
            await prisma.notification.deleteMany({ where: { organizationId } });
            await prisma.auditLog.deleteMany({ where: { organizationId } });
            await prisma.user.deleteMany({ where: { organizationId } });
            await prisma.nozzle.deleteMany({ where: { organizationId } });
            await prisma.pump.deleteMany({ where: { organizationId } });
            await prisma.pumper.deleteMany({ where: { organizationId } });
            await prisma.tank.deleteMany({ where: { organizationId } });
            await prisma.fuel.deleteMany({ where: { organizationId } });
            await prisma.shiftTemplate.deleteMany({ where: { organizationId } });
            await prisma.station.deleteMany({ where: { organizationId } });
            await prisma.organization.delete({ where: { id: organizationId } });
        }
    });

    it('should handle shift lifecycle (OPEN -> GET -> PATCH)', async () => {
        // 1. OPEN
        const openPayload = {
            stationId,
            organizationId,
            templateId: shiftTemplateId,
            startTime: new Date().toISOString(),
            openedBy: 'Integration Tester',
            assignments: [
                {
                    pumperId: testPumperId,
                    pumperName: 'Test Pumper One',
                    nozzleId: testNozzleId,
                    startMeterReading: 1234.5
                }
            ]
        };
        const openReq = createJsonRequest('http://localhost:3000/api/shifts', 'POST', openPayload);
        const openRes = await createShift(openReq);
        if (openRes.status !== 201) {
            const err = await openRes.json();
            console.error('OPEN failed:', openRes.status, JSON.stringify(err, null, 2));
        }
        expect(openRes.status).toBe(201);
        const openData = await openRes.json();
        shiftId = openData.id;

        // 2. GET (single)
        const { GET: getShift } = await import('@/app/api/shifts/[id]/route');
        const getReq = new NextRequest(`http://localhost:3000/api/shifts/${shiftId}`);
        const getRes = await getShift(getReq, { params: Promise.resolve({ id: shiftId }) });

        if (getRes.status !== 200) {
            const err = await getRes.json();
            console.error('GET (single) failed:', getRes.status, err);
        }
        expect(getRes.status).toBe(200);

        // 3. PATCH
        const { PATCH: updateShift } = await import('@/app/api/shifts/[id]/route');
        const newTime = new Date();
        newTime.setMinutes(newTime.getMinutes() - 5);
        const patchPayload = {
            startTime: newTime.toISOString(),
            openedBy: 'Updated Tester'
        };
        const patchReq = createJsonRequest(`http://localhost:3000/api/shifts/${shiftId}`, 'PATCH', patchPayload);
        const patchRes = await updateShift(patchReq, { params: Promise.resolve({ id: shiftId }) });

        if (patchRes.status !== 200) {
            const err = await patchRes.json();
            console.error('PATCH failed:', patchRes.status, err);
        }
        expect(patchRes.status).toBe(200);
        const patchData = await patchRes.json();
        expect(patchData.openedBy).toBe('Updated Tester');
    });
});
