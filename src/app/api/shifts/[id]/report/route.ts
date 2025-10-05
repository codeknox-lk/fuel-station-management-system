import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, getAssignmentsByShiftId } from '@/data/shifts.seed'
import { getPriceByFuelType } from '@/data/prices.seed'
import { getNozzleById, getTankById } from '@/data/tanks.seed'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shift = getShiftById(id)
    
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const assignments = getAssignmentsByShiftId(id)
    
    // Calculate comprehensive report data
    const shiftStart = new Date(shift.startTime)
    const shiftEnd = shift.endTime ? new Date(shift.endTime) : new Date()
    const durationHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60)
    
    // Sales calculations using real price data
    const totalSales = assignments.reduce((sum, assignment) => {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        const litersSold = assignment.endMeterReading - assignment.startMeterReading
        // Get real price data
        const nozzle = getNozzleById(assignment.nozzleId)
        const tank = nozzle ? getTankById(nozzle.tankId) : null
        const fuelType = tank?.fuelType || 'PETROL_92'
        const pricePerLiter = Number(getPriceByFuelType(fuelType)) || 200 // Fallback price
        return sum + (litersSold * pricePerLiter)
      }
      return sum
    }, 0)

    const totalLiters = assignments.reduce((sum, assignment) => {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        return sum + (assignment.endMeterReading - assignment.startMeterReading)
      }
      return sum
    }, 0)

    // Generate report data
    const reportData = {
      shift: {
        id: shift.id,
        stationId: shift.stationId,
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
      assignments: assignments.map(assignment => {
        const litersSold = assignment.endMeterReading && assignment.startMeterReading 
          ? assignment.endMeterReading - assignment.startMeterReading 
          : 0
        
        // Get real price data for each assignment
        const nozzle = getNozzleById(assignment.nozzleId)
        const tank = nozzle ? getTankById(nozzle.tankId) : null
        const fuelType = tank?.fuelType || 'PETROL_92'
        const pricePerLiter = Number(getPriceByFuelType(fuelType)) || 200 // Fallback price
        const sales = litersSold * pricePerLiter
        
        return {
          id: assignment.id,
          nozzleId: assignment.nozzleId,
          pumperName: assignment.pumperName,
          startMeterReading: assignment.startMeterReading,
          endMeterReading: assignment.endMeterReading,
          litersSold: Math.round(litersSold * 100) / 100,
          sales: Math.round(sales),
          pricePerLiter: Math.round(pricePerLiter * 100) / 100,
          fuelType: fuelType,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          closedAt: assignment.closedAt
        }
      }),
      generatedAt: new Date().toISOString(),
      reportType: 'SHIFT_SUMMARY'
    }

    // In a real application, this would generate a PDF
    // For now, return the structured data that would be used for PDF generation
    return NextResponse.json({
      success: true,
      message: 'Report data generated successfully',
      data: reportData,
      pdfStub: {
        filename: `shift-report-${shift.id}-${new Date().toISOString().split('T')[0]}.pdf`,
        downloadUrl: `/api/shifts/${id}/report/download`, // Stub for PDF download
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
    
    // In a real application, this would:
    // 1. Generate the PDF using a library like puppeteer or jsPDF
    // 2. Store the PDF file
    // 3. Return the file or a download URL
    
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
