'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useOrganization } from '@/contexts/OrganizationContext'
import { hasFeature } from '@/lib/features'
import { PlanType } from '@prisma/client'
import {
  LayoutDashboard,
  Clock,
  Fuel,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  User,
  Wallet,
  DollarSign,
  Handshake,
  Landmark,
  Store,
  Crown
} from 'lucide-react'

type UserRole = 'DEVELOPER' | 'OWNER' | 'MANAGER' | 'ACCOUNTS'

interface SidebarProps {
  userRole: UserRole
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  feature?: string // Optional feature flag required to see this item
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Shifts',
    href: '/shifts',
    icon: Clock,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER'],
    feature: 'shifts'
  },
  {
    title: 'Shop',
    href: '/shop',
    icon: Store,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER'],
    feature: 'shop'
  },
  {
    title: 'Tanks',
    href: '/tanks',
    icon: Fuel,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER'],
    feature: 'tanks'
  },
  {
    title: 'Safe',
    href: '/safe',
    icon: Wallet,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'],
    feature: 'safe'
  },
  {
    title: 'Salary',
    href: '/salary',
    icon: DollarSign,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'],
    feature: 'payroll'
  },
  {
    title: 'Loans',
    href: '/loans',
    icon: Handshake,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'],
    feature: 'loans'
  },
  {
    title: 'Bank Accounts',
    href: '/banks',
    icon: Landmark,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'],
    feature: 'deposits' // Banks usually related to deposits
  },
  {
    title: 'Credit Customers',
    href: '/credit/customers',
    icon: CreditCard,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'],
    feature: 'credit'
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['DEVELOPER', 'OWNER', 'ACCOUNTS'],
    feature: 'daily-reports'
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER']
  },
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  }
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const { organization } = useOrganization()

  const filteredNavigation = navigation.filter(item => {
    // 1. Check Role
    if (!item.roles.includes(userRole)) return false

    // 2. Check Feature (if organization is loaded)
    if (organization && item.feature) {
      const plan = organization.subscription?.planId || (organization.plan as PlanType)
      const status = organization.subscription?.status || 'ACTIVE'
      const trialEndDate = organization.subscription?.trialEndDate
        ? new Date(organization.subscription.trialEndDate)
        : null

      return hasFeature(plan, item.feature, status, trialEndDate)
    }

    return true
  })

  return (
    <div className="w-64 bg-sidebar border-r border-border h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex-shrink-0">
        <div className="relative w-full h-16 mb-2">
          <Image
            src="/images/fuelsync-logo-full.png"
            alt="FuelSync"
            fill
            className="object-contain object-left"
            priority
          />
        </div>

        {/* Organization Info */}
        {organization && (
          <div className="mt-2 px-1">
            <Link
              href="/settings/organization"
              className="block group p-2 rounded-xl hover:bg-sidebar-accent/50 transition-all duration-300"
            >
              <div className="text-sm font-bold text-sidebar-foreground truncate group-hover:text-primary transition-colors flex items-center justify-between">
                {organization.name}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge
                  className={cn(
                    "text-[10px] h-5 px-2 border-none shadow-sm transition-all duration-300",
                    (organization.subscription?.planId === 'PREMIUM' || (organization.plan as string) === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE')
                      ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white hover:from-orange-600 hover:to-orange-500 shadow-orange-500/20 shadow-md backdrop-blur-sm"
                      : "bg-slate-200/50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 backdrop-blur-sm"
                  )}
                >
                  {(organization.subscription?.planId === 'PREMIUM' || (organization.plan as string) === 'PREMIUM' || (organization.plan as string) === 'ENTERPRISE') && (
                    <Crown className="w-2.5 h-2.5 mr-1 fill-white animate-pulse" />
                  )}
                  {organization.subscription?.status === 'TRIALING' ? 'TRIAL' : organization.subscription?.planId || organization.plan}
                </Badge>
                {organization.subscription?.status === 'PAST_DUE' && (
                  <Badge className="bg-red-500 text-white text-[9px] h-4 px-1 animate-pulse">
                    PAST DUE
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation - takes remaining space */}
      <nav className="px-4 flex-1 overflow-y-auto pb-6">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 flex-shrink-0 border-t border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
            Powered by
          </p>
          <p className="text-xs font-bold text-muted-foreground/80">
            CODEKNOX (PVT) LTD.
          </p>
        </div>
      </div>
    </div>
  )
}
