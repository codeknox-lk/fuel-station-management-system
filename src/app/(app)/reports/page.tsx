'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Fuel,
  Clock,
  AlertTriangle,
  GitCompare,
  ShoppingBag,
  CreditCard,
  ArrowRight,
  Briefcase
} from 'lucide-react'

interface ReportCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
  bg: string
  bullet: string
  minRole?: 'OWNER' | 'DEVELOPER'
}

interface ReportCategory {
  title: string
  description: string
  reports: ReportCard[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserRole(localStorage.getItem('userRole') || '')
    }
  }, [])

  const isDeveloper = userRole === 'DEVELOPER'
  const isOwner = userRole === 'OWNER' || isDeveloper

  const salesReports: ReportCard[] = [
    {
      title: 'Daily Sales (Rs)',
      description: 'Revenue analysis by fuel type',
      icon: <BarChart3 className="h-6 w-6" />,
      href: '/reports/daily-sales',
      features: ['Revenue breakdown', 'Daily totals', 'Trend analysis'],
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      bullet: 'bg-blue-500'
    },
    {
      title: 'Daily Sales (Liters)',
      description: 'Volume analysis by fuel type',
      icon: <Fuel className="h-6 w-6" />,
      href: '/reports/daily-sales-liters',
      features: ['Volume breakdown', 'fuel comparisons', 'Trend analysis'],
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-900/20',
      bullet: 'bg-indigo-500'
    },
    {
      title: 'POS Sales Report',
      description: 'Card & bank transaction simplified',
      icon: <CreditCard className="h-6 w-6" />,
      href: '/reports/pos-sales',
      features: ['Terminal breakdown', 'Bank summary', 'Reconciliation'],
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/20',
      bullet: 'bg-violet-500'
    },
    {
      title: 'Credit Customers',
      description: 'Outstanding balance & payments',
      icon: <Users className="h-6 w-6" />,
      href: '/reports/credit',
      features: ['Aging analysis', 'Collection tracking', 'Customer breakdown'],
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      bullet: 'bg-purple-500'
    }
  ]

  const operationalReports: ReportCard[] = [
    {
      title: 'Shift Reports',
      description: 'Shift performance & variance',
      icon: <Clock className="h-6 w-6" />,
      href: '/reports/shift',
      features: ['Sales analysis', 'Tender reconciliation', 'Active variances'],
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      bullet: 'bg-orange-500'
    },
    {
      title: 'Pumper Variance',
      description: 'Shortage tracking by pumper',
      icon: <AlertTriangle className="h-6 w-6" />,
      href: '/reports/pumper-variance',
      features: ['Variance trends', 'Performance rating', 'Loss recovery'],
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      bullet: 'bg-red-500'
    },
    {
      title: 'Pumper Details',
      description: 'Staff profiles & salary info',
      icon: <Users className="h-6 w-6" />,
      href: '/reports/pumper-details',
      features: ['Salary history', 'Loan tracking', 'Shift history'],
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      bullet: 'bg-amber-500'
    },
    {
      title: 'Office Staff Details',
      description: 'Office staff profiles & allowances',
      icon: <Briefcase className="h-6 w-6" />,
      href: '/reports/office-staff-details',
      features: ['Allowance breakdown', 'Loan tracking', 'Gross salary view'],
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      bullet: 'bg-purple-500'
    }
  ]

  const financialReports: ReportCard[] = [
    {
      title: 'Daily Profit',
      description: 'Net profit & expense tracking',
      icon: <TrendingUp className="h-6 w-6" />,
      href: '/reports/profit',
      features: ['Profit margin', 'Revenue vs Expense', 'Monthly trends'],
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
      bullet: 'bg-emerald-500'
    },
    {
      title: 'Shop Profitability',
      description: 'Inventory & margin analysis',
      icon: <ShoppingBag className="h-6 w-6" />,
      href: '/reports/shop-profit',
      features: ['Gross profit', 'Category breakdown', 'Inventory value'],
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-900/20',
      bullet: 'bg-teal-500',
      minRole: 'OWNER'
    },
    {
      title: 'Station Comparison',
      description: 'Multi-station performance',
      icon: <GitCompare className="h-6 w-6" />,
      href: '/reports/station-comparison',
      features: ['Sales comparison', 'Volume analysis', 'Top performers'],
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-100 dark:bg-cyan-900/20',
      bullet: 'bg-cyan-500',
      minRole: 'OWNER'
    }
  ]

  const categories: ReportCategory[] = [
    {
      title: 'Sales & Revenue',
      description: 'Track income streams, fuel sales volume, and transaction methods.',
      reports: salesReports
    },
    {
      title: 'Operational Performance',
      description: 'Monitor shift efficiency, staff performance, and variance control.',
      reports: operationalReports
    },
    {
      title: 'Financial & Intelligence',
      description: 'High-level business metrics, profitability, and strategic insights.',
      reports: financialReports
    }
  ]

  const getRoleBadge = (minRole?: string) => {
    switch (minRole) {
      case 'DEVELOPER':
        return (
          <Badge variant="outline" className="text-[10px] py-0 h-5 border-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400">
            DEV ONLY
          </Badge>
        )
      case 'OWNER':
        return (
          <Badge variant="outline" className="text-[10px] py-0 h-5 border-amber-200 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
            OWNER
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports Center
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Analytics and insights for smarter business decisions.
          </p>
        </div>

        {/* Quick Actions / Summary Stats could go here later */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/reports/daily')}>
            <Calendar className="mr-2 h-4 w-4" />
            Daily Summary
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-10">
        {categories.map((category, idx) => (
          <section key={idx} className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {category.reports.map((report, rIdx) => {
                // Filter checks
                if (report.minRole === 'DEVELOPER' && !isDeveloper) return null
                if (report.minRole === 'OWNER' && !isOwner) return null

                return (
                  <Card
                    key={rIdx}
                    className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer overflow-hidden"
                    onClick={() => router.push(report.href)}
                  >
                    <CardHeader className="pb-3 space-y-0">
                      <div className="flex justify-between items-start">
                        <div className={`p-2.5 rounded-xl ${report.bg} ${report.color} mb-3 group-hover:scale-110 transition-transform duration-200`}>
                          {report.icon}
                        </div>
                        {getRoleBadge(report.minRole)}
                      </div>
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {report.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 min-h-[40px]">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5 mb-4">
                        {report.features.slice(0, 3).map((feature, fIdx) => (
                          <li key={fIdx} className="text-xs text-muted-foreground flex items-center gap-2">
                            <div className={`w-1 h-1 rounded-full ${report.bullet}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-200">
                        Open Report <ArrowRight className="ml-1 h-3 w-3" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
