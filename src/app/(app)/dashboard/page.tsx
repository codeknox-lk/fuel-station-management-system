'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStation } from '@/contexts/StationContext'
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
  const { selectedStation, isAllStations, getSelectedStation } = useStation()
  const [recentActivities, setRecentActivities] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState([
    {
      title: 'Today\'s Sales',
      value: 'Rs. 0',
      change: 'No data',
      changeType: 'neutral' as const,
      icon: DollarSign
    },
    {
      title: 'Active Shifts',
      value: '0',
      change: 'No active shifts',
      changeType: 'neutral' as const,
      icon: Clock
    },
    {
      title: 'Avg Duration',
      value: '0h',
      change: 'No data',
      changeType: 'neutral' as const,
      icon: Clock
    },
    {
      title: 'Total Shifts',
      value: '0',
      change: 'No shifts',
      changeType: 'neutral' as const,
      icon: Activity
    }
  ])

  // Load recent activities based on selected station
  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        const url = isAllStations 
          ? '/api/audit-log?recent=true&limit=5'
          : `/api/audit-log?recent=true&limit=5&stationId=${selectedStation}`
        
        const res = await fetch(url)
        if (res.ok) {
          const activities = await res.json()
          setRecentActivities(activities)
        }
      } catch (error) {
        console.error('Failed to load recent activities:', error)
      }
    }

    loadRecentActivities()
  }, [selectedStation, isAllStations])

  // Load real statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const url = isAllStations 
          ? '/api/shifts'
          : `/api/shifts?stationId=${selectedStation}`
        
        const response = await fetch(url)
        const data = await response.json()
        const shifts = Array.isArray(data) ? data : data.shifts || []
        
        // Calculate real statistics
        const activeShifts = shifts.filter((s: Shift) => s.status === 'OPEN')
        const closedShifts = shifts.filter((s: Shift) => s.status === 'CLOSED')
        
                // Calculate total sales from all closed shifts (to match shifts page)
                const totalSales = closedShifts.reduce((sum: number, s: Shift) => 
                  sum + (s.statistics?.totalSales || 0), 0
                )
                
                // Also calculate today's sales for reference
                const today = new Date().toDateString()
                const todayShifts = closedShifts.filter((s: Shift) => 
                  new Date(s.startTime).toDateString() === today
                )
                const todaySales = todayShifts.reduce((sum: number, s: Shift) => 
                  sum + (s.statistics?.totalSales || 0), 0
                )
                
                // Calculate average duration from closed shifts
                const shiftsWithDuration = closedShifts.filter((s: Shift) => 
                  s.statistics?.durationHours && s.statistics.durationHours > 0
                )
                const avgDuration = shiftsWithDuration.length > 0 
                  ? shiftsWithDuration.reduce((sum: number, s: Shift) => 
                      sum + s.statistics.durationHours, 0
                    ) / shiftsWithDuration.length
                  : 0
        
        setStats([
          {
            title: 'Total Sales',
            value: `Rs. ${totalSales.toLocaleString()}`,
            change: totalSales > 0 ? `From ${closedShifts.length} shifts` : 'No sales yet',
            changeType: totalSales > 0 ? 'positive' as const : 'neutral' as const,
            icon: DollarSign
          },
          {
            title: 'Active Shifts',
            value: activeShifts.length.toString(),
            change: activeShifts.length > 0 ? `${activeShifts.length} running` : 'No active shifts',
            changeType: activeShifts.length > 0 ? 'positive' as const : 'neutral' as const,
            icon: Clock
          },
          {
            title: 'Avg Duration',
            value: `${Math.round(avgDuration * 10) / 10}h`,
            change: shiftsWithDuration.length > 0 ? `From ${shiftsWithDuration.length} shifts` : 'No data',
            changeType: avgDuration > 0 ? 'positive' as const : 'neutral' as const,
            icon: Clock
          },
          {
            title: 'Total Shifts',
            value: shifts.length.toString(),
            change: `${closedShifts.length} closed, ${activeShifts.length} active`,
            changeType: 'neutral' as const,
            icon: Activity
          }
        ])
      } catch (error) {
        console.error('Failed to load statistics:', error)
      }
    }

    loadStats()
  }, [selectedStation, isAllStations])

  // Get current station info for display
  const currentStation = getSelectedStation()
  const stationName = isAllStations ? 'All Stations' : (currentStation?.name || 'Unknown Station')



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
          <h1 className="text-2xl font-bold mb-2">
            {isAllStations ? 'Multi-Station Overview' : `Welcome to ${currentStation?.name || 'Station'}`}
          </h1>
          <p className="text-purple-100">
            {isAllStations 
              ? 'Monitor all your fuel stations, track combined sales, and manage operations across locations.'
              : `Monitor your fuel station operations, track sales, and manage daily activities at ${currentStation?.address || 'this location'}.`
            }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={() => router.push('/shifts/open')}
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs">Start Shift</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-200 transition-colors"
                onClick={() => router.push('/tanks/dips')}
              >
                <Fuel className="h-5 w-5" />
                <span className="text-xs">Tank Dip</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                onClick={() => router.push('/pos/batches')}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">POS Batch</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
                onClick={() => router.push('/audits')}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Audit</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-red-50 hover:border-red-200 transition-colors"
                onClick={() => router.push('/shifts/close')}
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs">Close Shift</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                onClick={() => router.push('/credit/sales')}
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-xs">Credit Sale</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-200 transition-colors"
                onClick={() => router.push('/reports/daily')}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Daily Report</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2 hover:bg-teal-50 hover:border-teal-200 transition-colors"
                onClick={() => router.push('/safe/summary')}
              >
                <Activity className="h-5 w-5" />
                <span className="text-xs">Safe Summary</span>
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
            <div 
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-yellow-100 p-2 rounded transition-colors"
              onClick={() => router.push('/tanks')}
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>
                {isAllStations 
                  ? 'Multiple tanks across stations are at low capacity'
                  : `Tank 2 (Diesel) at ${currentStation?.name || 'this station'} is at 15% capacity`
                }
              </span>
            </div>
            <div 
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-yellow-100 p-2 rounded transition-colors"
              onClick={() => router.push('/pos/reconcile')}
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>
                {isAllStations 
                  ? 'POS Batch reconciliation pending across multiple stations'
                  : `POS Batch reconciliation pending for 3 terminals at ${currentStation?.name || 'this station'}`
                }
              </span>
            </div>
            <div 
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-yellow-100 p-2 rounded transition-colors"
              onClick={() => router.push('/credit/aging')}
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>
                {isAllStations 
                  ? 'Multiple credit customers have overdue payments'
                  : `Credit customer payment overdue: ABC Company (${currentStation?.name || 'this station'})`
                }
              </span>
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
