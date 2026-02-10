'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStation } from '@/contexts/StationContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Button } from '@/components/ui/button'
import { FormCard } from '@/components/ui/FormCard'
import {
  Fuel, CreditCard, DollarSign,
  AlertTriangle, Clock, Activity, FileText, Wallet,
  Building2, CheckCircle2, Package, ShoppingBag
} from 'lucide-react'

interface FuelStock {
  name: string
  stock: number
  capacity: number
  percentage: number
}

interface ActiveShiftDetail {
  id: string
  station?: {
    name: string
  }
  type: 'PUMP' | 'SHOP' | 'MIXED'
  startTime: string
}

interface ActivityItem {
  action: string
  entity: string
  userName: string
  userRole: string
  timestamp: string
}

interface AlertItem {
  message: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { selectedStation, isAllStations } = useStation()
  const { organization } = useOrganization()
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    activeShifts: 0,
    activeShiftDetails: [] as ActiveShiftDetail[],
    safeBalance: 0,
    creditOutstanding: 0,
    todayPOSSales: 0,
    totalTanks: 0,
    lowStockTanks: 0,
    criticalAlerts: 0,
    pendingDeliveries: 0
  })
  const [fuelStock, setFuelStock] = useState<FuelStock[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStation])

  const loadDashboardData = async () => {
    try {
      const params = selectedStation && selectedStation !== 'all' ? `?stationId=${selectedStation}` : ''
      const response = await fetch(`/api/dashboard/summary${params}`)

      if (response.ok) {
        const data = await response.json()

        setStats({
          todaySales: data.stats.todaySales || 0,
          todayTransactions: data.stats.todayTransactions || 0,
          activeShifts: data.stats.activeShifts || 0,
          activeShiftDetails: data.stats.activeShiftDetails || [],
          safeBalance: data.stats.safeBalance || 0,
          creditOutstanding: data.stats.creditOutstanding || 0,
          todayPOSSales: 0,
          totalTanks: data.stats.totalTanks || 0,
          lowStockTanks: data.stats.lowStockTanks || 0,
          criticalAlerts: data.stats.criticalAlerts || 0,
          pendingDeliveries: data.stats.pendingDeliveries || 0
        })

        setFuelStock(data.fuelStock || [])
        setAlerts(data.alerts || [])
        setRecentActivity(data.recentActivity || [])
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  // Removed old separate loading functions - now using unified /api/dashboard/summary endpoint

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, {organization?.name || 'Dashboard'}
            </h1>
            <p className="text-orange-100">
              {isAllStations ? 'All Stations Overview' : 'Station Operations Overview'}
            </p>
          </div>
          <Building2 className="h-12 w-12 opacity-50" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Shifts */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/shifts')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeShifts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeShifts > 0 ? 'Currently running' : 'No active shifts'}
            </p>
            {stats.activeShiftDetails.map((shift) => (
              <div key={shift.id} className="mt-2 pt-2 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shift.type === 'SHOP' ? (
                    <div className="flex items-center gap-1 text-blue-600">
                      <ShoppingBag className="h-3 w-3" />
                      <span className="text-[10px] uppercase font-bold">Shop</span>
                    </div>
                  ) : shift.type === 'MIXED' ? (
                    <div className="flex items-center gap-1 text-purple-600">
                      <Fuel className="h-3 w-3" />
                      <span className="text-[10px]">+</span>
                      <ShoppingBag className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Fuel className="h-3 w-3" />
                      <span className="text-[10px] uppercase font-bold">Pump</span>
                    </div>
                  )}
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {shift.station?.name || 'Unknown Station'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/reports/daily-sales')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">Rs. {(stats.todaySales || (0) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todayTransactions} transactions
            </p>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium">
                {stats.todaySales > 0 ? (
                  <>Avg: Rs. {Math.round((stats.todaySales || 0) / (stats.todayTransactions || (1)) || 0).toLocaleString()}/sale</>
                ) : (
                  'No sales yet today'
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/tanks')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.lowStockTanks > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.lowStockTanks > 0 ? stats.lowStockTanks : stats.totalTanks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.lowStockTanks > 0 ? 'Tanks below 20%' : 'All tanks OK'}
            </p>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium">
                Total: {stats.totalTanks} tanks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Safe & Credit */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/safe')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash & Credit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Rs. {(stats.safeBalance || (0) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Safe balance</p>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs font-medium text-orange-600">
                Credit: Rs. {(stats.creditOutstanding || (0) || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fuel Stock Status */}
        <FormCard title="Fuel Inventory" description="Current stock levels">
          <div className="space-y-4">
            {fuelStock.map((fuel, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{fuel.name}</span>
                  <span className="text-muted-foreground">
                    {(fuel.stock || (0) || 0).toLocaleString()} / {(fuel.capacity || (0) || 0).toLocaleString()} L
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${fuel.percentage < 20 ? 'bg-red-500' :
                      fuel.percentage < 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(fuel.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {fuelStock.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No tank data available</p>
            )}
          </div>
        </FormCard>

        {/* Alerts */}
        <FormCard title="Alerts & Notifications" description="System alerts">
          <div className="space-y-2">
            {stats.lowStockTanks > 0 && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950 rounded">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">Low Stock Alert</p>
                  <p className="text-xs text-red-700 dark:text-red-300">{stats.lowStockTanks} tanks below 20%</p>
                </div>
              </div>
            )}
            {alerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 border rounded">
                <CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && stats.lowStockTanks === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
            )}
          </div>
        </FormCard>
      </div>

      {/* Quick Actions */}
      <FormCard title="Quick Actions" description="Common operations">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/shifts/open')
            }}
          >
            <Clock className="h-6 w-6 text-green-600" />
            <span className="text-sm font-medium">Start Shift</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/shifts/close')
            }}
          >
            <CheckCircle2 className="h-6 w-6 text-orange-600" />
            <span className="text-sm font-medium">Close Shift</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/banks')
            }}
          >
            <CreditCard className="h-6 w-6 text-orange-600" />
            <span className="text-sm font-medium">Banks</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/tanks/deliveries')
            }}
          >
            <Package className="h-6 w-6 text-orange-600" />
            <span className="text-sm font-medium">Add Delivery</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/safe')
            }}
          >
            <Wallet className="h-6 w-6 text-yellow-600" />
            <span className="text-sm font-medium">Safe</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950"
            onClick={(e) => {
              e.preventDefault()
              router.push('/reports')
            }}
          >
            <FileText className="h-6 w-6 text-orange-600" />
            <span className="text-sm font-medium">Reports</span>
          </Button>
        </div>
      </FormCard>

      {/* Recent Activity */}
      <FormCard title="Recent Activity" description="Latest system activities">
        <div className="space-y-2">
          {recentActivity
            .filter(activity => {
              // Get current user role from localStorage
              const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
              // Hide developer activities from non-developers
              if (activity.userRole === 'DEVELOPER' && userRole !== 'DEVELOPER') {
                return false
              }
              return true
            })
            .slice(0, 8)
            .map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{activity.action} - {activity.entity}</p>
                    <p className="text-xs text-muted-foreground">{activity.userName}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          {recentActivity.filter(activity => {
            const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
            if (activity.userRole === 'DEVELOPER' && userRole !== 'DEVELOPER') {
              return false
            }
            return true
          }).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
        </div>
      </FormCard>
    </div>
  )
}
