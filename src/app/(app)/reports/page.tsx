'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Fuel,
  Building2,
  Clock,
  DollarSign,
  AlertTriangle,
  GitCompare
} from 'lucide-react'

interface ReportCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
  minRole?: 'OWNER' | 'DEVELOPER'
}

export default function ReportsPage() {
  const router = useRouter()
  // specific state for role not needed if we derive from localStorage directly for initial render 
  // but to avoid hydration mismatch we use state or useEffect. 
  // simpler here:
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(localStorage.getItem('userRole') || '')
    }
  }, [])

  const isDeveloper = userRole === 'DEVELOPER'
  const isOwner = userRole === 'OWNER' || isDeveloper

  const allReports: ReportCard[] = [
    {
      title: 'Daily Sales Report (Rs)',
      description: 'Daily fuel sales revenue (Rupees) for each fuel type',
      icon: <BarChart3 className="h-8 w-8" />,
      href: '/reports/daily-sales',
      features: [
        'Sales revenue by fuel type',
        'Daily revenue totals',
        'Fuel type comparison',
        'Revenue trend analysis',
        'Export to PDF/Excel'
      ],
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Daily Sales Report (Liters)',
      description: 'Daily fuel sales volume (Liters) for each fuel type',
      icon: <Fuel className="h-8 w-8" />,
      href: '/reports/daily-sales-liters',
      features: [
        'Sales volume in liters by fuel type',
        'Total volume sold per day',
        'Fuel type comparison',
        'Volume trend analysis',
        'Export to PDF/Excel'
      ],
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Daily Profit Report',
      description: 'Daily profit analysis with revenue and expense breakdown',
      icon: <TrendingUp className="h-8 w-8" />,
      href: '/reports/profit',
      features: [
        'Daily profit calculations',
        'Revenue breakdown by source',
        'Expense categorization',
        'Profit margin analysis',
        'Monthly trends'
      ],
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'POS Sales Report',
      description: 'POS machine sales with bank reconciliation and transaction summary',
      icon: <DollarSign className="h-8 w-8" />,
      href: '/reports/pos-sales',
      features: [
        'POS terminal sales breakdown',
        'Bank-wise transaction summary',
        'Card payment reconciliation',
        'Missing slip tracking',
        'Daily settlement report'
      ],
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Credit Customer Reports',
      description: 'Credit sales, payments, and outstanding balance analysis',
      icon: <Users className="h-8 w-8" />,
      href: '/reports/credit',
      features: [
        'Outstanding balances',
        'Credit sales summary',
        'Payment collection tracking',
        'Aging analysis',
        'Customer-wise breakdown'
      ],
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Shift Reports & Variance',
      description: 'Shift performance with variance analysis and pumper tracking',
      icon: <Clock className="h-8 w-8" />,
      href: '/reports/shift',
      features: [
        'Per-shift sales analysis',
        'Variance by pumper',
        'Tender reconciliation',
        'Nozzle-wise breakdown',
        'Print shift summary'
      ],
      color: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Pumper Details Report',
      description: 'Comprehensive pumper performance, salary, and loan information',
      icon: <Users className="h-8 w-8" />,
      href: '/reports/pumper-details',
      features: [
        'Complete pumper profile',
        'Shift performance & variance',
        'Salary payments history',
        'Active loans & deductions',
        'Fuel type breakdown'
      ],
      color: 'text-teal-600 dark:text-teal-400'
    },
    {
      title: 'Station Comparison Report',
      description: 'Compare performance metrics across all stations',
      icon: <GitCompare className="h-8 w-8" />,
      href: '/reports/station-comparison',
      features: [
        'Side-by-side station comparison',
        'Sales & revenue analysis',
        'Profitability metrics',
        'Pumper performance comparison',
        'Best & worst performers',
        'Monthly trends comparison'
      ],
      color: 'text-indigo-600 dark:text-indigo-400',
      minRole: 'OWNER'
    }
  ]

  // Filter reports based on user role
  const reports = allReports.filter(report => {
    if (report.minRole === 'DEVELOPER') return isDeveloper
    if (report.minRole === 'OWNER') return isOwner
    return true
  })

  const quickStats = [
    {
      title: 'Reports Available',
      value: '5',
      description: 'Comprehensive reporting modules',
      icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    },
    {
      title: 'Data Sources',
      value: '12+',
      description: 'Integrated data points',
      icon: <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
    },
    {
      title: 'Export Formats',
      value: '4',
      description: 'PDF, Excel, Print, Email',
      icon: <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    },
    {
      title: 'Real-time',
      value: 'Live',
      description: 'Up-to-date information',
      icon: <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    }
  ]

  const getRoleStyle = (minRole?: string) => {
    switch (minRole) {
      case 'DEVELOPER':
        return 'border-rose-500/20 dark:border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/20'
      case 'OWNER':
        return 'border-orange-500/20 dark:border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/20'
      default:
        return ''
    }
  }

  const getRoleBadge = (minRole?: string) => {
    switch (minRole) {
      case 'DEVELOPER':
        return (
          <span className="text-xs bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-full font-medium border border-rose-500/20">
            DEVELOPER ONLY
          </span>
        )
      case 'OWNER':
        return (
          <span className="text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full font-medium border border-orange-500/20">
            OWNER ONLY
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive reporting suite for business intelligence and operational insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Multi-station reporting</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{reports.length}</div>
                <div className="text-sm font-medium text-foreground">Reports Available</div>
                <div className="text-xs text-muted-foreground">Comprehensive reporting modules</div>
              </div>
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">12+</div>
                <div className="text-sm font-medium text-foreground">Data Sources</div>
                <div className="text-xs text-muted-foreground">Integrated data points</div>
              </div>
              <div className="flex-shrink-0">
                <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">2</div>
                <div className="text-sm font-medium text-foreground">Export Formats</div>
                <div className="text-xs text-muted-foreground">PDF, Excel</div>
              </div>
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">Live</div>
                <div className="text-sm font-medium text-foreground">Real-time</div>
                <div className="text-xs text-muted-foreground">Up-to-date information</div>
              </div>
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(report.href)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={report.color}>
                    {report.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                      {report.title}
                      {getRoleBadge(report.minRole)}
                    </h3>
                    <p className="text-sm text-muted-foreground font-normal">{report.description}</p>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium text-foreground mb-2">Key Features:</div>
                <ul className="space-y-1">
                  {report.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="pt-3">
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(report.href)
                    }}
                  >
                    Open Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/reports/daily')}>
              <Calendar className="mr-2 h-4 w-4" />
              Today&apos;s Report
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/shift')}>
              <Clock className="mr-2 h-4 w-4" />
              Latest Shift
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/profit')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Monthly Profit
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/daily-sales')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Daily Sales (Rs)
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/daily-sales-liters')}>
              <Fuel className="mr-2 h-4 w-4" />
              Daily Sales (Liters)
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/pumper-variance')}>
              <Users className="mr-2 h-4 w-4" />
              Pumper Variance
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/pumper-details')}>
              <Users className="mr-2 h-4 w-4" />
              Pumper Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
