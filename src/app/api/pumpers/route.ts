import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PumperStatus, PumperShift } from '@prisma/client'
import { CreatePumperSchema } from '@/lib/schemas'
import { getServerUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const shiftId = searchParams.get('shiftId')
    const stationId = searchParams.get('stationId')
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let pumpers

    // If shiftId is provided, get pumpers from shift assignments
    if (shiftId) {
      const assignments = await prisma.shiftAssignment.findMany({
        where: {
          shiftId,
          organizationId: user.organizationId
        },
        select: {
          pumperName: true
        },
        distinct: ['pumperName']
      })

      const pumperNames = assignments.map(a => a.pumperName)

      const where = {
        organizationId: user.organizationId,
        name: { in: pumperNames },
        ...(stationId && { stationId }),
        ...(activeOnly && { isActive: true })
      }

      pumpers = await prisma.pumper.findMany({
        where,
        select: {
          id: true,
          name: true,
          employeeId: true,
          phone: true,
          stationId: true,
          status: true,
          shift: true,
          experience: true,
          rating: true,
          specializations: true,
          isActive: true,
          baseSalary: true,
          holidayAllowance: true,
          hireDate: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { name: 'asc' }
      })
    } else {
      // OPTIMIZED: Get all pumpers with ALL needed fields
      const where = {
        organizationId: user.organizationId,
        ...(stationId && { stationId }),
        ...(activeOnly && { isActive: true })
      }
      pumpers = await prisma.pumper.findMany({
        where,
        select: {
          id: true,
          name: true,
          employeeId: true,
          phone: true,
          stationId: true,
          status: true,
          shift: true,
          experience: true,
          rating: true,
          specializations: true,
          isActive: true,
          baseSalary: true,
          holidayAllowance: true,
          hireDate: true,
          createdAt: true,
          updatedAt: true
        },
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
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()


    // Zod Validation
    const result = CreatePumperSchema.safeParse(body)

    if (!result.success) {
      console.error('❌ Validation failed:', result.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      name,
      phone,
      phoneNumber,
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
    } = result.data

    const phoneToUse = phone || phoneNumber || null

    // ALWAYS auto-generate employee ID
    // Find the highest existing employee ID
    const allPumpers = await prisma.pumper.findMany({
      where: {
        organizationId: user.organizationId,
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



    // CRITICAL: Check for duplicates before creating
    // Check by name + employeeId
    const existing = await prisma.pumper.findFirst({
      where: {
        organizationId: user.organizationId,
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
          organizationId: user.organizationId,
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
        stationId: stationId || undefined,
        status: (status as PumperStatus) || 'ACTIVE',
        shift: (shift as PumperShift) || 'ANY',
        hireDate: hireDate || null,
        experience: experience || null,
        rating: rating || null,
        specializations: specializations,
        baseSalary: baseSalary,
        holidayAllowance: holidayAllowance,
        isActive: isActive !== undefined ? isActive : true,
        organizationId: user.organizationId
      }
    })



    // Create audit log for pumper creation
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          userName: user.username,
          userRole: user.role,
          action: 'CREATE',
          entity: 'Pumper',
          entityId: newPumper.id,
          details: `Created pumper: ${newPumper.name} (${newPumper.employeeId})`,
          stationId: newPumper.stationId || undefined,
          organizationId: user.organizationId
        }
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
      // Don't fail the request if audit logging fails
    }

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
