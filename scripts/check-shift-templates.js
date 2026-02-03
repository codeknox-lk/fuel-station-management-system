/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📋 Shift Templates in Database:\n')
  
  const templates = await prisma.shiftTemplate.findMany({
    include: {
      station: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`Total: ${templates.length} templates\n`)
  
  templates.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name}`)
    console.log(`   ID: ${t.id}`)
    console.log(`   Station: ${t.station.name}`)
    console.log(`   Time: ${t.startTime} - ${t.endTime}`)
    console.log(`   Break: ${t.breakDuration} mins at ${t.breakStartTime || 'N/A'}`)
    console.log(`   Active: ${t.isActive}`)
    console.log(`   Created: ${t.createdAt.toLocaleString()}`)
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
