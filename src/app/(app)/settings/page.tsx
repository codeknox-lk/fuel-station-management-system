'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  Building2,
  CreditCard,
  Clock,
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  Database,
  Gauge,
  Shield,
  Fuel,
  Briefcase,
  AlertCircle,
  Zap
} from 'lucide-react'

interface SettingCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
  minRole?: 'OWNER' | 'DEVELOPER'
  minPlan?: 'BASIC' | 'PREMIUM'
  status?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { organization } = useOrganization()
  const currentPlan = organization?.plan || 'BASIC'

  // Helper to check if plan meets requirement
  const planMeetsRequirement = (minPlan?: string) => {
    if (!minPlan || minPlan === 'BASIC') return true
    if (minPlan === 'PREMIUM') return currentPlan === 'PREMIUM'
    return true
  }

  // Get user role from localStorage
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
  const isDeveloper = userRole === 'DEVELOPER'
  const isOwner = userRole === 'OWNER' || isDeveloper

  const settings: SettingCard[] = [
    {
      title: 'Organization',
      description: 'Manage your organization profile and identity',
      icon: <Building2 className="h-6 w-6" />,
      href: '/settings/organization',
      features: ['Profile & Branding', 'Contact Details', 'Slug Management'],
      color: 'text-purple-600 dark:text-purple-400',
      minRole: 'OWNER'
    },
    {
      title: 'Subscription',
      description: 'Manage your plan, billing history, and usage limits',
      icon: <CreditCard className="h-6 w-6" />,
      href: '/settings/subscription',
      features: ['Plan & Billing', 'Usage Metrics', 'Payment History'],
      color: 'text-blue-600 dark:text-blue-400',
      minRole: 'OWNER',
      status: currentPlan === 'PREMIUM' ? 'Premium Active' : 'Basic Plan'
    },
    {
      title: 'Stations',
      description: 'Manage petrol stations, locations, and basic information',
      icon: <LayoutDashboard className="h-6 w-6" />,
      href: '/settings/stations',
      features: ['Station Management', 'Locations', 'Operating Hours'],
      color: 'text-orange-600 dark:text-orange-400',
      minRole: 'OWNER'
    },
    {
      title: 'Tanks & Pumps',
      description: 'Manage fuel tanks, pumps, and nozzle infrastructure',
      icon: <Fuel className="h-6 w-6" />,
      href: '/settings/tanks',
      features: ['Tank Capacity', 'Pump Configuration', 'Nozzle Setup'],
      color: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Product Pricing',
      description: 'Manage fuel types, daily prices, and inventory targets',
      icon: <Fuel className="h-6 w-6" />, // Using Fuel icon again but could use DollarSign
      href: '/settings/prices',
      features: ['Price Updates', 'Fuel Types', 'Inventory Targets'],
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Pumpers',
      description: 'Manage pumper employees, shifts, and specializations',
      icon: <Users className="h-6 w-6" />,
      href: '/settings/pumpers',
      features: ['Employee Profiles', 'Shift Assignments', 'Performance'],
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      title: 'Office Staff',
      description: 'Manage office employees (managers, supervisors)',
      icon: <Briefcase className="h-6 w-6" />,
      href: '/settings/office-staff',
      features: ['Staff Profiles', 'Role Assignment', 'Access Levels'],
      color: 'text-teal-600 dark:text-teal-400'
    },
    {
      title: 'Banks',
      description: 'Configure bank accounts and payment processing',
      icon: <Building2 className="h-6 w-6" />,
      href: '/settings/banks',
      features: ['Account Setup', 'Terminals', 'Reconciliation'],
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      title: 'Shift Templates',
      description: 'Define recurring shift patterns and timings',
      icon: <Clock className="h-6 w-6" />,
      href: '/settings/shift-templates',
      features: ['Shift Patterns', 'Timing Rules', 'Break Schedules'],
      color: 'text-pink-600 dark:text-pink-400'
    },
    {
      title: 'Tolerance Control',
      description: 'Configure variance tolerance levels and thresholds',
      icon: <Gauge className="h-6 w-6" />,
      href: '/settings/tolerance',
      features: ['Variance Limits', 'Alert Thresholds', 'Auto-actions'],
      color: 'text-orange-600',
      minRole: 'OWNER'
    },
    {
      title: 'Users & Access',
      description: 'Manage system users, roles, and permissions',
      icon: <Shield className="h-6 w-6" />,
      href: '/settings/users',
      features: ['User Accounts', 'Role Matrix', 'Activity Logs'],
      color: 'text-red-600 dark:text-red-400',
      minRole: 'OWNER'
    },
    {
      title: 'System Data',
      description: 'Master data and system configurations',
      icon: <Database className="h-6 w-6" />,
      href: '/settings/profile', // Redirecting to profile for now as a catch-all
      features: ['Backup/Restore', 'Audit Logs', 'System Health'],
      color: 'text-gray-600 dark:text-gray-400',
      minRole: 'DEVELOPER'
    }
  ]

  const getRoleBadge = (setting: SettingCard) => {
    const badges = []

    if (setting.minRole === 'DEVELOPER') {
      badges.push(
        <span key="role" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-medium border border-rose-500/20">
          DEV
        </span>
      )
    } else if (setting.minRole === 'OWNER') {
      badges.push(
        <span key="role" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium border border-orange-500/20">
          OWNER
        </span>
      )
    }

    if (setting.minPlan === 'PREMIUM' && currentPlan === 'BASIC') {
      badges.push(
        <span key="plan" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
          PRO
        </span>
      )
    }

    if (setting.status) {
      badges.push(
        <span key="status" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/20">
          {setting.status}
        </span>
      )
    }

    return badges.length > 0 ? <div className="flex gap-1 flex-wrap">{badges}</div> : null
  }

  // Filter settings based on role
  const visibleSettings = settings.filter(setting => {
    if (setting.minRole === 'DEVELOPER') return isDeveloper
    if (setting.minRole === 'OWNER') return isOwner
    return true
  })

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      {/* Standard Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage system configurations, user access, and operational parameters.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleSettings.map((setting, index) => {
          const isRestricted = !planMeetsRequirement(setting.minPlan)

          return (
            <Card
              key={index}
              className={`
                group relative overflow-hidden transition-all duration-200
                hover:shadow-lg cursor-pointer border-muted
                ${isRestricted ? 'opacity-70 grayscale' : ''}
              `}
              onClick={() => {
                if (!isRestricted) {
                  router.push(setting.href)
                }
              }}
            >
              {/* Top Accent Line */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${setting.color.split('-')[1]}-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-lg bg-muted text-foreground group-hover:scale-110 transition-transform duration-200`}>
                    {setting.icon}
                  </div>
                  {getRoleBadge(setting)}
                </div>
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {setting.title}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {setting.description}
                </p>

                <div className="space-y-2">
                  {setting.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-xs text-muted-foreground/80">
                      <div className={`w-1 h-1 rounded-full mr-2 ${setting.color.split(' ')[0].replace('text-', 'bg-')}`} />
                      {feature}
                    </div>
                  ))}
                </div>

                {isRestricted && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" className="shadow-lg">
                      <AlertCircle className="w-4 h-4 mr-2" /> Upgrade to Unlock
                    </Button>
                  </div>
                )}

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Stats / System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">System Status</p>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                Operational <Zap className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              </h3>
            </div>
            <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <ActivityIcon />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-none shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Active Alerts</p>
              <h3 className="text-2xl font-bold">0 Active</h3>
            </div>
            <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/settings/organization')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Organization</p>
              <h3 className="text-xl font-bold text-foreground truncate max-w-[200px]">{organization?.name || 'Loading...'}</h3>
            </div>
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ActivityIcon() {
  return (
    <svg
      className="h-6 w-6"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

