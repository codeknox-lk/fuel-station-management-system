import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const limit = searchParams.get('limit')

    // Get single test by ID
    if (id) {
      const test = await prisma.testPour.findUnique({
        where: { id },
        include: {
          shift: {
            select: {
              id: true,
              startTime: true,
              status: true
            }
          },
          nozzle: {
            select: {
              id: true,
              nozzleNumber: true,
              pump: {
                select: {
                  pumpNumber: true
                }
              },
              tank: {
                select: {
                  fuelType: true
                }
              }
            }
          }
        }
      })

      if (!test) {
        return NextResponse.json({ error: 'Test pour not found' }, { status: 404 })
      }

      return NextResponse.json({
        ...test,
        notes: (test as any).notes ?? null
      })
    }

    // Get all tests - includes test pours from both OPEN and CLOSED shifts
    // No filter on shift status - we want to show all test pours regardless of shift status
    const tests = await prisma.testPour.findMany({
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            status: true // Include status so frontend can display if from open/closed shift
          }
        },
        nozzle: {
          select: {
            id: true,
            nozzleNumber: true,
            pump: {
              select: {
                pumpNumber: true
              }
            },
            tank: {
              select: {
                fuelType: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' }, // Most recent first
      ...(limit && parseInt(limit) > 0 ? { take: parseInt(limit) } : {})
    })
    
    console.log(`[API] Returning ${tests.length} test pours (from both open and closed shifts)`)

    return NextResponse.json(tests.map((test: any) => ({
      ...test,
      notes: test.notes ?? null
    })))
  } catch (error: any) {
    console.error('[API] Error fetching tests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test pours', details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[API] 📥 POST /api/tests - Starting request...')

    const body = await request.json()
    console.log('[API] 📥 Request body:', {
      stationId: body.stationId,
      nozzleId: body.nozzleId,
      litres: body.litres,
      testTime: body.testTime,
      testedBy: body.testedBy,
      reason: body.reason,
      returned: body.returned
    })

    const {
      stationId,
      shiftId, // Optional: if provided, use this specific shift
      nozzleId,
      litres,
      testTime,
      testedBy,
      reason,
      notes,
      returned = true // Default to returned (fuel put back)
    } = body

    // Validate required fields
    if (!nozzleId || !litres || !testTime || !testedBy) {
      return NextResponse.json(
        { error: 'Nozzle ID, litres, test time, and tested by are required' },
        { status: 400 }
      )
    }

    // Find nozzle and its tank
    const nozzle = await prisma.nozzle.findUnique({
      where: { id: nozzleId },
      include: {
        tank: {
          select: {
            id: true,
            currentLevel: true,
            fuelType: true
          }
        },
        pump: {
          include: {
            station: {
              select: {
                id: true
              }
            }
          }
        }
      }
    })

    if (!nozzle) {
      return NextResponse.json(
        { error: 'Nozzle not found' },
        { status: 400 }
      )
    }

    const tankId = nozzle.tankId
    const stationIdFromNozzle = nozzle.pump?.station?.id || stationId

    if (!stationIdFromNozzle) {
      return NextResponse.json(
        { error: 'Could not determine station for this nozzle' },
        { status: 400 }
      )
    }

    // Use provided shiftId if available, otherwise find or create active shift
    let shift = null
    if (shiftId) {
      // Use the specific shift provided (e.g., when closing a shift)
      // This shift can be OPEN or CLOSED - both are valid
      shift = await prisma.shift.findUnique({
        where: { id: shiftId }
      })
      if (!shift) {
        console.error(`[API] Shift ${shiftId} not found`)
        return NextResponse.json(
          { error: 'Shift not found' },
          { status: 400 }
        )
      }
      console.log(`[API] Using provided shift ${shiftId} with status: ${shift.status}`)
    } else {
      // Find or create active shift (for standalone test pours)
      shift = await prisma.shift.findFirst({
        where: {
          stationId: stationIdFromNozzle,
          status: 'OPEN'
        },
        orderBy: { startTime: 'desc' }
      })
    }

    if (!shift) {
      // Find or create default template
      let template = await prisma.shiftTemplate.findFirst({
        where: {
          stationId: stationIdFromNozzle,
          isActive: true
        }
      })

      if (!template) {
        template = await prisma.shiftTemplate.create({
          data: {
            stationId: stationIdFromNozzle,
            name: 'Default Template',
            startTime: '00:00',
            endTime: '23:59',
            isActive: true
          }
        })
      }

      // Create new shift
      shift = await prisma.shift.create({
        data: {
          stationId: stationIdFromNozzle,
          templateId: template.id,
          startTime: new Date(testTime),
          openedBy: testedBy,
          status: 'OPEN'
        }
      })
    }

    // Map litres to test type
    let testType: 'L5' | 'L50' | 'L100'
    if (litres <= 10) {
      testType = 'L5'
    } else if (litres <= 75) {
      testType = 'L50'
    } else {
      testType = 'L100'
    }

    // Format notes
    let finalNotes = notes || null
    if (reason) {
      const reasonText = reason.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase())
      finalNotes = `Reason: ${reasonText}${finalNotes ? `\n\n${finalNotes}` : ''}`
    }

    // Create test pour and update tank level in a transaction
    const result = await prisma.$transaction(async (tx) => {
      console.log('[API] 🎯 Creating test pour with:', { shiftId: shift!.id, nozzleId, tankId })
      
      // Always reduce tank level first (fuel is taken for testing)
      await tx.tank.update({
        where: { id: tankId },
        data: {
          currentLevel: {
            decrement: parseFloat(litres)
          }
        }
      })
      console.log(`[API] ✅ Removed ${litres}L from tank ${tankId} for testing`)
      
      // If returned, add it back to tank
      if (returned) {
        await tx.tank.update({
          where: { id: tankId },
          data: {
            currentLevel: {
              increment: parseFloat(litres)
            }
          }
        })
        console.log(`[API] ✅ Added ${litres}L back to tank ${tankId} after return`)
      }
      
      // Create test pour record
      const testPour = await tx.testPour.create({
        data: {
          shiftId: shift!.id,
          nozzleId,
          amount: parseFloat(litres),
          testType,
          timestamp: new Date(testTime),
          performedBy: testedBy,
          returned,
          ...(finalNotes ? { notes: finalNotes } : {})
        },
        include: {
          shift: {
            select: {
              id: true,
              startTime: true,
              status: true
            }
          },
          nozzle: {
            select: {
              id: true,
              nozzleNumber: true,
              pump: {
                select: {
                  pumpNumber: true
                }
              },
              tank: {
                select: {
                  fuelType: true
                }
              }
            }
          }
        }
      })

      return testPour
    })

    console.log('[API] ✅ Test pour created successfully:', result.id)

    return NextResponse.json({
      ...result,
      notes: (result as any).notes ?? null
    }, { status: 201 })

  } catch (error: any) {
    console.error('[API] ❌ Error creating test:', {
      error: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    })

    // Handle specific Prisma errors
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid shift or nozzle ID', details: error?.message },
        { status: 400 }
      )
    }

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A test with these details already exists', details: error?.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create test pour', 
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      )
    }

    // Get test pour to retrieve tank and return status
    const test = await prisma.testPour.findUnique({
      where: { id },
      include: {
        nozzle: {
          select: {
            tankId: true
          }
        }
      }
    })

    if (!test) {
      return NextResponse.json(
        { error: 'Test pour not found' },
        { status: 404 }
      )
    }

    // Reverse tank level change in transaction
    await prisma.$transaction(async (tx) => {
      // Delete test pour
      await tx.testPour.delete({
        where: { id }
      })

      // Reverse tank level changes:
      // When test was created: fuel was ALWAYS removed first, then added back if returned
      // When deleting: we need to undo what happened
      // 
      // Case 1: returned=true: removed 50L, added 50L → net 0 change
      //   Current level is same as original
      //   Deleting: Should have NO effect on tank level
      //   
      // Case 2: returned=false: removed 50L, NOT added back → net -50L
      //   Current level is 50L less than original  
      //   Deleting: Should add 50L back
      //
      // Actually, both cases result in the same effect when deleting: we need to "undo" the removal
      // But wait... if returned=true, the current state shows the fuel IS in the tank (it was added back)
      // So deleting should NOT change anything
      //
      // Let me reconsider...
      // returned=false: removed, not returned → level decreased
      //   Delete: add back
      // returned=true: removed, then returned → level unchanged  
      //   Delete: do nothing (or remove the returned fuel?)
      
      if (!test.returned) {
        // Test removed fuel and didn't return it - add it back
        await tx.tank.update({
          where: { id: test.nozzle.tankId },
          data: {
            currentLevel: {
              increment: test.amount
            }
          }
        })
        console.log(`[API] ✅ Reversed discarded test: added back ${test.amount}L to tank`)
      }
      // If returned=true, fuel is already in tank, no change needed when deleting
    })

    return NextResponse.json({ message: 'Test pour deleted successfully' })
  } catch (error: any) {
    console.error('[API] Error deleting test:', error)
    return NextResponse.json(
      { error: 'Failed to delete test pour', details: error?.message },
      { status: 500 }
    )
  }
}
