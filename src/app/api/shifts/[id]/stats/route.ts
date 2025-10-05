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
    
    // Calculate comprehensive statistics
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

    // Pumper performance
    const pumperStats = assignments.reduce((acc, assignment) => {
      const pumperId = assignment.pumperId
      if (!acc[pumperId]) {
        acc[pumperId] = {
          pumperName: assignment.pumperName,
          totalLiters: 0,
          totalSales: 0,
          assignmentCount: 0
        }
      }
      
      if (assignment.endMeterReading && assignment.startMeterReading) {
        const litersSold = assignment.endMeterReading - assignment.startMeterReading
        // Get real price data
        const nozzle = getNozzleById(assignment.nozzleId)
        const tank = nozzle ? getTankById(nozzle.tankId) : null
        const fuelType = tank?.fuelType || 'PETROL_92'
        const pricePerLiter = Number(getPriceByFuelType(fuelType)) || 200 // Fallback price
        const sales = litersSold * pricePerLiter
        acc[pumperId].totalLiters += litersSold
        acc[pumperId].totalSales += sales
      }
      acc[pumperId].assignmentCount += 1
      
      return acc
    }, {} as Record<string, any>)

    // Efficiency metrics
    const averageLitersPerHour = durationHours > 0 ? totalLiters / durationHours : 0
    const averageSalesPerHour = durationHours > 0 ? totalSales / durationHours : 0
    const averageLitersPerAssignment = assignments.length > 0 ? totalLiters / assignments.length : 0

    // Status breakdown
    const activeAssignments = assignments.filter(a => a.status === 'ACTIVE').length
    const closedAssignments = assignments.filter(a => a.status === 'CLOSED').length

    const statistics = {
      shift: {
        id: shift.id,
        status: shift.status,
        durationHours: Math.round(durationHours * 100) / 100,
        startTime: shift.startTime,
        endTime: shift.endTime,
        openedBy: shift.openedBy,
        closedBy: shift.closedBy
      },
      sales: {
        totalSales: Math.round(totalSales),
        totalLiters: Math.round(totalLiters * 100) / 100,
        averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
        averageSalesPerHour: Math.round(averageSalesPerHour),
        averageLitersPerHour: Math.round(averageLitersPerHour * 100) / 100
      },
      assignments: {
        total: assignments.length,
        active: activeAssignments,
        closed: closedAssignments,
        averageLitersPerAssignment: Math.round(averageLitersPerAssignment * 100) / 100
      },
      pumperPerformance: Object.values(pumperStats).map((stats: any) => ({
        ...stats,
        totalLiters: Math.round(stats.totalLiters * 100) / 100,
        totalSales: Math.round(stats.totalSales),
        averageLitersPerAssignment: stats.assignmentCount > 0 ? 
          Math.round((stats.totalLiters / stats.assignmentCount) * 100) / 100 : 0
      }))
    }

    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Error calculating shift statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
