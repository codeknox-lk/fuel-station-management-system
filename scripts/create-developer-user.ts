import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating DEVELOPER user...')
  
  const hashedPassword = await bcrypt.hash('developer123', 10)
  
  // Check if developer user already exists
  const existing = await prisma.user.findUnique({
    where: { username: 'developer' }
  })
  
  if (existing) {
    console.log('✅ Developer user already exists, updating to DEVELOPER role...')
    await prisma.user.update({
      where: { username: 'developer' },
      data: {
        role: 'DEVELOPER',
        password: hashedPassword,
        email: 'developer@system.com',
        isActive: true
      }
    })
    console.log('✅ Developer user updated successfully!')
  } else {
    console.log('📝 Creating new developer user...')
    await prisma.user.create({
      data: {
        username: 'developer',
        email: 'developer@system.com',
        password: hashedPassword,
        role: 'DEVELOPER',
        isActive: true
      }
    })
    console.log('✅ Developer user created successfully!')
  }
  
  console.log('\n📋 Developer Account Credentials:')
  console.log('   Username: developer')
  console.log('   Password: developer123')
  console.log('   Role: DEVELOPER')
  console.log('   Permissions: Full system access + Add/Delete stations\n')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
