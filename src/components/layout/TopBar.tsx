'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  LogOut, 
  ChevronDown,
  Building2,
  AlertTriangle,
  Fuel,
  CreditCard,
  Clock,
  TrendingDown
} from 'lucide-react'

type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS'

interface TopBarProps {
  userRole: UserRole
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'warning' | 'error' | 'info' | 'success'
  priority: 'high' | 'medium' | 'low'
  timestamp: string
  read: boolean
  actionUrl?: string
}

const roleColors = {
  OWNER: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  ACCOUNTS: 'bg-green-100 text-green-800'
}

export function TopBar({ userRole }: TopBarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  // Mock notifications - in real app, this would come from API
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Low Tank Level',
        message: 'Tank 3 (Diesel) is at 15% capacity - refill needed',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
        read: false,
        actionUrl: '/tanks'
      },
      {
        id: '2',
        title: 'POS Reconciliation Pending',
        message: '3 POS terminals need batch reconciliation',
        type: 'warning',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        read: false,
        actionUrl: '/pos/reconcile'
      },
      {
        id: '3',
        title: 'Credit Payment Overdue',
        message: 'ABC Company payment is 5 days overdue (Rs. 25,000)',
        type: 'error',
        priority: 'high',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        read: false,
        actionUrl: '/credit/aging'
      },
      {
        id: '4',
        title: 'Shift Variance Alert',
        message: 'Morning shift had Rs. 500 shortage (above tolerance)',
        type: 'warning',
        priority: 'medium',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        read: true,
        actionUrl: '/shifts'
      },
      {
        id: '5',
        title: 'Price Update Scheduled',
        message: 'Petrol 92 price increase effective tomorrow 6 AM',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        read: false,
        actionUrl: '/settings/prices'
      }
    ]
    setNotifications(mockNotifications)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    )
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'info': return <Clock className="h-4 w-4 text-blue-600" />
      case 'success': return <Clock className="h-4 w-4 text-green-600" />
      default: return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      case 'success': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Dashboard
          </h2>
          <Badge className={roleColors[userRole]}>
            {userRole}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-3 py-2 border-b">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              </div>
              
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`px-3 py-3 cursor-pointer hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <Badge className={`text-xs ${getNotificationBadgeColor(notification.type)}`}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              
              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                    onClick={() => router.push('/notifications')}
                  >
                    View all notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Station Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                Station 1
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Station 1 - Colombo</DropdownMenuItem>
              <DropdownMenuItem>Station 2 - Kandy</DropdownMenuItem>
              <DropdownMenuItem>All Stations</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logout Button */}
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
