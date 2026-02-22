'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'SYSTEM' | 'OPERATIONS' | 'FINANCIAL' | 'MAINTENANCE' | 'TANK' | 'SHIFT' | 'CREDIT' | 'POS'
  isRead: boolean
  actionUrl?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  readAt?: string | null
  station?: {
    id: string
    name: string
  } | null
}

interface NotificationPagination {
  total: number
  unread: number
  limit: number
  offset: number
}

export default function NotificationsPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [pagination, setPagination] = useState<NotificationPagination | null>(null)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('all')

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (selectedStation && selectedStation !== 'all') {
        params.append('stationId', selectedStation)
      }
      params.append('limit', '100')

      const response = await fetch(`/api/notifications?${params.toString()}`)

      if (response.status === 401) {
        window.location.href = '/login'
        return
      }

      const data = await response.json()

      // Handle migration required case
      if (data.migrationRequired) {
        setError(`Database migration required: ${data.migrationCommand || 'npx prisma migrate dev --name add_notifications'}`)
        setNotifications([])
        setPagination({
          total: 0,
          unread: 0,
          limit: 100,
          offset: 0
        })
        return
      }

      if (!response.ok && !data.notifications) {
        const errorMsg = data.details || data.error || 'Failed to load notifications'
        throw new Error(errorMsg)
      }

      setNotifications(data.notifications || [])
      setPagination(data.pagination || null)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError('Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [selectedStation])

  // Generate notifications based on system events
  const generateNotifications = useCallback(async () => {
    try {
      setError('')
      setSuccess('')

      const params = new URLSearchParams()
      if (selectedStation && selectedStation !== 'all') {
        params.append('stationId', selectedStation)
      }

      const response = await fetch(`/api/notifications/generate?${params.toString()}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to generate notifications')
      }

      const data = await response.json()
      setSuccess(`Generated ${data.generated} new notification${data.generated !== 1 ? 's' : ''}`)

      // Reload notifications after generation
      await loadNotifications()
    } catch (err) {
      console.error('Failed to generate notifications:', err)
      setError('Failed to generate notifications')
    }
  }, [loadNotifications, selectedStation])

  // Load notifications on mount and when station changes
  useEffect(() => {
    // Auto-generate notifications first, then load them
    const initializeNotifications = async () => {
      await generateNotifications()
      await loadNotifications()
    }

    initializeNotifications()

    // Auto-refresh and regenerate every 5 minutes
    const interval = setInterval(async () => {
      await generateNotifications()
      await loadNotifications()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [generateNotifications, loadNotifications])

  // Filter notifications based on search and filters
  useEffect(() => {
    let filtered = notifications

    // Filter by tab (read/unread)
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.isRead)
    } else if (activeTab === 'read') {
      filtered = filtered.filter(n => n.isRead)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(n => n.category === filterCategory)
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchTerm, filterPriority, filterCategory, activeTab])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
        )
        // Notify TopBar to refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationRead'))
        }
      }
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const markAsUnread = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: false })
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: false, readAt: null } : n)
        )
        // Notify TopBar to refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationUpdated'))
        }
      }
    } catch (err) {
      console.error('Failed to mark as unread:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        // Notify TopBar to refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationUpdated'))
        }
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead)
      await Promise.all(unreadNotifications.map(n => markAsRead(n.id)))
      // Notify TopBar to refresh (single event after all are marked)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notificationRead'))
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'ERROR': return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'INFO': return <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      case 'SUCCESS': return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      default: return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'LOW': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
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

  const unreadCount = pagination?.unread || notifications.filter(n => !n.isRead).length
  const totalCount = pagination?.total || notifications.length

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {unreadCount} unread of {totalCount} total notifications.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Feed */}
      <div className="flex flex-1 gap-6 min-h-0 overflow-hidden">
        {/* Left Sidebar - Filters & Navigation */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-6 overflow-y-auto pr-2">
          {/* Status Tabs (Re-implemented as a Nav List for better sidebar feel) */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Status</h3>
            {[
              { id: 'all', label: 'All Notifications', count: totalCount },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { id: 'read', label: 'Read', count: totalCount - unreadCount }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <Badge variant={activeTab === tab.id ? "default" : "secondary"} className="h-5 px-1.5 text-[10px]">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Type Filters */}
          <div className="space-y-3 px-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="FINANCIAL">Financial</SelectItem>
                    <SelectItem value="TANK">Tank</SelectItem>
                    <SelectItem value="SHIFT">Shift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Feed */}
        <main className="flex-1 flex flex-col min-w-0 space-y-4 overflow-hidden">
          {/* Search & Mobile Filter Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                className="pl-9 h-10 border shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Mobile-only Filter (Simple Select for now as we have aside on LG) */}
            <div className="lg:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-[120px] h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Container for feed items */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {/* Contextual Alerts */}
            {error && (
              <Alert variant={error.includes('migration') ? "default" : "destructive"} className={`mb-4 border shadow-sm ${error.includes('migration') ? "bg-orange-500/10 border-orange-500/20" : ""}`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mb-4 bg-emerald-500/10 border-emerald-500/20 shadow-sm">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-xs text-emerald-600 font-medium">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <RefreshCw className="h-10 w-10 text-muted-foreground/30 animate-spin mb-4" />
                <p className="text-sm text-muted-foreground font-medium">Retrieving notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl bg-card border-dashed">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Bell className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">All Clear!</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mt-1">
                  {searchTerm || filterPriority !== 'all' || filterCategory !== 'all'
                    ? 'No notifications match your current filters. Try resetting them.'
                    : 'You have no new notifications. Everything is running smoothly!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  // Color mapping for accent bar and icon bg
                  const typeColors: Record<string, string> = {
                    ERROR: 'bg-rose-500',
                    WARNING: 'bg-amber-500',
                    SUCCESS: 'bg-emerald-500',
                    INFO: 'bg-blue-500'
                  }

                  const typeBg: Record<string, string> = {
                    ERROR: 'bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400',
                    WARNING: 'bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
                    SUCCESS: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
                    INFO: 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                  }

                  return (
                    <Card
                      key={notification.id}
                      className={`
                        relative group transition-all duration-200 border shadow-sm
                        hover:shadow-md cursor-pointer overflow-hidden
                        ${!notification.isRead ? 'bg-card' : 'bg-muted/30 opacity-80'}
                      `}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Unread Accent Bar */}
                      {!notification.isRead && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${typeColors[notification.type] || 'bg-primary'}`} />
                      )}

                      <div className="p-4 flex gap-4">
                        {/* Icon Container with background style alignment */}
                        <div className={`hidden sm:flex shrink-0 p-2.5 h-11 w-11 items-center justify-center rounded-xl ${typeBg[notification.type] || 'bg-muted text-foreground'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-sm font-bold truncate ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {notification.title}
                                </h3>
                                {!notification.isRead && (
                                  <span className="shrink-0 w-2 h-2 bg-primary rounded-full animate-pulse" />
                                )}
                              </div>
                              <p className={`text-[13px] line-clamp-2 ${!notification.isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                                {notification.message}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              <span className="text-[10px] font-medium text-muted-foreground hidden md:inline">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {notification.isRead ? (
                                    <DropdownMenuItem onClick={() => markAsUnread(notification.id)}>
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Mark as Unread
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Mark as Read
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-destructive font-medium"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px] h-5 py-0 bg-muted/50 border-muted">
                              {notification.category}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] h-5 py-0 ${getPriorityBadgeColor(notification.priority)}`}>
                              {notification.priority}
                            </Badge>
                            {notification.station && (
                              <Badge variant="outline" className="text-[10px] h-5 py-0 border-primary/20 text-primary">
                                {notification.station.name}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground md:hidden ml-auto">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
