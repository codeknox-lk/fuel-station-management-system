
import { spawn } from 'child_process'

const BASE_URL = 'http://localhost:3001'

async function run() {
    console.log('Starting API Verification...')

    // 1. Register User
    const email = `test-${Date.now()}@example.com`
    const password = 'password123'
    const username = `testadmin-${Date.now()}`
    console.log(`\n1. Registering user: ${username} (${email})`)

    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            username,
            companyName: 'Test Fuel Station ' + Date.now()
        })
    })

    if (!registerRes.ok) {
        console.error('Registration failed:', await registerRes.text())
        process.exit(1)
    }

    const registerData = await registerRes.json()
    console.log('Registration successful. Org ID:', registerData.organization?.id)

    // 2. Login (to get cookie/token if needed, though most APIs usually need headers)
    // But wait, this is NextAuth. It uses cookies.
    // Fetch in node doesn't persist cookies automatically.
    // We might need to extract the cookie from the register response or login response.

    console.log(`\n2. Logging in...`)
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }) // Add username to login body
    })

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text())
        process.exit(1)
    }

    // Extract cookies
    const cookies = loginRes.headers.get('set-cookie')
    console.log('Login successful. Cookies set:', !!cookies)

    const headers = {
        'Cookie': cookies || ''
    }

    // 3. Fetch Dashboard Data (Stations)
    console.log(`\n3. Fetching Stations (Dashboard Data)...`)
    const stationsRes = await fetch(`${BASE_URL}/api/stations?active=true`, { headers })

    if (!stationsRes.ok) {
        console.error('Fetch stations failed:', await stationsRes.text())
    } else {
        const stations = await stationsRes.json()
        console.log(`Stations fetched: ${stations.length}`)

        let stationId = stations.length > 0 ? stations[0].id : null

        if (!stationId) {
            console.log('\n3.1. Creating a Station...')
            const createStationRes = await fetch(`${BASE_URL}/api/stations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({
                    name: 'Test Station ' + Date.now(),
                    address: '123 Test St',
                    city: 'Test City'
                })
            })

            if (!createStationRes.ok) {
                console.error('Create station failed:', await createStationRes.text())
            } else {
                const newStation = await createStationRes.json()
                stationId = newStation.id
                console.log('Station created successfully:', stationId)
            }
        }

        if (stationId) {
            // 4. Fetch Credit Report
            console.log(`\n4. Fetching Credit Report for station ${stationId}...`)
            const today = new Date()
            const year = today.getFullYear()
            const month = String(today.getMonth() + 1).padStart(2, '0')

            const reportRes = await fetch(`${BASE_URL}/api/reports/credit?stationId=${stationId}&year=${year}&month=${month}`, { headers })

            if (!reportRes.ok) {
                console.error('Fetch credit report failed:', await reportRes.text())
            } else {
                const report = await reportRes.json()
                console.log('Credit Report fetched successfully.')
                console.log('Summary:', JSON.stringify(report.summary, null, 2))
            }
        } else {
            console.log('Skipping Credit Report check (no stations found)')
        }
    }

    console.log('\nVerification Complete.')
}

run().catch(console.error)
