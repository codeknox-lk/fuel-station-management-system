'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings,
  RefreshCw,
  Sparkles
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
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('all')

  // Load notifications from API
  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (selectedStation && selectedStation !== 'all') {
        params.append('stationId', selectedStation)
      }
      params.append('limit', '100')

      const response = await fetch(`/api/notifications?${params.toString()}`)
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
  }

  // Generate notifications based on system events
  const generateNotifications = async () => {
    try {
      setGenerating(true)
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
    } finally {
      setGenerating(false)
    }
  }

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
  }, [selectedStation])

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

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType)
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === filterPriority)
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(n => n.category === filterCategory)
    }

    setFilteredNotifications(filtered)
  }, [notifications, searchTerm, filterType, filterPriority, filterCategory, activeTab])

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
      case 'INFO': return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      case 'SUCCESS': return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      default: return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'WARNING': return 'bg-yellow-500/20 text-yellow-400 dark:bg-yellow-600/30 dark:text-yellow-300'
      case 'ERROR': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      case 'INFO': return 'bg-blue-500/20 text-blue-400 dark:bg-blue-600/30 dark:text-blue-300'
      case 'SUCCESS': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      default: return 'bg-muted text-foreground'
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount} unread of {totalCount} total notifications
            {selectedStation && selectedStation !== 'all' && ' • Filtered by station'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadNotifications} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant={error.includes('migration') ? "default" : "destructive"} className={error.includes('migration') ? "bg-blue-500/10 border-blue-500/20" : ""}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {error.includes('migration') || error.includes('regenerated') ? (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold mb-2">
                  {error.includes('regenerated')
                    ? 'Prisma client needs to be regenerated:'
                    : 'Database migration was successful! Next step:'}
                </p>
                {error.includes('regenerated') ? (
                  <>
                    <p className="text-sm mb-2">Simply restart your Next.js dev server:</p>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      <li>Stop the dev server (Ctrl+C in terminal)</li>
                      <li>Start it again: <code className="bg-background px-1 py-0.5 rounded">npm run dev</code></li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      The Prisma client will be automatically regenerated when the server restarts.
                    </p>
                  </>
                ) : (
                  <code className="block text-xs bg-background p-2 rounded border">
                    Restart your Next.js dev server
                  </code>
                )}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-500/10 border-green-500/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <FormCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger id="priority">
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
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="OPERATIONS">Operations</SelectItem>
                <SelectItem value="FINANCIAL">Financial</SelectItem>
                <SelectItem value="TANK">Tank</SelectItem>
                <SelectItem value="SHIFT">Shift</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormCard>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredNotifications.length} notification${filteredNotifications.length !== 1 ? 's' : ''} shown`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({totalCount - unreadCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No notifications found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== 'all' || filterPriority !== 'all' || filterCategory !== 'all'
                      ? 'Try adjusting your filters'
                      : 'You\'re all caught up! Notifications are automatically generated based on system events.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors hover:bg-muted cursor-pointer ${!notification.isRead ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20 dark:border-blue-500/30' : 'bg-card border-border'
                        }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                              )}
                              {notification.station && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.station.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Badge className={`text-xs ${getNotificationBadgeColor(notification.type)}`}>
                                {notification.type}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityBadgeColor(notification.priority)}`}>
                                {notification.priority}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
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
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <p className="text-sm text-foreground mb-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatTimeAgo(notification.createdAt)}</span>
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                            </div>

                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleNotificationClick(notification)
                                }}
                              >
                                Take Action
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
