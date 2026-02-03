/* eslint-disable */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating DEVELOPER user...')
  
  const hashedPassword = await bcrypt.hash('developer123', 10)
  
  const user = await prisma.user.upsert({
    where: { username: 'developer' },
    update: {
      role: 'DEVELOPER',
      password: hashedPassword,
      email: 'developer@system.com',
      isActive: true
    },
    create: {
      username: 'developer',
      email: 'developer@system.com',
      password: hashedPassword,
      role: 'DEVELOPER',
      isActive: true
    }
  })
  
  console.log('\n✅ Developer user created/updated successfully!')
  console.log('\n📋 Credentials:')
  console.log('   Username: developer')
  console.log('   Password: developer123')
  console.log('   Role:', user.role)
  console.log('   Email:', user.email)
  console.log('\n🔑 Permissions:')
  console.log('   ✅ Full system access')
  console.log('   ✅ Add/Delete stations')
  console.log('   ✅ All OWNER permissions')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
