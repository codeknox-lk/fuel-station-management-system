
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const models = [
    'user',
    'station',
    'shift',
    'shiftTemplate',
    'shiftAssignment',
    'tank',
    'fuel',
    'pump',
    'nozzle',
    'tankDip',
    'delivery',
    'expense',
    'deposit',
    'loanExternal',
    'loanPumper',
    'loanOfficeStaff',
    'cheque',
    'creditCustomer',
    'creditSale',
    'creditPayment',
    'posTerminal',
    'posBatch',
    'posBatchTerminalEntry',
    'posMissingSlip',
    'safe',
    'safeTransaction',
    'price',
    'meterAudit',
    'testPour',
    'oilSale',
    'tender',
    'shopProduct',
    'shopAssignment',
    'shopShiftItem',
    'shopSale',
    'shopWastage',
    'shopPurchaseBatch',
    'auditLog',
    'notification'
]

async function main() {
    console.log('--- Organization ID Audit ---')

    for (const model of models) {
        try {
            // @ts-expect-error - Dynamic model access is not fully typed in Prisma client
            const count = await prisma[model].count({
                where: {
                    organizationId: null
                }
            })

            if (count > 0) {
                console.log(`❌ Model "${model}": ${count} records with null organizationId`)
            } else {
                // console.log(`✅ Model "${model}": OK`)
            }
        } catch (err) {
            console.error(`⚠️ Error auditing model "${model}":`, err instanceof Error ? err.message : err)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
