'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
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
  Landmark
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
    roles: ['DEVELOPER', 'OWNER', 'MANAGER']
  },
  // {
  //   title: 'Audits',
  //   href: '/audits',
  //   icon: Search,
  //   roles: ['DEVELOPER', 'OWNER', 'MANAGER']
  // },
  // {
  //   title: 'Tests',
  //   href: '/tests',
  //   icon: TestTube,
  //   roles: ['DEVELOPER', 'OWNER', 'MANAGER']
  // },
  {
    title: 'Tanks',
    href: '/tanks',
    icon: Fuel,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER']
  },
  {
    title: 'Safe',
    href: '/safe',
    icon: Wallet,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Salary',
    href: '/salary',
    icon: DollarSign,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Loans',
    href: '/loans',
    icon: Handshake,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Bank Accounts',
    href: '/banks',
    icon: Landmark,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Credit Customers',
    href: '/credit/customers',
    icon: CreditCard,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['DEVELOPER', 'OWNER', 'ACCOUNTS']
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
  },
  // {
  //   title: 'Audit Log',
  //   href: '/audit-log',
  //   icon: FileText,
  //   roles: ['DEVELOPER', 'OWNER']
  // },
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

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(userRole)
  )

  return (
    <div className="w-64 bg-sidebar border-r border-border h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 flex-shrink-0">
        <div className="relative w-full h-24">
          <Image
            src="/images/fuelsync-logo-full.png"
            alt="FuelSync"
            fill
            className="object-contain object-center"
            priority
          />
        </div>
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
