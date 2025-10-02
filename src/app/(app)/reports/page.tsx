'use client'

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
  AlertTriangle
} from 'lucide-react'

interface ReportCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
}

export default function ReportsPage() {
  const router = useRouter()

  const reports: ReportCard[] = [
    {
      title: 'Daily Reports',
      description: 'Comprehensive daily sales, expenses, and variance analysis',
      icon: <Calendar className="h-8 w-8" />,
      href: '/reports/daily',
      features: [
        'Sales breakdown by fuel type',
        'Expense tracking and analysis',
        'Missing slip exceptions',
        'Payment method breakdown',
        'Variance analysis with tolerance'
      ],
      color: 'text-blue-600'
    },
    {
      title: 'Shift Reports',
      description: 'Detailed shift performance with nozzle and pumper breakdown',
      icon: <Clock className="h-8 w-8" />,
      href: '/reports/shift',
      features: [
        'Per-nozzle sales analysis',
        'Pumper performance tracking',
        'Tender reconciliation',
        'Variance by assignment',
        'Print shift PDF'
      ],
      color: 'text-green-600'
    },
    {
      title: 'Tank Reports',
      description: 'Tank movement and variance tracking with printable lists',
      icon: <Fuel className="h-8 w-8" />,
      href: '/reports/tanks',
      features: [
        'Opening vs closing stock',
        'Delivery tracking',
        'Fill level monitoring',
        'Variance classification',
        'Print-optimized layout'
      ],
      color: 'text-purple-600'
    },
    {
      title: 'Profit Reports',
      description: 'Monthly profit analysis with charts and breakdown tables',
      icon: <TrendingUp className="h-8 w-8" />,
      href: '/reports/profit',
      features: [
        'Daily profit trend charts',
        'Revenue source breakdown',
        'Expense categorization',
        'Growth analysis',
        'Best/worst day tracking'
      ],
      color: 'text-orange-600'
    },
    {
      title: 'Pumper Variance',
      description: 'Pumper performance analysis with variance tracking and sparklines',
      icon: <Users className="h-8 w-8" />,
      href: '/reports/pumper-variance',
      features: [
        'Individual pumper analysis',
        '30-day trend sparklines',
        'Performance rating system',
        'Variance accountability',
        'Recovery tracking'
      ],
      color: 'text-red-600'
    }
  ]

  const quickStats = [
    {
      title: 'Reports Available',
      value: '5',
      description: 'Comprehensive reporting modules',
      icon: <FileText className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Data Sources',
      value: '12+',
      description: 'Integrated data points',
      icon: <BarChart3 className="h-5 w-5 text-green-500" />
    },
    {
      title: 'Export Formats',
      value: '4',
      description: 'PDF, Excel, Print, Email',
      icon: <DollarSign className="h-5 w-5 text-purple-500" />
    },
    {
      title: 'Real-time',
      value: 'Live',
      description: 'Up-to-date information',
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive reporting suite for business intelligence and operational insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-gray-400" />
          <span className="text-sm text-gray-500">Multi-station reporting</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.title}</div>
                  <div className="text-xs text-gray-500">{stat.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(report.href)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={report.color}>
                  {report.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{report.title}</h3>
                  <p className="text-sm text-gray-600 font-normal">{report.description}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Key Features:</div>
                <ul className="space-y-1">
                  {report.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
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

      {/* Additional Information */}
      <FormCard title="Report Features & Capabilities">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Data Visualization
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Interactive charts and graphs</li>
              <li>• Trend analysis with sparklines</li>
              <li>• Color-coded performance indicators</li>
              <li>• Real-time data updates</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              Export Options
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• PDF reports with professional formatting</li>
              <li>• Excel exports for data analysis</li>
              <li>• Print-optimized layouts</li>
              <li>• Email distribution capabilities</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Business Intelligence
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Variance analysis with tolerance checking</li>
              <li>• Performance rating systems</li>
              <li>• Exception tracking and alerts</li>
              <li>• Comparative analysis tools</li>
            </ul>
          </div>
        </div>
      </FormCard>

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
            <Button variant="outline" onClick={() => router.push('/reports/tanks')}>
              <Fuel className="mr-2 h-4 w-4" />
              Tank Status
            </Button>
            <Button variant="outline" onClick={() => router.push('/reports/pumper-variance')}>
              <Users className="mr-2 h-4 w-4" />
              Pumper Performance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
