
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Ensure PlanType is available (fallback if not exported)
type PlanType = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

async function main() {
    console.log('Starting SaaS Migration...')

    // 1. Create Default Organization if not exists
    let defaultOrg = await prisma.organization.findUnique({
        where: { slug: 'default' }
    })

    if (!defaultOrg) {
        console.log('Creating Default Organization...')
        defaultOrg = await prisma.organization.create({
            data: {
                name: 'Default Organization',
                slug: 'default',
                plan: 'PREMIUM', // Use string literal to avoid enum import issues
            }
        })
    }

    // Ensure defaultOrg is not null for following operations
    if (!defaultOrg) {
        throw new Error('Failed to retrieve or create default organization');
    }

    console.log(`Using Organization: ${defaultOrg.name} (${defaultOrg.id})`)

    // 2. Models to migrate (Direct updateMany to defaultOrg)
    const modelsToMigrate = [
        'user', 'station', 'creditCustomer', 'fuel', 'bank', 'shopProduct', 'shift', 'auditLog',
        'expense', 'deposit', 'tank', 'tankDip', 'delivery', 'pumper', 'officeStaff', 'pump',
        'nozzle', 'price', 'safe', 'safeTransaction', 'bankTransaction', 'notification',
        'meterAudit', 'testPour', 'oilSale', 'tender', 'cheque', 'creditSale', 'creditPayment',
        'salaryPayment', 'officeStaffSalaryPayment', 'loanPumper', 'loanOfficeStaff',
        'loanExternal', 'shiftTemplate', 'posTerminal', 'posBatch', 'posBatchTerminalEntry',
        'posMissingSlip', 'shopPurchaseBatch', 'shopAssignment', 'shopShiftItem',
        'shopSale', 'shopWastage', 'shiftAssignment'
    ];

    for (const model of modelsToMigrate) {
        try {
            // @ts-ignore - dynamic model access
            const count = await prisma[model].updateMany({
                where: { organizationId: null },
                data: { organizationId: defaultOrg.id }
            });
            if (count.count > 0) {
                console.log(`Migrated ${count.count} ${model} records.`)
            }
        } catch (e) {
            // console.log(`Skipping ${model} (possibly missing organizationId)`)
        }
    }

    console.log('Migration Complete!')
}

main()
    .catch((e) => {
        console.error('Migration Failed:')
        console.error(e.message)
        console.error(JSON.stringify(e, null, 2))
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
