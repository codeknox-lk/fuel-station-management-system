
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany()
    console.log('Found users:', users.map(u => u.username))

    const targetUser = users.find(u => u.username === 'Developer' || u.username === 'admin')

    if (!targetUser) {
        console.log('No "developer" or "admin" user found. Please specify username.')
        return
    }

    const hashedPassword = await bcrypt.hash('admin123', 10)

    await prisma.user.update({
        where: { id: targetUser.id },
        data: { password: hashedPassword }
    })

    console.log(`Password for user "${targetUser.username}" has been reset to: admin123`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
