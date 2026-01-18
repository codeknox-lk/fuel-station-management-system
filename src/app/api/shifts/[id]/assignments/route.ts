import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const assignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
      include: {
        nozzle: {
          include: {
            pump: {
              select: {
                id: true,
                pumpNumber: true,
                isActive: true
              }
            },
            tank: {
              select: {
                id: true,
                fuelType: true,
                capacity: true,
                currentLevel: true
              }
            }
          }
        }
      },
      orderBy: { assignedAt: 'asc' }
    })
    
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}