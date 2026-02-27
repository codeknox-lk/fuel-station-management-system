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
  Monitor,
  Calculator
} from 'lucide-react'

interface SettingCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
  bg: string
  bullet: string
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
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      bullet: 'bg-purple-500',
      minRole: 'OWNER'
    },
    {
      title: 'Subscription',
      description: 'Manage your plan, billing history, and usage limits',
      icon: <CreditCard className="h-6 w-6" />,
      href: '/settings/subscription',
      features: ['Plan & Billing', 'Usage Metrics', 'Payment History'],
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      bullet: 'bg-blue-500',
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
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      bullet: 'bg-orange-500',
      minRole: 'OWNER'
    },
    {
      title: 'Tanks & Pumps',
      description: 'Manage fuel tanks, pumps, and nozzle infrastructure',
      icon: <Fuel className="h-6 w-6" />,
      href: '/settings/tanks',
      features: ['Tank Capacity', 'Pump Configuration', 'Nozzle Setup'],
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      bullet: 'bg-red-500'
    },
    {
      title: 'Product Pricing',
      description: 'Manage fuel types, daily prices, and inventory targets',
      icon: <Fuel className="h-6 w-6" />, // Using Fuel icon again but could use DollarSign
      href: '/settings/prices',
      features: ['Price Updates', 'Fuel Types', 'Inventory Targets'],
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
      bullet: 'bg-emerald-500'
    },
    {
      title: 'Pumpers',
      description: 'Manage pumper employees, shifts, and specializations',
      icon: <Users className="h-6 w-6" />,
      href: '/settings/pumpers',
      features: ['Employee Profiles', 'Shift Assignments', 'Performance'],
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-900/20',
      bullet: 'bg-indigo-500'
    },
    {
      title: 'Office Staff',
      description: 'Manage office employees (managers, supervisors)',
      icon: <Briefcase className="h-6 w-6" />,
      href: '/settings/office-staff',
      features: ['Staff Profiles', 'Role Assignment', 'Access Levels'],
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-100 dark:bg-teal-900/20',
      bullet: 'bg-teal-500'
    },
    {
      title: 'Banks',
      description: 'Configure bank accounts and payment processing',
      icon: <Building2 className="h-6 w-6" />,
      href: '/settings/banks',
      features: ['Account Setup', 'Terminals', 'Reconciliation'],
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-100 dark:bg-cyan-900/20',
      bullet: 'bg-cyan-500'
    },
    {
      title: 'POS Terminals',
      description: 'Configure point-of-sale terminals and devices',
      icon: <Monitor className="h-6 w-6" />,
      href: '/settings/pos-terminals',
      features: ['Terminal Setup', 'Bank Linking', 'Status Monitoring'],
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-100 dark:bg-sky-900/20',
      bullet: 'bg-sky-500'
    },
    {
      title: 'Shift Templates',
      description: 'Define recurring shift patterns and timings',
      icon: <Clock className="h-6 w-6" />,
      href: '/settings/shift-templates',
      features: ['Shift Patterns', 'Timing Rules', 'Break Schedules'],
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-100 dark:bg-pink-900/20',
      bullet: 'bg-pink-500'
    },
    {
      title: 'Tolerance Control',
      description: 'Configure variance tolerance levels and thresholds',
      icon: <Gauge className="h-6 w-6" />,
      href: '/settings/tolerance',
      features: ['Variance Limits', 'Alert Thresholds', 'Auto-actions'],
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      bullet: 'bg-amber-500',
      minRole: 'OWNER'
    },
    {
      title: 'Users & Access',
      description: 'Manage system users, roles, and permissions',
      icon: <Shield className="h-6 w-6" />,
      href: '/settings/users',
      features: ['User Accounts', 'Role Matrix', 'Activity Logs'],
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-900/20',
      bullet: 'bg-rose-500',
      minRole: 'OWNER'
    },
    {
      title: 'Global Salary Settings',
      description: 'Configure default salary calculations and rates',
      icon: <Calculator className="h-6 w-6" />,
      href: '/settings/salary',
      features: ['EPF Rates', 'OT Multipliers', 'Commission Config'],
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/20',
      bullet: 'bg-violet-500',
      minRole: 'OWNER'
    },
    {
      title: 'System Data',
      description: 'Master data and system configurations',
      icon: <Database className="h-6 w-6" />,
      href: '/settings/master-data', // Redirecting to profile for now as a catch-all
      features: ['Global Settings', 'Audit Logs', 'Backup Control'],
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-900/20',
      bullet: 'bg-slate-500',
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
    <div className="space-y-8 p-6">
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
                hover:shadow-lg cursor-pointer border
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
                  <div className={`p-2.5 rounded-xl ${setting.bg} ${setting.color} group-hover:scale-110 transition-transform duration-200`}>
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
                      <div className={`w-1 h-1 rounded-full mr-2 ${setting.bullet}`} />
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

    </div>
  )
}

