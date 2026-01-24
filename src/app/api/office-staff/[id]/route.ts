import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Find existing office staff
    const existing = await prisma.officeStaff.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Office staff not found' }, { status: 404 })
    }

    // Extract fields
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
    } = body

    const finalName = (name !== undefined && name !== '') ? name.trim() : existing.name
    const finalEmployeeId = employeeId !== undefined ? (employeeId?.trim() || null) : existing.employeeId
    const finalStationId = stationId || existing.stationId

    // Check for duplicates before updating
    if (finalName !== existing.name || finalEmployeeId !== existing.employeeId || finalStationId !== existing.stationId) {
      const duplicateCheck = await prisma.officeStaff.findFirst({
        where: {
          name: finalName,
          employeeId: finalEmployeeId,
          stationId: finalStationId,
          id: { not: id }
        }
      })

      if (duplicateCheck) {
        return NextResponse.json({
          error: 'Cannot update office staff',
          details: `Another office staff member with name "${finalName}" and employee ID "${finalEmployeeId || 'N/A'}" already exists at this station`,
          existingId: duplicateCheck.id
        }, { status: 400 })
      }
    }

    // Update office staff
    const finalFuelAllowance = (role !== undefined ? role : existing.role) === 'MANAGER'
      ? (fuelAllowance !== undefined && fuelAllowance !== null && fuelAllowance !== '' ? parseFloat(String(fuelAllowance)) : ((existing as Record<string, any>).fuelAllowance || 0))
      : 0 // Only managers can have fuel allowance

    const updated = await prisma.officeStaff.update({
      where: { id },
      data: {
        name: finalName,
        employeeId: finalEmployeeId,
        stationId: finalStationId,
        role: role !== undefined ? role : existing.role,
        phone: phone !== undefined ? (phone?.trim() || null) : existing.phone,
        email: email !== undefined ? (email?.trim() || null) : existing.email,
        baseSalary: baseSalary !== undefined && baseSalary !== null && baseSalary !== '' ? parseFloat(String(baseSalary)) : existing.baseSalary,
        specialAllowance: specialAllowance !== undefined && specialAllowance !== null && specialAllowance !== '' ? parseFloat(String(specialAllowance)) : ((existing as Record<string, any>).specialAllowance || 0),
        otherAllowances: otherAllowances !== undefined && otherAllowances !== null && otherAllowances !== '' ? parseFloat(String(otherAllowances)) : ((existing as Record<string, any>).otherAllowances || 0),
        medicalAllowance: medicalAllowance !== undefined && medicalAllowance !== null && medicalAllowance !== '' ? parseFloat(String(medicalAllowance)) : ((existing as Record<string, any>).medicalAllowance || 0),
        holidayAllowance: holidayAllowance !== undefined && holidayAllowance !== null && holidayAllowance !== '' ? parseFloat(String(holidayAllowance)) : ((existing as Record<string, any>).holidayAllowance || 0),
        fuelAllowance: finalFuelAllowance,
        hireDate: hireDate !== undefined ? (hireDate ? new Date(hireDate) : null) : existing.hireDate,
        isActive: isActive !== undefined ? isActive : existing.isActive
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating office staff:', error)

    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('P2002'))) {
      return NextResponse.json(
        { error: 'An office staff member with this employee ID already exists' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid station ID' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if office staff exists
    const existing = await prisma.officeStaff.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Office staff not found' },
        { status: 404 }
      )
    }

    // Delete office staff (this will cascade delete salary payments if needed)
    await prisma.officeStaff.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Office staff deleted successfully' })
  } catch (error) {
    console.error('Error deleting office staff:', error)

    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete office staff. There are salary payments associated with this staff member.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}