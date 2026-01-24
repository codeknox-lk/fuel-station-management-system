import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const assignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
      include: {
        nozzle: {
          include: {
            tank: {
              include: {
                fuel: true
              }
            }
          }
        }
      }
    })

    // Calculate comprehensive report data
    const shiftStart = shift.startTime
    const shiftEnd = shift.endTime || new Date()
    const durationHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60)

    // Generate report data with prices from database
    let totalSales = 0
    let totalLiters = 0

    const assignmentReports = await Promise.all(assignments.map(async (assignment) => {
      let litersSold = 0

      if (assignment.endMeterReading && assignment.startMeterReading) {
        // Validate meter readings
        if (assignment.endMeterReading < assignment.startMeterReading) {
          console.error(`Invalid meter reading for assignment ${assignment.id}: end (${assignment.endMeterReading}) < start (${assignment.startMeterReading})`)
          litersSold = 0 // Set to 0 for invalid readings
        } else {
          const calculated = assignment.endMeterReading - assignment.startMeterReading
          // Validate non-negative liters
          if (calculated < 0) {
            console.error(`Negative liters calculated for assignment ${assignment.id}: ${calculated}`)
            litersSold = 0 // Set to 0 for invalid calculations
          } else {
            litersSold = calculated
          }
        }
      }

      totalLiters += litersSold

      // Get current price for the fuel type
      const fuelId = assignment.nozzle.tank.fuelId
      const price = await prisma.price.findFirst({
        where: {
          fuelId,
          stationId: shift.stationId,
          effectiveDate: { lte: shift.startTime },
          isActive: true
        },
        orderBy: { effectiveDate: 'desc' }
      })

      const pricePerLiter = price ? price.price : 470 // Fallback price
      const sales = litersSold * pricePerLiter
      totalSales += sales

      return {
        id: assignment.id,
        nozzleId: assignment.nozzleId,
        nozzleNumber: assignment.nozzle.nozzleNumber,
        pumperName: assignment.pumperName,
        startMeterReading: assignment.startMeterReading,
        endMeterReading: assignment.endMeterReading,
        litersSold: Math.round(litersSold * 100) / 100,
        sales: Math.round(sales),
        pricePerLiter: Math.round(pricePerLiter * 100) / 100,
        fuelName: assignment.nozzle.tank.fuel?.name || 'Unknown',
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        closedAt: assignment.closedAt
      }
    }))

    const reportData = {
      shift: {
        id: shift.id,
        stationId: shift.stationId,
        stationName: shift.station.name,
        templateName: shift.template.name,
        status: shift.status,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: Math.round(durationHours * 100) / 100,
        openedBy: shift.openedBy,
        closedBy: shift.closedBy
      },
      summary: {
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        assignmentCount: assignments.length,
        averageLitersPerHour: durationHours > 0 ? Math.round((totalLiters / durationHours) * 100) / 100 : 0
      },
      assignments: assignmentReports,
      generatedAt: new Date().toISOString(),
      reportType: 'SHIFT_SUMMARY'
    }

    return NextResponse.json({
      success: true,
      message: 'Report data generated successfully',
      data: reportData,
      pdfStub: {
        filename: `shift-report-${shift.id}-${new Date().toISOString().split('T')[0]}.pdf`,
        downloadUrl: `/api/shifts/${id}/report/download`,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error generating shift report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Stub for PDF download endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    return NextResponse.json({
      success: true,
      message: 'PDF generation initiated',
      downloadUrl: `/api/shifts/${id}/report/download`,
      status: 'PROCESSING'
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
