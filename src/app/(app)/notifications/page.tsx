'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  Settings
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
  type: 'warning' | 'error' | 'info' | 'success'
  priority: 'high' | 'medium' | 'low'
  timestamp: string
  read: boolean
  actionUrl?: string
  category: 'system' | 'operations' | 'financial' | 'maintenance'
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('all')

  // Mock notifications - in real app, this would come from API
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'Low Tank Level',
        message: 'Tank 3 (Diesel) is at 15% capacity - refill needed urgently',
        type: 'warning',
        priority: 'high',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/tanks',
        category: 'operations'
      },
      {
        id: '2',
        title: 'POS Reconciliation Pending',
        message: '3 POS terminals need batch reconciliation for today',
        type: 'warning',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/pos/reconcile',
        category: 'financial'
      },
      {
        id: '3',
        title: 'Credit Payment Overdue',
        message: 'ABC Company payment is 5 days overdue (Rs. 25,000)',
        type: 'error',
        priority: 'high',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/credit/aging',
        category: 'financial'
      },
      {
        id: '4',
        title: 'Shift Variance Alert',
        message: 'Morning shift had Rs. 500 shortage (above tolerance)',
        type: 'warning',
        priority: 'medium',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/shifts',
        category: 'operations'
      },
      {
        id: '5',
        title: 'Price Update Scheduled',
        message: 'Petrol 92 price increase effective tomorrow 6 AM',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/settings/prices',
        category: 'system'
      },
      {
        id: '6',
        title: 'Pump Maintenance Due',
        message: 'Pump P1N2 is due for scheduled maintenance',
        type: 'info',
        priority: 'low',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/maintenance',
        category: 'maintenance'
      },
      {
        id: '7',
        title: 'Daily Report Generated',
        message: 'Daily sales report for Station 1 has been generated',
        type: 'success',
        priority: 'low',
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/reports/daily',
        category: 'system'
      },
      {
        id: '8',
        title: 'System Backup Completed',
        message: 'Automated system backup completed successfully',
        type: 'success',
        priority: 'low',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/settings',
        category: 'system'
      },
      {
        id: '9',
        title: 'New Credit Customer',
        message: 'XYZ Transport has been approved as a credit customer',
        type: 'success',
        priority: 'medium',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionUrl: '/credit/customers',
        category: 'financial'
      },
      {
        id: '10',
        title: 'Fuel Delivery Scheduled',
        message: 'Petrol 92 delivery scheduled for tomorrow 10 AM',
        type: 'info',
        priority: 'medium',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        actionUrl: '/tanks/deliveries',
        category: 'operations'
      }
    ]
    setNotifications(mockNotifications)
  }, [])

  // Filter notifications based on search and filters
  useEffect(() => {
    let filtered = notifications

    // Filter by tab (read/unread)
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (activeTab === 'read') {
      filtered = filtered.filter(n => n.read)
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

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAsUnread = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: false } : n)
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      case 'info': return <Clock className="h-5 w-5 text-blue-600" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      default: return <Bell className="h-5 w-5 text-gray-600" />
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

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
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

  const unreadCount = notifications.filter(n => !n.read).length
  const totalCount = notifications.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-purple-600" />
            Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            {unreadCount} unread of {totalCount} total notifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FormCard title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
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
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
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
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormCard>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({totalCount - unreadCount})</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                  <p className="text-gray-500">
                    {searchTerm || filterType !== 'all' || filterPriority !== 'all' || filterCategory !== 'all'
                      ? 'Try adjusting your filters'
                      : 'You\'re all caught up!'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg transition-colors hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs ${getNotificationBadgeColor(notification.type)}`}>
                                {notification.type}
                              </Badge>
                              <Badge className={`text-xs ${getPriorityBadgeColor(notification.priority)}`}>
                                {notification.priority}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {notification.read ? (
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
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{formatTimeAgo(notification.timestamp)}</span>
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                            </div>
                            
                            {notification.actionUrl && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleNotificationClick(notification)}
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
