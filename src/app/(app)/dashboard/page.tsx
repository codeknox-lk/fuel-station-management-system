'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Fuel, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Activity,
  FileText
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  userName: string
  userRole: string
  action: string
  entity: string
  details: string
  timestamp: string
  stationName?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [recentActivities, setRecentActivities] = useState<AuditLogEntry[]>([])

  // Load recent activities
  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        const res = await fetch('/api/audit-log?recent=true&limit=5')
        if (res.ok) {
          const activities = await res.json()
          setRecentActivities(activities)
        }
      } catch (error) {
        console.error('Failed to load recent activities:', error)
      }
    }

    loadRecentActivities()
  }, [])

  // Mock data
  const stats = [
    {
      title: 'Today\'s Sales',
      value: 'Rs. 1,250,000',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign
    },
    {
      title: 'Active Shifts',
      value: '3',
      change: '2 pumps active',
      changeType: 'neutral' as const,
      icon: Clock
    },
    {
      title: 'Tank Levels',
      value: '85%',
      change: '2 tanks low',
      changeType: 'warning' as const,
      icon: Fuel
    },
    {
      title: 'POS Transactions',
      value: '156',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: CreditCard
    }
  ]


  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome to Fuel Station Management</h1>
          <p className="text-purple-100">
            Monitor your fuel station operations, track sales, and manage daily activities.
          </p>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <p className={`text-xs ${getChangeColor(stat.changeType)}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-xs">Start Shift</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <Fuel className="h-5 w-5" />
                <span className="text-xs">Tank Dip</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">POS Batch</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Audit</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Tank 2 (Diesel) is at 15% capacity</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>POS Batch reconciliation pending for 3 terminals</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Credit customer payment overdue: ABC Company</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
          <CardDescription>Latest system activities and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{activity.userName}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.userRole}
                      </Badge>
                      <Badge className={`text-xs ${
                        activity.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                        activity.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                        activity.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.action}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{activity.details}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(activity.timestamp).toLocaleString()}</span>
                      {activity.stationName && (
                        <>
                          <span>•</span>
                          <span>{activity.stationName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => router.push('/audit-log')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Full Audit Log
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No recent activities</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
