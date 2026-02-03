/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing Bank Update...\n')
  
  // Get first bank
  const bank = await prisma.bank.findFirst()
  
  if (!bank) {
    console.log('❌ No banks found in database')
    return
  }
  
  console.log('📦 Current Bank Data:')
  console.log(JSON.stringify(bank, null, 2))
  
  console.log('\n🔧 Updating bank with new fields...')
  
  const updated = await prisma.bank.update({
    where: { id: bank.id },
    data: {
      code: 'TEST',
      accountName: 'Test Account Name',
      swiftCode: 'TESTSWIFT',
      contactPerson: 'Test Contact',
      phone: '0771234567',
      email: 'test@example.com'
    }
  })
  
  console.log('\n✅ Updated Bank Data:')
  console.log(JSON.stringify(updated, null, 2))
  
  console.log('\n✅ Update successful! Check your app now.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
