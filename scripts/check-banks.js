/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Current Banks in Database:\n')
  
  const banks = await prisma.bank.findMany({
    orderBy: { name: 'asc' }
  })
  
  banks.forEach((bank, i) => {
    console.log(`${i + 1}. ${bank.name}`)
    console.log(`   Code: ${bank.code || 'NULL'}`)
    console.log(`   Account #: ${bank.accountNumber || 'NULL'}`)
    console.log(`   Account Name: ${bank.accountName || 'NULL'}`)
    console.log(`   Branch: ${bank.branch || 'NULL'}`)
    console.log(`   SWIFT: ${bank.swiftCode || 'NULL'}`)
    console.log(`   Contact: ${bank.contactPerson || 'NULL'}`)
    console.log(`   Phone: ${bank.phone || 'NULL'}`)
    console.log(`   Email: ${bank.email || 'NULL'}`)
    console.log('')
  })
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
