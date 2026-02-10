import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerUser } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loan = await prisma.loanOfficeStaff.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } },
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
      return NextResponse.json({ error: 'Office staff loan not found' }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Error fetching office staff loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if loan exists
    const loan = await prisma.loanOfficeStaff.findUnique({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Office staff loan not found' }, { status: 404 })
    }

    // Delete the loan
    await prisma.loanOfficeStaff.delete({
      where: { id_organizationId: { id, organizationId: user.organizationId } }
    })

    return NextResponse.json({ message: 'Loan deleted successfully' })
  } catch (error) {
    console.error('Error deleting office staff loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
