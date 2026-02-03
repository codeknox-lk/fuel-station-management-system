import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { CreateOfficeStaffSchema } from '@/lib/schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('stationId')
    const activeOnly = searchParams.get('active') === 'true'
    const role = searchParams.get('role')

    const where: Prisma.OfficeStaffWhereInput = {}

    if (stationId) {
      where.stationId = stationId
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.role = role as any
    }

    const officeStaff = await prisma.officeStaff.findMany({
      where,
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(officeStaff)
  } catch (error) {
    console.error('Error fetching office staff:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔄 POST /api/office-staff - Creating new office staff:', body)

    // Zod Validation
    const result = CreateOfficeStaffSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      name,
      employeeId,
      stationId,
      role,
      phone,
      email,
      baseSalary,
      specialAllowance,
      otherAllowances,
      medicalAllowance,
      holidayAllowance,
      fuelAllowance,
      hireDate,
      isActive
    } = result.data

    console.log('✅ Validation passed using Zod')

    // Auto-generate employee ID if not provided
    let finalEmployeeId = employeeId?.trim() || null

    if (!finalEmployeeId) {
      // Find the highest existing employee ID for office staff
      const allOfficeStaff = await prisma.officeStaff.findMany({
        where: {
          employeeId: { not: null }
        },
        select: {
          employeeId: true
        }
      })

      // Extract numbers from employee IDs (e.g., OFC001 -> 1, OFC002 -> 2)
      const employeeNumbers = allOfficeStaff
        .map(s => {
          const match = s.employeeId?.match(/OFC(\d+)/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => n > 0)

      // Get the next number
      const nextNumber = employeeNumbers.length > 0
        ? Math.max(...employeeNumbers) + 1
        : 1

      // Generate employee ID with 3-digit padding (OFC001, OFC002, etc.)
      finalEmployeeId = `OFC${String(nextNumber).padStart(3, '0')}`
    }

    // Check for duplicates
    const existing = await prisma.officeStaff.findFirst({
      where: {
        name: name.trim(),
        employeeId: finalEmployeeId,
        stationId
      }
    })

    if (existing) {
      return NextResponse.json({
        error: 'Office staff already exists',
        details: `An office staff with name "${name}" and employee ID "${finalEmployeeId}" already exists at this station`,
        existingId: existing.id
      }, { status: 400 })
    }

    // Create new office staff
    const finalFuelAllowance = (role === 'MANAGER')
      ? (fuelAllowance !== undefined && fuelAllowance !== null && fuelAllowance !== 0 ? fuelAllowance : 0)
      : 0 // Only managers can have fuel allowance

    console.log('📝 Creating office staff with data:', {
      name: name.trim(),
      employeeId: finalEmployeeId,
      stationId,
      role: role || 'OFFICE_STAFF',
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      baseSalary: baseSalary,
      specialAllowance,
      otherAllowances,
      medicalAllowance,
      holidayAllowance,
      fuelAllowance: finalFuelAllowance,
      hireDate: hireDate || null,
      isActive: isActive !== undefined ? isActive : true
    })

    const newOfficeStaff = await prisma.officeStaff.create({
      data: {
        name: name.trim(),
        employeeId: finalEmployeeId,
        stationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: (role as any) || 'OFFICE_STAFF',
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        baseSalary: baseSalary,
        specialAllowance: specialAllowance,
        otherAllowances: otherAllowances,
        medicalAllowance: medicalAllowance,
        holidayAllowance: holidayAllowance,
        fuelAllowance: finalFuelAllowance,
        hireDate: hireDate || null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('✅ Office staff created successfully:', newOfficeStaff.id)

    // Create audit log for office staff creation
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          userName: 'System User',
          userRole: 'MANAGER',
          action: 'CREATE',
          entity: 'Office Staff',
          entityId: newOfficeStaff.id,
          details: `Created office staff: ${newOfficeStaff.name} (${newOfficeStaff.employeeId}) - ${newOfficeStaff.role}`,
          stationId: newOfficeStaff.stationId
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return NextResponse.json(newOfficeStaff, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating office staff:', error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error name:', error.name)
      console.error('Error stack:', error.stack)

      // Check if it's a Prisma model not found error
      if (error.message.includes('officeStaff') || error.message.includes('OfficeStaff')) {
        console.error('⚠️ Prisma Client may not have been regenerated. Run: npx prisma generate')
        return NextResponse.json({
          error: 'Database model not found',
          details: 'Prisma Client may need to be regenerated. Please restart the server.'
        }, { status: 500 })
      }

      if (error.message.includes('Unique constraint') || error.message.includes('P2002')) {
        return NextResponse.json(
          { error: 'An office staff member with this employee ID already exists' },
          { status: 400 }
        )
      }

      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid station ID' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
