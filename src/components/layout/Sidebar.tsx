'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Clock,
  Search,
  TestTube,
  Fuel,
  CreditCard,
  Users,
  Shield,
  BarChart3,
  Settings,
  Building2,
  FileText,
  Bell,
  User,
  Wallet,
  DollarSign,
  Handshake,
  Landmark
} from 'lucide-react'

type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS'

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
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Shifts',
    href: '/shifts',
    icon: Clock,
    roles: ['OWNER', 'MANAGER']
  },
  // {
  //   title: 'Audits',
  //   href: '/audits',
  //   icon: Search,
  //   roles: ['OWNER', 'MANAGER']
  // },
  // {
  //   title: 'Tests',
  //   href: '/tests',
  //   icon: TestTube,
  //   roles: ['OWNER', 'MANAGER']
  // },
  {
    title: 'Tanks',
    href: '/tanks',
    icon: Fuel,
    roles: ['OWNER', 'MANAGER']
  },
  {
    title: 'Safe',
    href: '/safe',
    icon: Wallet,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Salary',
    href: '/salary',
    icon: DollarSign,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Loans',
    href: '/loans',
    icon: Handshake,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Bank Accounts',
    href: '/banks',
    icon: Landmark,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Credit Customers',
    href: '/credit/customers',
    icon: CreditCard,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['OWNER', 'ACCOUNTS']
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
  },
  // {
  //   title: 'Audit Log',
  //   href: '/audit-log',
  //   icon: FileText,
  //   roles: ['OWNER']
  // },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['OWNER']
  },
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    roles: ['OWNER', 'MANAGER', 'ACCOUNTS']
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
      <div className="p-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Fuel Station</h1>
              <p className="text-sm text-muted-foreground">Management System</p>
            </div>
          </div>
      </div>

      {/* Navigation - takes remaining space */}
      <nav className="px-4 flex-1 overflow-y-auto">
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

      {/* Role Display - fixed at bottom */}
      <div className="p-4 flex-shrink-0">
        <div className="bg-sidebar-accent rounded-lg p-3 border border-sidebar-border">
          <div className="text-xs text-muted-foreground mb-1">Current Role</div>
          <div className="text-sm font-medium text-sidebar-foreground capitalize">
            {userRole.toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
