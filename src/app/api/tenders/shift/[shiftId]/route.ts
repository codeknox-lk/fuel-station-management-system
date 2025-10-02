import { NextRequest, NextResponse } from 'next/server'
import { getShiftById } from '@/data/shifts.seed'
import { getCreditSalesByShiftId } from '@/data/credit.seed'
import { getPosBatchesByShiftId } from '@/data/pos.seed'
import { getOilSalesByShiftId } from '@/data/oilSales.seed'
import { calculateShiftSummary } from '@/lib/calc'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    const { searchParams } = new URL(request.url)
    const cashAmount = parseFloat(searchParams.get('cashAmount') || '0')
    const cardAmount = parseFloat(searchParams.get('cardAmount') || '0')
    const creditAmount = parseFloat(searchParams.get('creditAmount') || '0')
    const chequeAmount = parseFloat(searchParams.get('chequeAmount') || '0')
    
    // Get assignments data if provided
    const assignmentsParam = searchParams.get('assignments')
    let assignments = []
    if (assignmentsParam) {
      try {
        assignments = JSON.parse(decodeURIComponent(assignmentsParam))
      } catch (e) {
        console.error('Failed to parse assignments:', e)
      }
    }

    const shift = getShiftById(shiftId)
    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Get credit sales for this shift
    const creditSales = getCreditSalesByShiftId(shiftId)
    const creditTotal = creditSales.reduce((sum, sale) => sum + sale.amount, 0)

    // Get POS batches for this shift
    const posBatches = getPosBatchesByShiftId(shiftId)
    const posTotal = posBatches.reduce((sum, batch) => sum + batch.totalAmount, 0)

    // Get oil sales for this shift
    const oilSales = getOilSalesByShiftId(shiftId)
    const oilTotal = oilSales.reduce((sum, sale) => sum + sale.totalAmount, 0)

    // Calculate sales from assignments or use mock data
    let salesData = []
    let totalPumpSales = 0
    let totalCanSales = 0
    
    if (assignments.length > 0) {
      salesData = assignments.map((assignment: any) => {
        const delta = (assignment.endMeterReading || 0) - assignment.startMeterReading
        const canSales = assignment.canSales || 0
        const pumpSales = assignment.pumpSales || Math.max(0, delta - canSales)
        const price = 470 // Mock price - in real app, get from price API
        
        totalPumpSales += pumpSales
        totalCanSales += canSales
        
        return {
          nozzleId: assignment.nozzleId,
          startReading: assignment.startMeterReading,
          endReading: assignment.endMeterReading || 0,
          delta,
          pumpSales,
          canSales,
          price,
          amount: delta * price,
          startTime: shift.startTime,
          endTime: shift.endTime || new Date().toISOString()
        }
      })
    } else {
      // Mock sales data - in real app, this would be calculated from meter readings
      salesData = [
        { nozzleId: '1', startReading: 1000, endReading: 1200, delta: 200, pumpSales: 180, canSales: 20, price: 470, amount: 94000, startTime: shift.startTime, endTime: shift.endTime || new Date().toISOString() },
        { nozzleId: '2', startReading: 2000, endReading: 2150, delta: 150, pumpSales: 140, canSales: 10, price: 500, amount: 75000, startTime: shift.startTime, endTime: shift.endTime || new Date().toISOString() },
        { nozzleId: '3', startReading: 3000, endReading: 3200, delta: 200, pumpSales: 190, canSales: 10, price: 440, amount: 88000, startTime: shift.startTime, endTime: shift.endTime || new Date().toISOString() }
      ]
      totalPumpSales = salesData.reduce((sum, sale) => sum + sale.pumpSales, 0)
      totalCanSales = salesData.reduce((sum, sale) => sum + sale.canSales, 0)
    }

    // Calculate shift summary
    const summary = calculateShiftSummary(
      salesData,
      cashAmount,
      cardAmount + posTotal,
      creditAmount + creditTotal,
      chequeAmount
    )

    // Return the summary structure expected by the frontend
    const tenderSummary = {
      totalSales: summary.totalSales,
      totalDeclared: summary.totalDeclared,
      variance: summary.variance,
      varianceClassification: summary.varianceClassification,
      salesBreakdown: {
        totalPumpSales,
        totalCanSales,
        totalLitres: totalPumpSales + totalCanSales,
        oilSales: {
          totalAmount: oilTotal,
          salesCount: oilSales.length
        }
      }
    }

    return NextResponse.json(tenderSummary)
  } catch (error) {
    console.error('Error fetching shift tenders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
