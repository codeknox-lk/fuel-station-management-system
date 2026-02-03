/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getAllUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
                isFirstLogin: true,
                createdAt: true,
            },
            orderBy: {
                role: 'asc',
            },
        })

        console.log('\n=== FuelSync User Accounts ===\n')
        console.log(`Total Users: ${users.length}\n`)

        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.username}`)
            console.log(`   Name: ${user.name}`)
            console.log(`   Email: ${user.email}`)
            console.log(`   Role: ${user.role}`)
            console.log(`   First Login: ${user.isFirstLogin ? 'Yes (needs password change)' : 'No'}`)
            console.log(`   Created: ${user.createdAt.toLocaleDateString()}`)
            console.log('')
        })

        console.log('\n=== Password Information ===')
        console.log('Passwords are encrypted (BCrypt hashed) for security.')
        console.log('You cannot retrieve the original passwords.')
        console.log('\nTo reset a password:')
        console.log('1. Log in as OWNER/DEVELOPER')
        console.log('2. Go to Settings > Users')
        console.log('3. Click the Key icon next to the user')
        console.log('4. A temporary password will be generated')
        console.log('\n')

    } catch (error) {
        console.error('Error fetching users:', error)
    } finally {
        await prisma.$disconnect()
    }
}

getAllUsers()
