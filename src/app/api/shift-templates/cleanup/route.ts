import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * DELETE /api/shift-templates/cleanup
 * Delete shift templates based on name pattern or all templates
 * Query parameters:
 *   - pattern: 'Template' - Delete templates with names starting with this pattern (default)
 *   - all: 'true' - Delete all templates (use with caution)
 * 
 * Examples:
 *   DELETE /api/shift-templates/cleanup?pattern=Template  - Delete templates starting with "Template"
 *   DELETE /api/shift-templates/cleanup?all=true          - Delete all templates
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patternParam = searchParams.get('pattern')
    const allParam = searchParams.get('all')

    // Determine which templates to delete
    let whereClause: Prisma.ShiftTemplateWhereInput = {}
    let description = 'templates'

    if (allParam === 'true') {
      // Delete all templates
      whereClause = {}
      description = 'all templates'
    } else {
      // Default: delete templates starting with "Template"
      const pattern = patternParam || 'Template'
      whereClause = {
        name: {
          startsWith: pattern
        }
      }
      description = `templates starting with "${pattern}"`
    }

    console.log(`🔍 Checking for ${description}...`)

    // First, count how many templates exist
    const templatesCount = await prisma.shiftTemplate.count({
      where: whereClause
    })

    if (templatesCount === 0) {
      return NextResponse.json({
        message: `No ${description} found`,
        deleted: 0
      })
    }

    // Get templates info before deletion
    const templates = await prisma.shiftTemplate.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        isActive: true,
        stationId: true,
        station: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            shifts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${templatesCount} ${description} to delete`)

    // Check if any templates have associated shifts
    const templatesWithShifts = templates.filter(t => t._count.shifts > 0)

    if (templatesWithShifts.length > 0) {
      // If we're deleting all, we can still proceed, but warn about shifts
      // Otherwise, we should check for shifts
      if (allParam !== 'true') {
        return NextResponse.json({
          error: `Cannot delete ${templatesWithShifts.length} template(s) with existing shifts`,
          templatesWithShifts: templatesWithShifts.map(t => ({
            id: t.id,
            name: t.name,
            shifts: t._count.shifts
          })),
          message: 'Please delete all associated shifts first, or use ?all=true to force delete'
        }, { status: 400 })
      }
    }

    // Delete templates
    // Note: If templates have shifts, we need to delete shifts first (which we already did earlier)
    console.log('🗑️  Deleting templates...')
    const deleteResult = await prisma.shiftTemplate.deleteMany({
      where: whereClause
    })

    console.log(`✅ Successfully deleted ${deleteResult.count} ${description}`)

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} ${description}`,
      deleted: deleteResult.count,
      templates: templates.map(template => ({
        id: template.id,
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        station: template.station.name,
        shifts: template._count.shifts,
        isActive: template.isActive
      }))
    })
  } catch (error) {
    console.error('❌ Error deleting shift templates:', error)

    if (error instanceof Error) {
      return NextResponse.json({
        error: 'Failed to delete shift templates',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

