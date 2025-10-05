import { NextRequest, NextResponse } from 'next/server'
import { getShifts, getShiftsByStationId, getActiveShifts, getShiftById, createShift, getAssignmentsByShiftId } from '@/data/shifts.seed'
import { getStationById } from '@/data/stations.seed'
import { auditOperations } from '@/lib/auditMiddleware'

export async function GET(request: NextRequest) {
  try {
    console.log('=== SHIFTS API GET REQUEST ===')
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const active = searchParams.get('active')
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const openedBy = searchParams.get('openedBy')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    console.log('Request params:', { stationId, active, id, status, startDate, endDate, openedBy, page, limit })

    if (id) {
      console.log('Looking for shift with ID:', id)
      const shift = getShiftById(id)
      console.log('Found shift:', shift)
      if (!shift) {
        return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
      }
      return NextResponse.json(shift)
    }

    // Get base shifts data
    let shifts = getShifts()

    // Apply filters
    if (stationId) {
      shifts = shifts.filter(shift => shift.stationId === stationId)
    }

    if (active === 'true') {
      shifts = shifts.filter(shift => shift.status === 'OPEN')
    }

    if (status) {
      shifts = shifts.filter(shift => shift.status === status)
    }

    if (openedBy) {
      shifts = shifts.filter(shift => 
        shift.openedBy.toLowerCase().includes(openedBy.toLowerCase())
      )
    }

    if (startDate) {
      const start = new Date(startDate)
      shifts = shifts.filter(shift => new Date(shift.startTime) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      shifts = shifts.filter(shift => new Date(shift.startTime) <= end)
    }

    // Sort by start time (newest first)
    shifts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

    // Add assignment counts to each shift, use stored statistics if available
    const shiftsWithStats = shifts.map(shift => {
      const assignments = getAssignmentsByShiftId(shift.id)
      
      // If shift is closed but doesn't have statistics, calculate them
      if (shift.status === 'CLOSED' && !shift.statistics) {
        const totalLiters = assignments.reduce((sum, assignment) => {
          if (assignment.endMeterReading && assignment.startMeterReading) {
            return sum + (assignment.endMeterReading - assignment.startMeterReading)
          }
          return sum
        }, 0)
        
        const totalSales = assignments.reduce((sum, assignment) => {
          if (assignment.endMeterReading && assignment.startMeterReading) {
            const litersSold = assignment.endMeterReading - assignment.startMeterReading
            return sum + (litersSold * 470) // Rs. 470 per liter
          }
          return sum
        }, 0)
        
        const durationHours = shift.endTime ? 
          (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60) : 0
        
        return {
          ...shift,
          statistics: {
            durationHours: Math.round(durationHours * 100) / 100,
            totalSales: Math.round(totalSales),
            totalLiters: Math.round(totalLiters * 100) / 100,
            averagePricePerLiter: totalLiters > 0 ? Math.round((totalSales / totalLiters) * 100) / 100 : 0,
            assignmentCount: assignments.length,
            closedAssignments: assignments.filter(a => a.status === 'CLOSED').length
          }
        }
      }
      
      return {
        ...shift,
        statistics: shift.statistics || {
          assignmentCount: assignments.length,
          totalSales: 0, // Will be calculated when shift is closed
          totalLiters: 0, // Will be calculated when shift is closed
          durationHours: 0, // Will be calculated when shift is closed
          averagePricePerLiter: 0,
          closedAssignments: assignments.filter(a => a.status === 'CLOSED').length
        }
      }
    })

    // Pagination
    const total = shiftsWithStats.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedShifts = shiftsWithStats.slice(startIndex, endIndex)

    // Calculate summary statistics
    const summary = {
      total,
      active: shifts.filter(s => s.status === 'OPEN').length,
      closed: shifts.filter(s => s.status === 'CLOSED').length,
      today: shifts.filter(s => {
        const today = new Date().toDateString()
        return new Date(s.startTime).toDateString() === today
      }).length
    }

    console.log('Filtered shifts:', paginatedShifts.length)
    console.log('Summary:', summary)
    
    // Include assignments for active shifts when requested
    const shiftsWithAssignments = paginatedShifts.map(shift => {
      if (active === 'true' && shift.status === 'OPEN') {
        const assignments = getAssignmentsByShiftId(shift.id)
        return {
          ...shift,
          assignments: assignments
        }
      }
      return shift
    })

    return NextResponse.json({
      shifts: shiftsWithAssignments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary
    })
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.stationId || !body.templateId || !body.startTime) {
      return NextResponse.json({ 
        error: 'Missing required fields: stationId, templateId, startTime' 
      }, { status: 400 })
    }

    // Validate station exists and is active
    const station = getStationById(body.stationId)
    if (!station || !station.isActive) {
      return NextResponse.json({ 
        error: 'Station not found or inactive' 
      }, { status: 400 })
    }

    // Validate template exists
    const { getShiftTemplateById } = await import('@/data/shiftTemplates.seed')
    const template = getShiftTemplateById(body.templateId)
    if (!template) {
      return NextResponse.json({ 
        error: 'Shift template not found' 
      }, { status: 400 })
    }

    // Note: Removed station-level shift overlap validation
    // Multiple shifts can now run at the same station simultaneously
    // Nozzle-level conflicts are handled in the frontend by filtering available nozzles

    // Create the shift with validation
    const newShift = createShift({
      stationId: body.stationId,
      templateId: body.templateId,
      startTime: body.startTime,
      openedBy: body.openedBy || 'System',
      status: 'OPEN'
    })

    console.log('=== SHIFT CREATION DEBUG ===')
    console.log('Created shift with ID:', newShift.id)
    console.log('Shift data:', newShift)
    
    // Debug: Verify the shift was actually stored
    const allShifts = getShifts()
    console.log('All shifts after creation:', allShifts.map(s => ({ id: s.id, status: s.status })))
    console.log('Global shifts array:', globalThis.__shifts)
    console.log('Global shifts length:', globalThis.__shifts?.length || 0)
    console.log('=== END SHIFT CREATION DEBUG ===')

    // Audit logging
    if (station) {
      await auditOperations.shiftOpened(request, newShift.id, station.id, station.name)
    }

    return NextResponse.json(newShift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
