import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('shiftId')
    const id = searchParams.get('id')
    const nozzleId = searchParams.get('nozzleId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (id) {
      const audit = await prisma.meterAudit.findUnique({
        where: { id },
        include: {
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              status: true
            }
          },
          nozzle: {
            include: {
              pump: {
                include: {
                  tank: {
                    select: {
                      id: true,
                      fuelType: true
                    }
                  }
                }
              }
            }
          }
        }
      })
      
      if (!audit) {
        return NextResponse.json({ error: 'Meter audit not found' }, { status: 404 })
      }
      return NextResponse.json(audit)
    }

    const where: {
      shiftId?: string
      nozzleId?: string
      timestamp?: {
        gte: Date
        lte: Date
      }
    } = {}
    if (shiftId) {
      where.shiftId = shiftId
    }
    if (nozzleId) {
      where.nozzleId = nozzleId
    }
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const limit = searchParams.get('limit')
    const takeLimit = limit ? parseInt(limit, 10) : undefined

    // Simplify the query to avoid nested include issues
    const audits = await prisma.meterAudit.findMany({
      where,
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        },
        nozzle: {
          select: {
            id: true,
            nozzleNumber: true,
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            },
            tank: {
              select: {
                id: true,
                fuelType: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      ...(takeLimit && takeLimit > 0 ? { take: takeLimit } : {})
    })

    return NextResponse.json(audits)
  } catch (error) {
    console.error('❌ Error fetching meter audits:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Check for specific error types
      if (error.message.includes('prisma')) {
        console.error('Prisma error detected')
      }
      if (error.message.includes('include')) {
        console.error('Include/relation error detected')
      }
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { shiftId, nozzleId, reading, meterReading, previousReading, deltaLitres, variance, status, timestamp, auditTime, auditedBy, notes } = body
    
    // Use auditTime if timestamp is not provided
    const finalTimestamp = timestamp || auditTime
    
    if (!nozzleId || !auditedBy || !finalTimestamp) {
      return NextResponse.json(
        { error: 'Nozzle ID, audited by, and timestamp (or auditTime) are required' },
        { status: 400 }
      )
    }
    
    // Use meterReading for reading if reading is not provided
    const finalReading = reading !== undefined ? reading : meterReading
    const finalMeterReading = meterReading !== undefined ? meterReading : reading
    
    if (finalReading === undefined || finalMeterReading === undefined) {
      return NextResponse.json(
        { error: 'Reading or meter reading is required' },
        { status: 400 }
      )
    }

    // Calculate previous reading, delta, and variance if not provided
    // Get the last audit for this nozzle to calculate previous reading
    let calculatedPreviousReading: number = 0
    let calculatedDeltaLitres: number = 0
    
    try {
      const lastAudit = await prisma.meterAudit.findFirst({
        where: { nozzleId },
        orderBy: { timestamp: 'desc' },
        select: { meterReading: true }
      })
      
      if (lastAudit) {
        calculatedPreviousReading = lastAudit.meterReading
        calculatedDeltaLitres = parseFloat(finalMeterReading) - calculatedPreviousReading
      } else {
        // No previous audit - use current reading as previous (first audit)
        calculatedPreviousReading = parseFloat(finalMeterReading)
        calculatedDeltaLitres = 0
      }
    } catch (e) {
      console.error('Error fetching previous audit:', e)
      // Default to current reading as previous if we can't get previous audit
      calculatedPreviousReading = parseFloat(finalMeterReading)
      calculatedDeltaLitres = 0
    }

    // Ensure previousReading and deltaLitres are always numbers (required fields)
    const finalPreviousReading = previousReading !== undefined ? parseFloat(previousReading) : calculatedPreviousReading
    const finalDeltaLitres = deltaLitres !== undefined ? parseFloat(deltaLitres) : calculatedDeltaLitres

    const newAudit = await prisma.meterAudit.create({
      data: {
        shiftId: shiftId || null,
        nozzleId,
        reading: parseFloat(finalReading),
        meterReading: parseFloat(finalMeterReading),
        previousReading: finalPreviousReading, // Required field - always a number
        deltaLitres: finalDeltaLitres, // Required field - always a number
        variance: variance !== undefined ? parseFloat(variance) : null, // Optional field
        status: status || null,
        timestamp: new Date(finalTimestamp),
        auditTime: auditTime ? new Date(auditTime) : new Date(finalTimestamp),
        auditedBy,
        notes: notes || null
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true
          }
        },
        nozzle: {
          select: {
            id: true,
            nozzleNumber: true,
            pump: {
              select: {
                id: true,
                pumpNumber: true
              }
            },
            tank: {
              select: {
                id: true,
                fuelType: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(newAudit, { status: 201 })
  } catch (error) {
    console.error('Error creating meter audit:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid shift or nozzle ID' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

