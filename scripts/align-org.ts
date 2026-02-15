import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const targetOrg = await prisma.organization.findUnique({ where: { slug: 'ls-fs' } })
    if (!targetOrg) throw new Error('Seth FS org not found')

    console.log(`Aligning everything to Org: ${targetOrg.name} (${targetOrg.id})`)

    // Align User
    await prisma.user.update({
        where: { username: 'developer' },
        data: { organizationId: targetOrg.id }
    })
    console.log('✅ User aligned')

    // Align everything else that might be in 'default'
    const models = [
        'fuel', 'tank', 'pump', 'nozzle', 'pumper', 'price'
    ]

    for (const model of models) {
        // @ts-ignore
        const count = await prisma[model].updateMany({
            data: { organizationId: targetOrg.id }
        })
        console.log(`✅ Aligned ${count.count} ${model} records`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
