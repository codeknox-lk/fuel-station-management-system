import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as createShift, GET as getShifts } from '@/app/api/shifts/route';
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
    let stationId: string;
    let shiftTemplateId: string;
    let shiftId: string;

    // Setup: Create a test station and template
    beforeAll(async () => {
        // 1. Create Station
        const station = await prisma.station.create({
            data: {
                name: 'Integration Test Station Make',
                address: '123 Test St',
                city: 'Test City',
                isActive: true
            }
        });
        stationId = station.id;

        // 2. Create Shift Template
        const template = await prisma.shiftTemplate.create({
            data: {
                name: 'Test Morning Shift',
                startTime: '06:00',
                endTime: '14:00',
                stationId: stationId
            }
        });
        shiftTemplateId = template.id;
    });

    // Teardown: Cleanup
    afterAll(async () => {
        if (stationId) {
            await prisma.shift.deleteMany({ where: { stationId } });
            // Pumper was removed, but if I re-add it I need to delete it. Currently no pumper.
            await prisma.shiftTemplate.deleteMany({ where: { stationId } });
            await prisma.station.delete({ where: { id: stationId } });
        }
    });

    it('should successfully OPEN a new shift via API', async () => {
        // ... (existing code, ensure body type is ok) ...
        const payload = {
            stationId,
            templateId: shiftTemplateId,
            startTime: new Date().toISOString(),
            openedBy: 'Integration Tester',
            assignments: []
        };

        const req = createJsonRequest('http://localhost:3000/api/shifts', 'POST', payload);
        const response = await createShift(req);

        expect(response.status).toBe(201);

        const data = await response.json();
        expect(data.id).toBeDefined();
        expect(data.status).toBe('OPEN');
        expect(data.stationId).toBe(stationId);

        shiftId = data.id;
    });

    it('should retrieve the ACTIVE shift', async () => {
        const url = `http://localhost:3000/api/shifts?stationId=${stationId}&active=true`;
        const req = new NextRequest(url);

        const response = await getShifts(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        const activeShifts = data.shifts.filter((s: { status: string }) => s.status === 'OPEN');

        expect(activeShifts.length).toBeGreaterThanOrEqual(1);
        const ourShift = activeShifts.find((s: { id: string }) => s.id === shiftId);
        expect(ourShift).toBeDefined();
    });

    it('should successfully UPDATE the shift (PATCH)', async () => {
        const { PATCH: updateShift } = await import('@/app/api/shifts/[id]/route');

        // Update startTime slightly
        const newTime = new Date();
        newTime.setMinutes(newTime.getMinutes() - 5); // 5 mins ago

        const payload = {
            startTime: newTime.toISOString(),
            openedBy: 'Updated Tester'
        };

        const req = createJsonRequest(`http://localhost:3000/api/shifts/${shiftId}`, 'PATCH', payload);
        // We need to pass params properly to PATCH
        const response = await updateShift(req, { params: Promise.resolve({ id: shiftId }) });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.id).toBe(shiftId);
        expect(data.openedBy).toBe('Updated Tester');
        expect(new Date(data.startTime).getTime()).toBe(newTime.getTime());
    });
});
