import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'
import { getServerUser } from '@/lib/auth-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Ensure the station belongs to the user's organization
    const station = await prisma.station.findUnique({
      where: {
        id,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found or unauthorized' }, { status: 404 })
    }

    const {
      name, address, city, email, openingHours, monthStartDate, monthEndDate, isActive, deliveryToleranceCm,
      defaultEpfRate, defaultCommissionPerThousand, defaultOvertimeMultiplier, defaultRestDayDeductionAmount, defaultAllowedRestDays,
      tankWarningThreshold, tankCriticalThreshold, creditOverdueDays, allowedShiftVariance, maxShiftDurationHours, defaultAdvanceLimit, defaultHolidayAllowance, defaultShopReorderLevel, maxDipVariancePercent, maxDipVarianceLiters, salesTolerance, maxWaterIngressMm
    } = body

    const updatedStation = await prisma.station.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(email !== undefined && { email: email || null }),
        ...(openingHours !== undefined && { openingHours: openingHours || null }),
        ...(monthStartDate !== undefined && { monthStartDate }),
        ...(monthEndDate !== undefined && { monthEndDate: monthEndDate || null }),
        ...(isActive !== undefined && { isActive }),
        ...(deliveryToleranceCm !== undefined && { deliveryToleranceCm: Number(deliveryToleranceCm) }),
        ...(defaultEpfRate !== undefined && { defaultEpfRate: Number(defaultEpfRate) }),
        ...(defaultCommissionPerThousand !== undefined && { defaultCommissionPerThousand: Number(defaultCommissionPerThousand) }),
        ...(defaultOvertimeMultiplier !== undefined && { defaultOvertimeMultiplier: Number(defaultOvertimeMultiplier) }),
        ...(defaultRestDayDeductionAmount !== undefined && { defaultRestDayDeductionAmount: Number(defaultRestDayDeductionAmount) }),
        ...(defaultAllowedRestDays !== undefined && { defaultAllowedRestDays: Number(defaultAllowedRestDays) }),
        ...(tankWarningThreshold !== undefined && { tankWarningThreshold: Number(tankWarningThreshold) }),
        ...(tankCriticalThreshold !== undefined && { tankCriticalThreshold: Number(tankCriticalThreshold) }),
        ...(creditOverdueDays !== undefined && { creditOverdueDays: Number(creditOverdueDays) }),
        ...(allowedShiftVariance !== undefined && { allowedShiftVariance: Number(allowedShiftVariance) }),
        ...(maxShiftDurationHours !== undefined && { maxShiftDurationHours: Number(maxShiftDurationHours) }),
        ...(defaultAdvanceLimit !== undefined && { defaultAdvanceLimit: Number(defaultAdvanceLimit) }),
        ...(defaultHolidayAllowance !== undefined && { defaultHolidayAllowance: Number(defaultHolidayAllowance) }),
        ...(defaultShopReorderLevel !== undefined && { defaultShopReorderLevel: Number(defaultShopReorderLevel) }),
        ...(maxDipVariancePercent !== undefined && { maxDipVariancePercent: Number(maxDipVariancePercent) }),
        ...(maxDipVarianceLiters !== undefined && { maxDipVarianceLiters: Number(maxDipVarianceLiters) }),
        ...(salesTolerance !== undefined && { salesTolerance: Number(salesTolerance) }),
        ...(maxWaterIngressMm !== undefined && { maxWaterIngressMm: Number(maxWaterIngressMm) })
      }
    })

    // Log the station update
    const changes = Object.keys(body).join(', ')
    await auditOperations.stationUpdated(request, id, updatedStation.name, changes)

    return NextResponse.json(updatedStation)
  } catch (error) {
    console.error('Error updating station:', error)
    return NextResponse.json({ error: 'Failed to update station' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // PERMISSION CHECK: Only DEVELOPER/OWNER can delete stations
    if (user.role !== 'DEVELOPER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Permission denied. Only DEVELOPER/OWNER role can delete stations.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const station = await prisma.station.findUnique({
      where: {
        id,
        organizationId: user.organizationId
      }
    })

    if (!station) {
      return NextResponse.json({ error: 'Station not found or unauthorized' }, { status: 404 })
    }

    // Check for dependencies (shifts, tanks, etc.)
    const hasShifts = await prisma.shift.count({ where: { stationId: id } }) > 0
    const hasTanks = await prisma.tank.count({ where: { stationId: id } }) > 0
    // Skip user dependency if needed, or check correctly.
    // For now keep original logic but scoped to org just in case.
    const hasUsers = await prisma.user.count({ where: { stationId: id } }) > 0

    if (hasShifts || hasTanks || hasUsers) {
      return NextResponse.json({
        error: 'Cannot delete station with existing shifts, tanks, or users. Please remove all dependencies first.'
      }, { status: 400 })
    }

    // Log the station deletion
    await auditOperations.stationDeleted(request, id, station.name)

    await prisma.station.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Station deleted successfully' })
  } catch (error) {
    console.error('Error deleting station:', error)
    return NextResponse.json({ error: 'Failed to delete station' }, { status: 500 })
  }
}
