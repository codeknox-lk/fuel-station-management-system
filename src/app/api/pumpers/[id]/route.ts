import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pumper = await prisma.pumper.findUnique({
      where: { id }
    })

    if (!pumper) {
      return NextResponse.json({ error: 'Pumper not found' }, { status: 404 })
    }

    return NextResponse.json(pumper)
  } catch (error) {
    console.error('Error fetching pumper:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Find existing pumper
    const existingPumper = await prisma.pumper.findUnique({
      where: { id }
    })

    if (!existingPumper) {
      return NextResponse.json({ error: 'Pumper not found' }, { status: 404 })
    }

    // Extract and validate fields
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

    const finalName = (name !== undefined && name !== '') ? name.trim() : existingPumper.name
    const finalEmployeeId = employeeId !== undefined ? (employeeId?.trim() || null) : existingPumper.employeeId
    const finalPhone = phone !== undefined ? (phone || null) : (phoneNumber !== undefined ? (phoneNumber || null) : existingPumper.phone)

    // CRITICAL: Check for duplicates BEFORE updating
    // Check by name + employeeId
    if (finalName !== existingPumper.name || finalEmployeeId !== existingPumper.employeeId) {
      const duplicateCheck = await prisma.pumper.findFirst({
        where: {
          name: finalName,
          employeeId: finalEmployeeId,
          id: { not: id }
        }
      })

      if (duplicateCheck) {
        return NextResponse.json({
          error: 'Cannot update pumper',
          details: `Another pumper with name "${finalName}" and employee ID "${finalEmployeeId || 'N/A'}" already exists`,
          existingId: duplicateCheck.id
        }, { status: 400 })
      }
    }

    // Check by name + phone if phone is being updated
    if ((phone !== undefined || phoneNumber !== undefined) && finalPhone) {
      const duplicateByPhone = await prisma.pumper.findFirst({
        where: {
          name: finalName,
          phone: finalPhone,
          id: { not: id }
        }
      })

      if (duplicateByPhone) {
        return NextResponse.json({
          error: 'Cannot update pumper',
          details: `Another pumper with name "${finalName}" and phone "${finalPhone}" already exists`,
          existingId: duplicateByPhone.id
        }, { status: 400 })
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}

    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone || null
    if (phoneNumber !== undefined) updateData.phone = phoneNumber || null
    if (employeeId !== undefined) updateData.employeeId = employeeId?.trim() || null
    if (stationId !== undefined) updateData.stationId = stationId && stationId !== '' ? stationId : null
    if (status !== undefined) updateData.status = status
    if (shift !== undefined) updateData.shift = shift
    if (hireDate !== undefined) updateData.hireDate = hireDate && hireDate !== '' ? new Date(hireDate) : null
    if (experience !== undefined) updateData.experience = experience ? parseFloat(String(experience)) : null
    if (rating !== undefined) updateData.rating = rating ? parseFloat(String(rating)) : null
    if (specializations !== undefined) updateData.specializations = Array.isArray(specializations) ? specializations : []
    if (baseSalary !== undefined) updateData.baseSalary = baseSalary !== null && baseSalary !== '' ? parseFloat(String(baseSalary)) : 0
    if (holidayAllowance !== undefined) updateData.holidayAllowance = holidayAllowance !== null && holidayAllowance !== '' ? parseFloat(String(holidayAllowance)) : 4500
    if (isActive !== undefined) updateData.isActive = isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update pumper
    const updatedPumper = await prisma.pumper.update({
      where: { id },
      data: updateData
    })

    console.log('✅ Pumper updated successfully:', updatedPumper.id)
    return NextResponse.json(updatedPumper)
  } catch (error) {
    console.error('❌ Error updating pumper:', error)
    if (error instanceof Error) {
      if (error.message.includes('P2002')) {
        return NextResponse.json({
          error: 'Unique constraint violation',
          details: 'A pumper with this information already exists'
        }, { status: 400 })
      }
      if (error.message.includes('P2025')) {
        return NextResponse.json({
          error: 'Pumper not found',
          details: 'The pumper you are trying to update does not exist'
        }, { status: 404 })
      }
    }
    return NextResponse.json({
      error: 'Failed to update pumper',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pumper = await prisma.pumper.findUnique({
      where: { id }
    })

    if (!pumper) {
      return NextResponse.json({ error: 'Pumper not found' }, { status: 404 })
    }

    // Check for active assignments
    const activeAssignmentsCount = await prisma.shiftAssignment.count({
      where: {
        pumperName: pumper.name,
        status: 'ACTIVE'
      }
    })

    if (activeAssignmentsCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete pumper with active shift assignments',
        details: `This pumper has ${activeAssignmentsCount} active shift assignment(s). Please close the assignments first.`,
        activeAssignments: activeAssignmentsCount
      }, { status: 400 })
    }

    // Check for active loans
    try {
      const activeLoansCount = await prisma.loanPumper.count({
        where: {
          pumperName: pumper.name,
          status: 'ACTIVE'
        }
      })

      if (activeLoansCount > 0) {
        return NextResponse.json({
          error: 'Cannot delete pumper with active loans',
          details: `This pumper has ${activeLoansCount} active loan(s). Please mark the loans as PAID first.`,
          activeLoans: activeLoansCount
        }, { status: 400 })
      }
    } catch (loanError) {
      // Ignore if loan table doesn't exist
      console.log('ℹ️  Loan check skipped')
    }

    // Delete pumper
    await prisma.pumper.delete({
      where: { id }
    })

    console.log('✅ Pumper deleted successfully:', id)
    return NextResponse.json({
      success: true,
      message: 'Pumper deleted successfully',
      deletedPumper: {
        id: pumper.id,
        name: pumper.name
      }
    })
  } catch (error) {
    console.error('❌ Error deleting pumper:', error)
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint') || error.message.includes('P2003')) {
        return NextResponse.json({
          error: 'Cannot delete pumper',
          details: 'This pumper is referenced by other records. Please resolve these references first.'
        }, { status: 400 })
      }
    }
    return NextResponse.json({
      error: 'Failed to delete pumper',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
