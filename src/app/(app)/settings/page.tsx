'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  CreditCard, 
  Clock, 
  DollarSign,
  Monitor,
  Users,
  Settings as SettingsIcon,
  ChevronRight,
  Database,
  Gauge,
  Shield,
  Fuel,
  Briefcase
} from 'lucide-react'

interface SettingCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  features: string[]
  color: string
  restricted?: boolean
}

export default function SettingsPage() {
  const router = useRouter()

  const settings: SettingCard[] = [
    {
      title: 'Stations',
      description: 'Manage petrol stations, locations, and basic information',
      icon: <Building2 className="h-8 w-8" />,
      href: '/settings/stations',
      features: [
        'Add/Edit/Delete stations',
        'Station codes and names',
        'Location and contact details',
        'Operating hours configuration'
      ],
      color: 'text-blue-600 dark:text-blue-400'
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
      color: 'text-indigo-600'
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
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Fuel Prices',
      description: 'Manage fuel pricing with history tracking and future pricing',
      icon: <DollarSign className="h-8 w-8" />,
      href: '/settings/prices',
      features: [
        'Current price management',
        'Price history tracking',
        'Future price scheduling',
        'Price change notifications'
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
      restricted: true
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
      color: 'text-indigo-600',
      restricted: true
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

  const quickStats = [
    {
      title: 'Settings Categories',
      value: '10',
      description: 'Configuration modules',
      icon: <SettingsIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
    },
    {
      title: 'Data Sources',
      value: '5+',
      description: 'Integrated systems',
      icon: <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
    },
    {
      title: 'User Roles',
      value: '3',
      description: 'OWNER, MANAGER, ACCOUNTS',
      icon: <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
    },
    {
      title: 'Access Control',
      value: 'RBAC',
      description: 'Role-based permissions',
      icon: <Gauge className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure system parameters, manage master data, and control access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Configuration Management</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.title}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((setting, index) => (
          <Card 
            key={index} 
            className={`hover:shadow-lg transition-shadow cursor-pointer ${setting.restricted ? 'border-orange-500/20 dark:border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/20/30' : ''}`}
            onClick={() => router.push(setting.href)}
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
                      {setting.restricted && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300 px-2 py-1 rounded-full">
                          OWNER ONLY
                        </span>
                      )}
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
              </div>
            </CardContent>
          </Card>
        ))}
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
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
              <DollarSign className="mr-2 h-4 w-4" />
              Update Prices
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
