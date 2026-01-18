import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all audits
    const audits = await prisma.meterAudit.findMany({
      select: {
        variance: true,
        status: true,
        auditTime: true
      }
    })
    
    // Calculate statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayAudits = audits.filter(audit => {
      const auditDate = new Date(audit.auditTime)
      auditDate.setHours(0, 0, 0, 0)
      return auditDate.getTime() === today.getTime()
    })
    
    const varianceAudits = audits.filter(audit => audit.variance !== null && Math.abs(audit.variance) > 5)
    const criticalAudits = audits.filter(audit => audit.variance !== null && Math.abs(audit.variance) > 10)
    
    const totalVariance = audits.reduce((sum, audit) => sum + (audit.variance || 0), 0)
    const averageVariance = audits.length > 0 ? totalVariance / audits.length : 0
    
    const normalAudits = audits.filter(audit => audit.variance === null || Math.abs(audit.variance) <= 5)
    const complianceRate = audits.length > 0 ? (normalAudits.length / audits.length) * 100 : 100
    
    // Group by status
    const statusBreakdown = audits.reduce((acc, audit) => {
      const status = audit.status || 'NORMAL'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const stats = {
      totalAudits: audits.length,
      todayAudits: todayAudits.length,
      varianceCount: varianceAudits.length,
      criticalCount: criticalAudits.length,
      averageVariance: Math.round(averageVariance * 100) / 100,
      complianceRate: Math.round(complianceRate * 100) / 100,
      statusBreakdown
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error calculating audit stats:', error)
    return NextResponse.json({ error: 'Failed to calculate audit statistics' }, { status: 500 })
  }
}
