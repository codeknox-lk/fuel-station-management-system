import { NextRequest, NextResponse } from 'next/server'
import { getShiftById, updateShift, getAssignmentsByShiftId } from '@/data/shifts.seed'
import { getPriceByFuelType } from '@/data/prices.seed'
import { getNozzleById, getTankById } from '@/data/tanks.seed'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const shift = getShiftById(id)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Shift already closed' }, { status: 400 })
    }

    // Validate all assignments are closed
    const assignments = getAssignmentsByShiftId(id)
    const openAssignments = assignments.filter(a => a.status === 'ACTIVE')
    
    if (openAssignments.length > 0) {
      return NextResponse.json({ 
        error: `Cannot close shift with ${openAssignments.length} open assignments` 
      }, { status: 400 })
    }

    // Calculate shift statistics
    const shiftStart = new Date(shift.startTime)
    let shiftEnd = new Date(body.endTime || new Date())
    
    console.log('🔍 DURATION DEBUG:')
    console.log('  Shift start time:', shiftStart.toISOString())
    console.log('  Body end time:', body.endTime)
    console.log('  Calculated end time:', shiftEnd.toISOString())
    console.log('  End time <= start time?', shiftEnd <= shiftStart)
    
    // Ensure end time is after start time
    if (shiftEnd <= shiftStart) {
      console.warn('End time is before or equal to start time, using current time')
      shiftEnd = new Date() // Use current time as end time
      console.log('  Using current time as end time:', shiftEnd.toISOString())
    }
    
    const durationHours = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60))
    console.log('  Final duration hours:', durationHours)
    
    // Calculate total sales from assignments using real price data
    const totalSales = assignments.reduce((sum, assignment) => {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        const litersSold = assignment.endMeterReading - assignment.startMeterReading
        // Get real price data (in real app, this would fetch current prices)
        const nozzle = getNozzleById(assignment.nozzleId)
        const tank = nozzle ? getTankById(nozzle.tankId) : null
        const fuelType = tank?.fuelType || 'PETROL_92'
        const priceData = getPriceByFuelType(fuelType)
        const pricePerLiter = priceData?.price || 470 // Fallback price
        return sum + (litersSold * pricePerLiter)
      }
      return sum
    }, 0)

    // Calculate total liters sold
    const totalLiters = assignments.reduce((sum, assignment) => {
      if (assignment.endMeterReading && assignment.startMeterReading) {
        return sum + (assignment.endMeterReading - assignment.startMeterReading)
      }
      return sum
    }, 0)

    // Update the shift with calculated data
    const updatedShift = updateShift(id, {
      status: 'CLOSED',
      endTime: body.endTime || new Date().toISOString(),
      closedBy: body.closedBy || 'System',
      statistics: {
        durationHours: Math.round(durationHours * 100) / 100,
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        assignmentCount: assignments.length,
        closedAssignments: assignments.filter(a => a.status === 'CLOSED').length
      },
      declaredAmounts: {
        cash: body.cashAmount || 0,
        card: body.cardAmount || 0,
        credit: body.creditAmount || 0,
        cheque: body.chequeAmount || 0,
        total: (body.cashAmount || 0) + (body.cardAmount || 0) + (body.creditAmount || 0) + (body.chequeAmount || 0)
      }
    })

    if (!updatedShift) {
      return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
    }

    // Return shift with calculated statistics
    const shiftWithStats = {
      ...updatedShift,
      statistics: {
        durationHours: Math.round(durationHours * 100) / 100,
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        assignmentCount: assignments.length,
        closedAssignments: assignments.filter(a => a.status === 'CLOSED').length
      }
    }

    console.log('Shift closed successfully:', updatedShift.id)
    console.log('Shift statistics:', shiftWithStats.statistics)
    return NextResponse.json(shiftWithStats)
  } catch (error) {
    console.error('Error closing shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
