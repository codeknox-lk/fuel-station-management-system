import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tankUpdates } = body

    if (!tankUpdates || !Array.isArray(tankUpdates) || tankUpdates.length === 0) {
      return NextResponse.json(
        { error: 'Tank updates array is required' },
        { status: 400 }
      )
    }

    // Update all tanks in a transaction, scoped by organizationId
    const results = await prisma.$transaction(
      tankUpdates.map((update: { tankId: string; newLevel: number }) =>
        prisma.tank.update({
          where: { id_organizationId: { id: update.tankId, organizationId: user.organizationId } },
          data: {
            currentLevel: update.newLevel
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      message: `Successfully updated ${results.length} tank(s)`
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating tank stock:', error)
    return NextResponse.json(
      { error: 'Failed to update tank stock' },
      { status: 500 }
    )
  }
}
