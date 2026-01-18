import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auditOperations } from '@/lib/auditMiddleware'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const station = await prisma.station.findUnique({
      where: { id }
    })
    
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    const { name, address, city, isActive } = body
    
    const updatedStation = await prisma.station.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(isActive !== undefined && { isActive })
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
    const { id } = await params
    
    const station = await prisma.station.findUnique({
      where: { id }
    })
    
    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 })
    }

    // Check for dependencies (shifts, tanks, etc.)
    const hasShifts = await prisma.shift.count({ where: { stationId: id } }) > 0
    const hasTanks = await prisma.tank.count({ where: { stationId: id } }) > 0
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
