import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🏁 Starting End-to-End Flow Verification...')

    const baseUrl = 'http://localhost:3000'

    // 1. Real Login
    console.log('Step 0: Logging in...')
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'developer',
            password: 'developer123'
        })
    })

    if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`)

    const setCookie = loginRes.headers.get('set-cookie')
    if (!setCookie) throw new Error('No cookie received')

    // Extract only the part we need for the Cookie header
    const authCookie = setCookie.split(';')[0]
    console.log('✅ Logged in successfully.')

    const headers = {
        'Content-Type': 'application/json',
        'Cookie': authCookie
    }

    // 2. Get Operational Data
    const station = await prisma.station.findFirst()
    const pumper = await prisma.pumper.findFirst()
    const nozzle = await prisma.nozzle.findFirst()

    if (!station || !pumper || !nozzle) throw new Error('Seeded data missing')

    console.log(`Using Station: ${station.name} (${station.id})`)
    console.log(`Using Pumper: ${pumper.name} (${pumper.id})`)
    console.log(`Using Nozzle: ${nozzle.nozzleNumber} (${nozzle.id})`)

    // Step 1: Open Shift
    console.log('Step 1: Opening Shift...')
    const openRes = await fetch(`${baseUrl}/api/shifts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            stationId: station.id,
            type: 'MORNING'
        })
    })
    if (!openRes.ok) throw new Error(`Failed to open shift: ${await openRes.text()}`)
    const shift = await openRes.json()
    console.log(`✅ Shift opened: ${shift.id}`)

    // Step 2: Assign Pumper
    console.log('Step 2: Assigning Pumper...')
    const assignRes = await fetch(`${baseUrl}/api/shifts/${shift.id}/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            nozzleId: nozzle.id,
            pumperName: pumper.name,
            startMeterReading: 1000
        })
    })
    if (!assignRes.ok) throw new Error(`Failed to assign pumper: ${await assignRes.text()}`)
    const assignment = await assignRes.json()
    console.log(`✅ Pumper assigned. Assignment ID: ${assignment.id}`)

    // Step 3: Close Assignment
    console.log('Step 3: Closing Assignment...')
    const closeAssignRes = await fetch(`${baseUrl}/api/shifts/${shift.id}/assignments/${assignment.id}/close`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            endMeterReading: 1100 // 100 liters sold
        })
    })
    if (!closeAssignRes.ok) throw new Error(`Failed to close assignment: ${await closeAssignRes.text()}`)
    console.log('✅ Assignment closed.')

    // Step 4: Close Shift
    console.log('Step 4: Closing Shift...')
    const closeShiftRes = await fetch(`${baseUrl}/api/shifts/${shift.id}/close`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            cashAmount: 35000, // 350 * 100
            closedBy: 'developer'
        })
    })
    if (!closeShiftRes.ok) throw new Error(`Failed to close shift: ${await closeShiftRes.text()}`)
    const closedShift = await closeShiftRes.json()
    console.log('✅ Shift closed successfully!')
    console.log('Final Stats:', JSON.stringify(closedShift.statistics, null, 2))

    console.log('🎉 E2E Flow Verification COMPLETED!')
}

main()
    .catch(err => {
        console.error('❌ Verification FAILED:', err.message)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
