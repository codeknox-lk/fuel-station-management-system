import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const loan = await prisma.loanPumper.findUnique({
      where: { id },
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    if (!loan) {
      return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error fetching pumper loan:', error)
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
    
    console.log('🔄 PUT /api/loans/pumper/[id] - Updating loan:', id)
    console.log('📦 Request body:', JSON.stringify(body, null, 2))
    
    const loan = await prisma.loanPumper.findUnique({
      where: { id }
    })
    
    if (!loan) {
      return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
    }

    const { status, monthlyRental } = body
    
    // Validate status
    const validStatuses = ['ACTIVE', 'PAID', 'OVERDUE']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        error: 'Invalid status',
        details: `Status must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    // Validate monthlyRental
    if (monthlyRental !== undefined && monthlyRental !== null) {
      const rentalValue = parseFloat(monthlyRental)
      if (isNaN(rentalValue) || rentalValue < 0) {
        return NextResponse.json({
          error: 'Invalid monthly rental',
          details: 'Monthly rental must be a non-negative number'
        }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
    }
    if (monthlyRental !== undefined && monthlyRental !== null) {
      updateData.monthlyRental = parseFloat(monthlyRental)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'No fields to update'
      }, { status: 400 })
    }

    const updatedLoan = await prisma.loanPumper.update({
      where: { id },
      data: updateData,
      include: {
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('✅ Loan updated successfully:', {
      id: updatedLoan.id,
      pumperName: updatedLoan.pumperName,
      status: updatedLoan.status
    })

    return NextResponse.json(updatedLoan)
  } catch (error) {
    console.error('❌ Error updating pumper loan:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json({
      error: 'Failed to update loan',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const loan = await prisma.loanPumper.findUnique({
      where: { id }
    })
    
    if (!loan) {
      return NextResponse.json({ error: 'Pumper loan not found' }, { status: 404 })
    }

    // Only allow deletion of PAID loans
    if (loan.status !== 'PAID') {
      return NextResponse.json({
        error: 'Cannot delete loan',
        details: `Only PAID loans can be deleted. This loan has status: ${loan.status}. Please mark it as PAID first.`
      }, { status: 400 })
    }

    await prisma.loanPumper.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Loan deleted successfully' })
  } catch (error) {
    console.error('Error deleting pumper loan:', error)
    return NextResponse.json({
      error: 'Failed to delete loan',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

