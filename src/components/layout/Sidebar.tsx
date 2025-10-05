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
  Bell
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
  {
    title: 'Audits',
    href: '/audits',
    icon: Search,
    roles: ['OWNER', 'MANAGER']
  },
  {
    title: 'Tests',
    href: '/tests',
    icon: TestTube,
    roles: ['OWNER', 'MANAGER']
  },
  {
    title: 'Tanks',
    href: '/tanks',
    icon: Fuel,
    roles: ['OWNER', 'MANAGER']
  },
  {
    title: 'POS',
    href: '/pos',
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
  {
    title: 'Audit Log',
    href: '/audit-log',
    icon: FileText,
    roles: ['OWNER']
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['OWNER']
  }
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fuel Station</h1>
              <p className="text-sm text-gray-500">Management System</p>
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
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Current Role</div>
          <div className="text-sm font-medium text-gray-900 capitalize">
            {userRole.toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  )
}
