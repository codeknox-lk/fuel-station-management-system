import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const shiftId = searchParams.get('shiftId')

    let pumpers

    // If shiftId is provided, get pumpers from shift assignments
    if (shiftId) {
      const assignments = await prisma.shiftAssignment.findMany({
        where: { shiftId },
        select: {
          pumperName: true
        },
        distinct: ['pumperName']
      })
      
      const pumperNames = assignments.map(a => a.pumperName)
      
      const where: any = {
        name: { in: pumperNames }
      }
      if (activeOnly) {
        where.isActive = true
      }
      
      pumpers = await prisma.pumper.findMany({
        where,
        orderBy: { name: 'asc' }
      })
    } else {
      // Get all pumpers with optional active filter
      const where = activeOnly ? { isActive: true } : {}
      pumpers = await prisma.pumper.findMany({
        where,
        orderBy: { name: 'asc' }
      })
    }

    return NextResponse.json(pumpers)
  } catch (error) {
    console.error('Error fetching pumpers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔄 POST /api/pumpers - Creating new pumper')
    
    const { 
      name, 
      phone, 
      phoneNumber, 
      employeeId,
      stationId,
      status,
      shift,
      hireDate,
      experience,
      rating,
      specializations,
      baseSalary,
      holidayAllowance,
      isActive
    } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const phoneToUse = phone || phoneNumber || null

    // ALWAYS auto-generate employee ID
    // Find the highest existing employee ID
    const allPumpers = await prisma.pumper.findMany({
      where: {
        employeeId: { not: null }
      },
      select: {
        employeeId: true
      }
    })

    // Extract numbers from employee IDs (e.g., EMP001 -> 1, EMP002 -> 2)
    const employeeNumbers = allPumpers
      .map(p => {
        const match = p.employeeId?.match(/EMP(\d+)/i)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(n => n > 0)

    // Get the next number
    const nextNumber = employeeNumbers.length > 0 
      ? Math.max(...employeeNumbers) + 1 
      : 1

    // ALWAYS generate employee ID with 3-digit padding (EMP001, EMP002, etc.)
    const finalEmployeeId = `EMP${String(nextNumber).padStart(3, '0')}`
    
    console.log(`🆔 Auto-generated employee ID: ${finalEmployeeId}`)

    // CRITICAL: Check for duplicates before creating
    // Check by name + employeeId
    const existing = await prisma.pumper.findFirst({
      where: {
        name: name.trim(),
        employeeId: finalEmployeeId
      }
    })
    
    if (existing) {
      return NextResponse.json({
        error: 'Pumper already exists',
        details: `A pumper with name "${name}" and employee ID "${finalEmployeeId}" already exists`,
        existingId: existing.id
      }, { status: 400 })
    }

    // Also check by name + phone if phone provided
    if (phoneToUse) {
      const existingByPhone = await prisma.pumper.findFirst({
        where: {
          name: name.trim(),
          phone: phoneToUse
        }
      })
      
      if (existingByPhone) {
        // Only block if it's a true duplicate (same name + phone)
        return NextResponse.json({
          error: 'Pumper already exists',
          details: `A pumper with name "${name}" and phone "${phoneToUse}" already exists`,
          existingId: existingByPhone.id
        }, { status: 400 })
      }
    }

    // Create new pumper with auto-generated employee ID
    const newPumper = await prisma.pumper.create({
      data: {
        name: name.trim(),
        phone: phoneToUse,
        employeeId: finalEmployeeId,
        stationId: stationId || null,
        status: status || 'ACTIVE',
        shift: shift || 'ANY',
        hireDate: hireDate ? new Date(hireDate) : null,
        experience: experience ? parseFloat(String(experience)) : null,
        rating: rating ? parseFloat(String(rating)) : null,
        specializations: Array.isArray(specializations) ? specializations : [],
        baseSalary: baseSalary !== undefined && baseSalary !== null && baseSalary !== '' ? parseFloat(String(baseSalary)) : 0,
        holidayAllowance: holidayAllowance !== undefined && holidayAllowance !== null && holidayAllowance !== '' ? parseFloat(String(holidayAllowance)) : 4500,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    console.log('✅ Pumper created successfully:', newPumper.id)
    return NextResponse.json(newPumper, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating pumper:', error)
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
        return NextResponse.json({
          error: 'Pumper already exists',
          details: 'A pumper with this information already exists in the database'
        }, { status: 400 })
      }
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
