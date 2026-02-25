
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useStation } from '@/contexts/StationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
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
  Clock,
  Sun,
  Moon,
  Monitor,
  RefreshCw,
  User,
  Menu
} from 'lucide-react'

type UserRole = 'DEVELOPER' | 'OWNER' | 'MANAGER' | 'ACCOUNTS'

interface TopBarProps {
  userRole: UserRole
  onMenuClick?: () => void
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'WARNING' | 'ERROR' | 'INFO' | 'SUCCESS' | 'warning' | 'error' | 'info' | 'success'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  createdAt: string
  read: boolean
  isRead: boolean
  actionUrl?: string | null
}

const roleColors = {
  DEVELOPER: 'bg-red-500/20 text-red-600 dark:bg-red-600/30 dark:text-red-300',
  OWNER: 'bg-purple-500/20 text-purple-600 dark:bg-purple-600/30 dark:text-purple-300',
  MANAGER: 'bg-orange-500/20 text-orange-600 dark:bg-orange-600/30 dark:text-orange-300',
  ACCOUNTS: 'bg-green-500/20 text-green-600 dark:bg-green-600/30 dark:text-green-300'
}

export function TopBar({ userRole, onMenuClick }: TopBarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const { selectedStation, stations, setSelectedStation, getSelectedStation, isLoading: isStationLoading } = useStation()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true)
      const params = new URLSearchParams()
      if (selectedStation && selectedStation !== 'all') {
        params.append('stationId', selectedStation)
      }
      params.append('limit', '10') // Get top 10 unread for dropdown
      params.append('isRead', 'false') // Only unread notifications

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }).catch((fetchError) => {
        // Handle network errors and aborted requests
        clearTimeout(timeoutId)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn('Notifications request timed out')
        } else {
          console.warn('Network error loading notifications:', fetchError)
        }
        setNotifications([])
        return null
      })

      clearTimeout(timeoutId)

      // If fetch failed, response will be null
      if (!response) {
        setNotifications([])
        return
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Session expired
          window.location.href = '/login'
          return
        }
        // If API fails, just show empty notifications
        console.warn(`Notifications API returned ${response.status}: ${response.statusText}`)
        setNotifications([])
        return
      }

      const data = await response.json().catch((jsonError) => {
        console.warn('Failed to parse notifications response:', jsonError)
        setNotifications([])
        return null
      })

      if (!data) {
        setNotifications([])
        return
      }

      // Handle migration required case
      if (data.migrationRequired || data.error) {
        console.warn('Notifications API error:', data.error || data.details)
        setNotifications([])
        return
      }

      if (data.notifications && Array.isArray(data.notifications)) {
        interface ApiNotification {
          id: string
          title?: string
          message?: string
          type?: string
          priority?: string
          timestamp?: string
          createdAt?: string
          read?: boolean
          isRead?: boolean
          actionUrl?: string | null
        }

        // Map API format to TopBar format
        const mappedNotifications = (data.notifications as ApiNotification[]).map((n) => ({
          id: n.id,
          title: n.title || 'Notification',
          message: n.message || '',
          type: (n.type || 'info').toLowerCase() as Notification['type'], // Convert to lowercase for compatibility
          priority: (n.priority || 'medium').toLowerCase() as Notification['priority'], // Convert to lowercase for compatibility
          timestamp: n.createdAt || n.timestamp || new Date().toISOString(),
          createdAt: n.createdAt || n.timestamp || new Date().toISOString(),
          read: n.isRead || n.read || false,
          isRead: n.isRead || n.read || false,
          actionUrl: n.actionUrl || null
        }))

        // Filter to only show unread notifications in the dropdown
        const unreadOnly = mappedNotifications.filter((n) => !n.read && !n.isRead)
        setNotifications(unreadOnly)

        // Use the total unread count from pagination, not just the count of fetched notifications
        if (data.pagination && typeof data.pagination.unread === 'number') {
          setTotalUnreadCount(data.pagination.unread)
        } else {
          setTotalUnreadCount(unreadOnly.length)
        }
      } else {
        setNotifications([])
        setTotalUnreadCount(0)
      }
      setIsLoadingNotifications(false)
    } catch (error) {
      // Handle any other errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Notifications request timed out')
      } else {
        console.error('Failed to load notifications:', error)
      }
      setNotifications([])
      setTotalUnreadCount(0)
      setIsLoadingNotifications(false)
    }
  }, [selectedStation])

  // Load notifications on mount and when station changes
  useEffect(() => {
    loadNotifications()

    // Auto-refresh every 30 seconds (for real-time updates)
    const interval = setInterval(loadNotifications, 30 * 1000)
    return () => clearInterval(interval)
  }, [selectedStation, loadNotifications])

  // Listen for notification updates from other pages
  useEffect(() => {
    const handleNotificationUpdate = () => {
      loadNotifications()
    }

    window.addEventListener('notificationRead', handleNotificationUpdate)
    window.addEventListener('notificationUpdated', handleNotificationUpdate)

    return () => {
      window.removeEventListener('notificationRead', handleNotificationUpdate)
      window.removeEventListener('notificationUpdated', handleNotificationUpdate)
    }
  }, [loadNotifications])

  // Use the total unread count from API, not the count of loaded notifications
  const unreadCount = totalUnreadCount

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  const getSelectedStationName = () => {
    if (selectedStation === 'all') return 'All Stations'
    const station = getSelectedStation()
    return station ? `${station.name} / ${station.city}` : 'All Stations'
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read via API
    if (!notification.read && !notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        })
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true, isRead: true } : n)
        )
        // Decrease unread count
        setTotalUnreadCount(prev => Math.max(0, prev - 1))
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    } else {
      // If no action URL, navigate to notifications page
      router.push('/notifications')
    }
  }

  const getNotificationIcon = (type: string) => {
    const normalizedType = type.toUpperCase()
    switch (normalizedType) {
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'ERROR': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'INFO': return <Clock className="h-4 w-4 text-orange-600" />
      case 'SUCCESS': return <Clock className="h-4 w-4 text-green-600" />
      default: return <Bell className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    const normalizedType = type.toUpperCase()
    switch (normalizedType) {
      case 'WARNING': return 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'ERROR': return 'bg-red-500/20 text-red-600 dark:bg-red-600/30 dark:text-red-300'
      case 'INFO': return 'bg-orange-500/20 text-orange-600 dark:bg-orange-600/30 dark:text-orange-300'
      case 'SUCCESS': return 'bg-green-500/20 text-green-600 dark:bg-green-600/30 dark:text-green-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Just now'
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <h2 className="text-xl md:text-2xl font-semibold text-foreground truncate max-w-[120px] md:max-w-none">
            Dashboard
          </h2>
          <Badge className={cn("hidden sm:flex", roleColors[userRole])}>
            {userRole}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {!isLoadingNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500/90 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-base">Unread Notifications</h3>
                <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
              </div>

              {isLoadingNotifications ? (
                <div className="px-4 py-6 text-center text-base text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-base text-muted-foreground">
                  No unread notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`px-4 py-4 cursor-pointer hover:bg-muted ${!notification.read && !notification.isRead ? 'bg-primary/10 dark:bg-primary/20' : ''
                        }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-base font-semibold text-foreground truncate">
                              {notification.title}
                            </p>
                            <Badge className={`text-xs font-medium ${getNotificationBadgeColor(notification.type)}`}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1.5 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-sm text-muted-foreground font-medium">
                            {formatTimeAgo(notification.timestamp || notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && !notification.isRead && (
                          <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-2"></div>
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
                    className="text-center text-base font-semibold text-primary hover:text-orange-700 cursor-pointer py-3"
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
              <Button variant="outline" size="sm" className="gap-2" disabled={isStationLoading}>
                <Building2 className="h-4 w-4" />
                {isStationLoading ? 'Loading...' : getSelectedStationName()}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelectedStation('all')}
                className={selectedStation === 'all' ? 'bg-primary/10 dark:bg-primary/20' : ''}
              >
                All Stations
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {stations.map((station) => (
                <DropdownMenuItem
                  key={station.id}
                  onClick={() => setSelectedStation(station.id)}
                  className={selectedStation === station.id ? 'bg-primary/10 dark:bg-primary/20' : ''}
                >
                  {station.name} / {station.city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-primary/10 dark:bg-primary/20' : ''}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-primary/10 dark:bg-primary/20' : ''}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-primary/10 dark:bg-primary/20' : ''}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logout Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2 sm:px-3">
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push('/settings/organization')} className="cursor-pointer">
                <Building2 className="mr-2 h-4 w-4" />
                Organization
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-700">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
