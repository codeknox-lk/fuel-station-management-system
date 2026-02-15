'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  Building2,
  CreditCard,
  Clock,

  Monitor,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  Database,
  Gauge,
  Shield,
  Fuel,
  Briefcase,
  AlertCircle
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
  const isOwner = userRole === 'OWNER' || isDeveloper // Developer provides Owner access too


  const settings: SettingCard[] = [
    {
      title: 'Organization',
      description: 'Manage your organization profile and identity',
      icon: <Building2 className="h-8 w-8" />,
      href: '/settings/organization',
      features: [
        'Organization details',
        'Location and contact setup',
        'Business branding',
        'Slug management'
      ],
      color: 'text-purple-600 dark:text-purple-400',
      minRole: 'OWNER'
    },
    {
      title: 'Subscription & Billing',
      description: 'Manage your plan, billing history, and usage limits',
      icon: <CreditCard className="h-8 w-8" />,
      href: '/settings/subscription',
      features: [
        'Plan upgrades & downgrades',
        'Payment history & receipts',
        'Usage metrics (Stations)',
        'Billing cycle management'
      ],
      color: 'text-blue-600 dark:text-blue-400',
      minRole: 'OWNER'
    },
    {
      title: 'Stations',
      description: 'Manage petrol stations, locations, and basic information',
      icon: <Building2 className="h-8 w-8" />,
      href: '/settings/stations',
      features: [
        // Owner/Developer can Add/Delete
        isOwner ? 'Add/Edit/Delete stations' : 'View stations',
        'Station codes and names',
        'Location and contact details',
        'Operating hours configuration'
      ],
      color: 'text-orange-600 dark:text-orange-400',
      minRole: 'OWNER'
    },
    {
      title: 'Pumpers',
      description: 'Manage pumper employees, shifts, and specializations',
      icon: <Users className="h-8 w-8" />,
      href: '/settings/pumpers',
      features: [
        'Add/Edit/Delete pumpers',
        'Employee details and contact',
        'Shift preferences and assignments',
        'Performance ratings and specializations'
      ],
      color: 'text-orange-600'
    },
    {
      title: 'Office Staff',
      description: 'Manage office employees (managers, supervisors, office staff)',
      icon: <Briefcase className="h-8 w-8" />,
      href: '/settings/office-staff',
      features: [
        'Add/Edit/Delete office staff',
        'Employee details and contact',
        'Role management (Manager, Supervisor, etc.)',
        'Base salary configuration'
      ],
      color: 'text-teal-600 dark:text-teal-400'
    },
    {
      title: 'Banks',
      description: 'Configure bank accounts and payment processing settings',
      icon: <CreditCard className="h-8 w-8" />,
      href: '/settings/banks',
      features: [
        'Bank account management',
        'Account numbers and details',
        'Payment processing setup',
        'Integration configurations'
      ],
      color: 'text-green-600 dark:text-green-400'
    },
    {
      title: 'Shift Templates',
      description: 'Define shift patterns and working hour templates',
      icon: <Clock className="h-8 w-8" />,
      href: '/settings/shift-templates',
      features: [
        'Create shift patterns',
        'Start/End time templates',
        'Break configurations',
        'Template assignments'
      ],
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Fuels',
      description: 'Manage fuel types, pricing, inventory, and price history',
      icon: <Fuel className="h-8 w-8" />,
      href: '/settings/prices',
      features: [
        'Add new fuel types to system',
        'Current price management',
        'Price history tracking',
        'Inventory monitoring by fuel type'
      ],
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'POS Terminals',
      description: 'Configure point-of-sale terminals and payment devices',
      icon: <Monitor className="h-8 w-8" />,
      href: '/settings/pos-terminals',
      features: [
        'Terminal registration',
        'Device configurations',
        'Bank associations',
        'Status monitoring'
      ],
      color: 'text-cyan-600'
    },
    {
      title: 'Users',
      description: 'Manage system users, roles, and access permissions',
      icon: <Users className="h-8 w-8" />,
      href: '/settings/users',
      features: [
        'User account management',
        'Role assignments',
        'Access control',
        'Profile management'
      ],
      color: 'text-red-600 dark:text-red-400',
      minRole: 'OWNER'
    },
    {
      title: 'Tolerance Settings',
      description: 'Configure variance tolerance levels and thresholds',
      icon: <Gauge className="h-8 w-8" />,
      href: '/settings/tolerance',
      features: [
        'Percentage tolerance setup',
        'Flat amount thresholds',
        'Combined tolerance rules',
        'Alert configurations'
      ],
      color: 'text-orange-600',
      minRole: 'OWNER'
    },
    {
      title: 'Tanks & Infrastructure',
      description: 'Manage fuel tanks, pumps, and nozzle infrastructure',
      icon: <Fuel className="h-8 w-8" />,
      href: '/settings/tanks',
      features: [
        'Add/Edit/Delete tanks',
        'Create pumps and nozzles',
        'Infrastructure setup',
        'Tank capacity management'
      ],
      color: 'text-orange-600 dark:text-orange-400'
    }
  ]

  const getRoleBadge = (setting: SettingCard) => {
    const badges = []

    if (setting.minRole === 'DEVELOPER') {
      badges.push(
        <span key="role" className="text-[10px] bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full font-medium border border-rose-500/20">
          DEVELOPER ONLY
        </span>
      )
    } else if (setting.minRole === 'OWNER') {
      badges.push(
        <span key="role" className="text-[10px] bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-medium border border-orange-500/20">
          OWNER ONLY
        </span>
      )
    }

    if (setting.minPlan === 'PREMIUM' && currentPlan === 'BASIC') {
      badges.push(
        <span key="plan" className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium border border-amber-500/20">
          PREMIUM
        </span>
      )
    }

    return badges.length > 0 ? <div className="flex gap-1">{badges}</div> : null
  }

  const getRoleStyle = (minRole?: string) => {
    if (minRole === 'DEVELOPER') return 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/50'
    if (minRole === 'OWNER') return 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/50'
    return ''
  }

  // Filter settings based on role ONLY (we show premium cards but lock them)
  const visibleSettings = settings.filter(setting => {
    if (setting.minRole === 'DEVELOPER') return isDeveloper
    if (setting.minRole === 'OWNER') return isOwner
    return true
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            System Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure system parameters, manage master data, and control access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Configuration Management</span>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleSettings.map((setting, index) => {
          const isRestricted = !planMeetsRequirement(setting.minPlan)

          return (
            <Card
              key={index}
              className={`hover:shadow-lg transition-shadow cursor-pointer ${getRoleStyle(setting.minRole)} ${isRestricted ? 'opacity-90' : ''}`}
              onClick={() => {
                if (!isRestricted) {
                  router.push(setting.href)
                }
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={setting.color}>
                      {setting.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        {setting.title}
                        {getRoleBadge(setting)}
                      </h3>
                      <p className="text-sm text-muted-foreground font-normal">{setting.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground mb-2">Features:</div>
                  <ul className="space-y-1">
                    {setting.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isRestricted ? (
                    <div className="pt-3">
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-200 text-xs mb-3">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Upgrade to Premium to unlock these settings</span>
                      </div>
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/settings/subscription') // Redirect to billing/plan
                        }}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-3">
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(setting.href)
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Data Management
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Master data configuration</li>
                <li>• Reference data management</li>
                <li>• Data validation rules</li>
                <li>• Backup and restore</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                Access Control
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Role-based permissions</li>
                <li>• Feature-level access</li>
                <li>• Audit trail logging</li>
                <li>• Session management</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Configuration
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• System parameters</li>
                <li>• Business rules</li>
                <li>• Integration settings</li>
                <li>• Notification preferences</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/settings/stations')}>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Stations
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/pumpers')}>
              <Users className="mr-2 h-4 w-4" />
              Manage Pumpers
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/office-staff')}>
              <Briefcase className="mr-2 h-4 w-4" />
              Manage Office Staff
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/prices')}>
              <Fuel className="mr-2 h-4 w-4" />
              Manage Fuels
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/users')}>
              <Shield className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings/tolerance')}>
              <Gauge className="mr-2 h-4 w-4" />
              Tolerance Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
