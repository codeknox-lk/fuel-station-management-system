/* eslint-disable */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up duplicate shift templates...\n')
  
  const allTemplates = await prisma.shiftTemplate.findMany({
    include: { station: { select: { name: true } } },
    orderBy: { createdAt: 'desc' } // Most recent first
  })
  
  console.log(`Total templates in database: ${allTemplates.length}`)
  
  // Group by unique combination
  const groups = new Map()
  
  allTemplates.forEach(template => {
    const key = `${template.name}-${template.startTime}-${template.endTime}-${template.stationId}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push(template)
  })
  
  console.log(`\nUnique templates: ${groups.size}`)
  console.log(`Duplicates to remove: ${allTemplates.length - groups.size}\n`)
  
  let deletedCount = 0
  
  // For each group, keep the most recent and delete the rest
  for (const [key, templates] of groups) {
    if (templates.length > 1) {
      console.log(`\n📦 "${templates[0].name}" at ${templates[0].station.name}:`)
      console.log(`   Found ${templates.length} copies, keeping most recent, deleting ${templates.length - 1}`)
      
      // Keep first (most recent), delete rest
      for (let i = 1; i < templates.length; i++) {
        console.log(`   ❌ Deleting: ${templates[i].id} (created ${templates[i].createdAt.toLocaleString()})`)
        await prisma.shiftTemplate.delete({
          where: { id: templates[i].id }
        })
        deletedCount++
      }
    }
  }
  
  console.log(`\n✅ Cleanup complete!`)
  console.log(`   Deleted: ${deletedCount} duplicate templates`)
  console.log(`   Remaining: ${groups.size} unique templates`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
