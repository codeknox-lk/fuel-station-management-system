import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateShiftSummary, classifyVariance } from '@/lib/calc'
import { getServerUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    console.log('🔍 Tender summary API called for shiftId:', shiftId)
    const { searchParams } = new URL(request.url)
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    let shift
    try {
      // First fetch shift with basic info including statistics and declaredAmounts
      shift = await prisma.shift.findFirst({
        where: { id: shiftId, organizationId: user.organizationId },
        select: {
          id: true,
          stationId: true,
          startTime: true,
          endTime: true,
          status: true,
          statistics: true,
          declaredAmounts: true
        }
      })

      if (!shift) {
        console.error('❌ Shift not found:', shiftId)
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }

      console.log('✅ Shift found:', shift.id, 'Station:', shift.stationId, 'Status:', shift.status)

      interface ShiftStatistics {
        totalSales?: number
        totalLiters?: number
      }
      interface DeclaredAmounts {
        total?: number
        cash?: number
        card?: number
        credit?: number
        cheque?: number
      }

      // If shift is closed and has saved statistics and declared amounts, use them
      // This ensures consistency when viewing a closed shift again
      const shiftStatistics = shift.statistics as unknown as ShiftStatistics
      const shiftDeclaredAmounts = shift.declaredAmounts as unknown as DeclaredAmounts

      if (shift.status === 'CLOSED' && shiftStatistics?.totalSales !== undefined && shiftDeclaredAmounts) {
        console.log('📊 Using saved statistics for closed shift')
        console.log('💰 Saved data:', {
          totalSales: shiftStatistics.totalSales,
          declaredAmounts: shiftDeclaredAmounts
        })

        // Calculate variance from saved data
        const savedTotalSales = shiftStatistics.totalSales || 0
        const savedTotalDeclared = shiftDeclaredAmounts.total ||
          ((shiftDeclaredAmounts.cash || 0) +
            (shiftDeclaredAmounts.card || 0) +
            (shiftDeclaredAmounts.credit || 0) +
            (shiftDeclaredAmounts.cheque || 0))
        const savedVariance = savedTotalSales - savedTotalDeclared

        // Get sales breakdown from saved statistics if available
        const salesBreakdown = {
          totalLitres: shiftStatistics.totalLiters || 0,
          oilSales: {
            totalAmount: 0,
            salesCount: 0
          }
        }

        // Still get oil sales for breakdown
        try {
          const oilSales = await prisma.oilSale.findMany({
            where: {
              stationId: shift.stationId,
              organizationId: user.organizationId,
              saleDate: {
                gte: shift.startTime,
                lte: shift.endTime || new Date()
              }
            }
          })
          const oilTotal = oilSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
          salesBreakdown.oilSales = {
            totalAmount: oilTotal,
            salesCount: oilSales.length
          }
        } catch (e) {
          console.error('Error fetching oil sales:', e)
        }

        // Calculate variance classification
        const varianceClassification = classifyVariance(savedTotalSales, savedTotalDeclared)

        const tenderSummary = {
          totalSales: savedTotalSales,
          totalDeclared: savedTotalDeclared,
          variance: savedVariance,
          varianceClassification: {
            ...varianceClassification,
            variance: savedVariance // Ensure it uses the correct variance
          },
          salesBreakdown
        }

        console.log('✅ Using saved summary:', {
          totalSales: tenderSummary.totalSales,
          totalDeclared: tenderSummary.totalDeclared,
          variance: tenderSummary.variance
        })

        return NextResponse.json(tenderSummary)
      }

      console.log('📊 Calculating summary from assignments (open shift or no saved statistics)')

      // Fetch assignments separately to avoid complex nested includes
      const shiftAssignmentsFromDb = await prisma.shiftAssignment.findMany({
        where: { shiftId: shift.id, organizationId: user.organizationId },
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
                  fuelId: true,
                  fuel: true,
                  capacity: true,
                  currentLevel: true
                }
              }
            }
          }
        }
      })

      // Add assignments to shift object
      // Add assignments to shift object
      interface ExtendedShift {
        assignments?: unknown[] // Use unknown[] as we map it later anyway
      }
      ; (shift as unknown as ExtendedShift).assignments = shiftAssignmentsFromDb

    } catch (dbError) {
      console.error('❌ Database error fetching shift:', dbError)
      if (dbError instanceof Error) {
        console.error('Database error details:', dbError.message)
        console.error('Database error stack:', dbError.stack)
      }
      return NextResponse.json({
        error: 'Database error',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

    // Get credit sales for this shift
    const creditSales = await prisma.creditSale.findMany({
      where: { shiftId, organizationId: user.organizationId }
    })
    const creditTotal = creditSales.reduce((sum, sale) => sum + sale.amount, 0)

    // Get POS batches for this shift
    const posBatches = await prisma.posBatch.findMany({
      where: { shiftId, organizationId: user.organizationId }
    })
    const posTotal = posBatches.reduce((sum, batch) => sum + batch.totalAmount, 0)

    // Get oil sales for this shift - Note: OilSale model doesn't have shiftId, so we'll need to filter by date if needed
    // For now, we'll calculate from shift date range if needed
    const oilSales = await prisma.oilSale.findMany({
      where: {
        stationId: shift.stationId,
        organizationId: user.organizationId,
        saleDate: {
          gte: shift.startTime,
          lte: shift.endTime || new Date()
        }
      }
    })
    const oilTotal = oilSales.reduce((sum, sale) => sum + sale.totalAmount, 0)

    // Get shop sales for this shift
    const shopAssignment = await prisma.shopAssignment.findFirst({
      where: { shiftId, organizationId: user.organizationId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    let shopSalesTotal = 0
    if (shopAssignment) {
      shopAssignment.items.forEach(item => {
        const sold = (item.closingStock !== null)
          ? Math.max(0, (item.openingStock + item.addedStock) - item.closingStock)
          : 0
        shopSalesTotal += sold * item.product.sellingPrice
      })
    }

    // Calculate sales from assignments
    interface SalesDataItem {
      nozzleId: string
      startReading: number
      endReading: number
      delta: number
      pumpSales: number
      price: number
      amount: number
      startTime: Date
      endTime: Date
    }
    let totalPumpSales = 0
    let salesData: SalesDataItem[] = []

    interface AssignmentData {
      endMeterReading?: number | null
      startMeterReading: number
      pumpSales?: number
      nozzleId: string
      fuelName?: string
      fuelId?: string
    }

    interface AssignmentInput {
      nozzleId?: string
      startMeterReading: number | string
      endMeterReading?: number | string | null
      pumpSales?: number | string
      fuelName?: string
      fuelId?: string
    }

    interface ShiftAssignmentWithNozzle {
      nozzleId: string
      startMeterReading: number
      endMeterReading?: number | null
      nozzle?: {
        tank?: {
          fuelId?: string
        }
      }
    }
    interface ExtendedShift {
      assignments: ShiftAssignmentWithNozzle[]
    }

    // Use provided assignments or get from shift
    // Ensure assignments have all required fields with proper type conversion
    const shiftAssignments = assignments.length > 0
      ? assignments.map((a: AssignmentInput) => ({
        nozzleId: String(a.nozzleId || ''),
        startMeterReading: typeof a.startMeterReading === 'number' ? a.startMeterReading : parseFloat(a.startMeterReading) || 0,
        endMeterReading: a.endMeterReading !== null && a.endMeterReading !== undefined
          ? (typeof a.endMeterReading === 'number' ? a.endMeterReading : parseFloat(a.endMeterReading) || null)
          : null,
        pumpSales: typeof a.pumpSales === 'number' ? a.pumpSales : (a.pumpSales ? parseFloat(a.pumpSales) : undefined),
        fuelName: a.fuelName || null,
        fuelId: a.fuelId || null
      }))
      : (shift as unknown as ExtendedShift).assignments.map((a) => ({
        nozzleId: a.nozzleId,
        startMeterReading: a.startMeterReading,
        endMeterReading: a.endMeterReading,
        fuelId: a.nozzle?.tank?.fuelId
      }))

    if (shiftAssignments.length > 0) {
      // Get prices for fuel IDs
      const fuelIds = [...new Set(shiftAssignments.map((a: { fuelId?: string | null }) => a.fuelId).filter(Boolean))] as string[]
      const prices = await Promise.all(
        fuelIds.map(async (fuelId) => {
          const price = await prisma.price.findFirst({
            where: {
              fuelId: fuelId,
              stationId: shift.stationId,
              organizationId: user.organizationId,
              effectiveDate: { lte: shift.endTime || new Date() },
              isActive: true
            },
            orderBy: { effectiveDate: 'desc' }
          })
          return { fuelId, price: price?.price || 0 }
        })
      )

      const priceMap = Object.fromEntries(prices.map(p => [p.fuelId, p.price]))

      salesData = await Promise.all(shiftAssignments.map(async (assignment: AssignmentData) => {
        // Validate meter readings
        const endReading = assignment.endMeterReading || 0
        if (endReading < assignment.startMeterReading) {
          console.error(`Invalid meter reading: end (${endReading}) < start (${assignment.startMeterReading})`)
        }

        const delta = Math.max(0, endReading - assignment.startMeterReading) // Ensure non-negative
        const pumpSales = assignment.pumpSales || delta
        const price = assignment.fuelId ? (priceMap[assignment.fuelId] || 470) : 470

        // Calculate sales amount
        const salesAmount = pumpSales * price

        totalPumpSales += pumpSales

        return {
          nozzleId: assignment.nozzleId,
          startReading: assignment.startMeterReading,
          endReading: assignment.endMeterReading || 0,
          delta,
          pumpSales,
          price,
          amount: salesAmount,
          startTime: shift.startTime,
          endTime: shift.endTime || new Date()
        }
      }))
    }

    // Calculate shift summary
    // Convert salesData to the format expected by calculateShiftSummary (dates as strings)
    // Also validate and sanitize data to prevent NaN or Infinity values
    console.log('📈 Calculating summary from', salesData.length, 'sales items')

    let summary
    try {
      const salesDataForSummary = salesData.map((sale) => {
        const amount = isNaN(sale.amount) || !isFinite(sale.amount) ? 0 : sale.amount
        const price = isNaN(sale.price) || !isFinite(sale.price) ? 470 : sale.price
        const delta = isNaN(sale.delta) || !isFinite(sale.delta) ? 0 : sale.delta

        return {
          nozzleId: String(sale.nozzleId || ''),
          startReading: isNaN(sale.startReading) || !isFinite(sale.startReading) ? 0 : sale.startReading,
          endReading: isNaN(sale.endReading) || !isFinite(sale.endReading) ? 0 : sale.endReading,
          delta,
          price,
          amount,
          startTime: typeof sale.startTime === 'string' ? sale.startTime : (sale.startTime instanceof Date ? sale.startTime.toISOString() : new Date().toISOString()),
          endTime: typeof sale.endTime === 'string' ? sale.endTime : (sale.endTime instanceof Date ? sale.endTime.toISOString() : new Date().toISOString())
        }
      })

      // Validate all amounts are valid numbers before calling calculateShiftSummary
      const validCashAmount = isNaN(cashAmount) || !isFinite(cashAmount) ? 0 : cashAmount
      const validCardAmount = isNaN(cardAmount + posTotal) || !isFinite(cardAmount + posTotal) ? 0 : (cardAmount + posTotal)
      const validCreditAmount = isNaN(creditAmount + creditTotal) || !isFinite(creditAmount + creditTotal) ? 0 : (creditAmount + creditTotal)
      const validChequeAmount = isNaN(chequeAmount) || !isFinite(chequeAmount) ? 0 : chequeAmount

      console.log('💰 Amounts:', { validCashAmount, validCardAmount, validCreditAmount, validChequeAmount })

      summary = calculateShiftSummary(
        salesDataForSummary,
        validCashAmount,
        validCardAmount,
        validCreditAmount,
        validChequeAmount
      )

      console.log('✅ Summary calculated:', summary.totalSales, 'total sales')
    } catch (summaryError) {
      console.error('❌ Error calculating summary:', summaryError)
      // Return a safe default summary
      summary = {
        totalSales: 0,
        totalDeclared: 0,
        variance: 0,
        varianceClassification: {
          variance: 0,
          variancePercentage: 0,
          isNormal: true,
          tolerance: 200
        }
      }
    }

    // Return the summary structure expected by the frontend
    // Ensure variance is calculated correctly: Total Sales - Total Declared
    const calculatedVariance = summary.totalSales - summary.totalDeclared
    console.log('📊 Variance calculation:', {
      totalSales: summary.totalSales,
      totalDeclared: summary.totalDeclared,
      variance: calculatedVariance,
      varianceFromSummary: summary.variance,
      varianceFromClassification: summary.varianceClassification.variance
    })

    const tenderSummary = {
      totalSales: summary.totalSales + shopSalesTotal,
      shopSales: shopSalesTotal,
      nozzleSales: summary.totalSales,
      totalDeclared: summary.totalDeclared,
      variance: calculatedVariance + shopSalesTotal, // Ensure we use the correct calculation
      varianceClassification: classifyVariance(summary.totalSales + shopSalesTotal, summary.totalDeclared),
      salesBreakdown: {
        totalPumpSales,
        totalLitres: totalPumpSales,
        oilSales: {
          totalAmount: oilTotal,
          salesCount: oilSales.length
        },
        shopSales: shopSalesTotal
      }
    }

    console.log('✅ Final tender summary:', {
      totalSales: tenderSummary.totalSales,
      totalDeclared: tenderSummary.totalDeclared,
      variance: tenderSummary.variance
    })

    return NextResponse.json(tenderSummary)
  } catch (error) {
    console.error('❌ ERROR in tender summary API:', error)
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)

      // Check for specific error types
      if (error.message.includes('prisma')) {
        console.error('Database error detected')
      }
      if (error.message.includes('JSON')) {
        console.error('JSON parsing error detected')
      }
    }

    // Return detailed error information
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
}
