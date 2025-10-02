'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { FormCard } from '@/components/ui/FormCard'
import { 
  Clock, 
  Users, 
  PlayCircle, 
  StopCircle,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface Shift {
  id: string
  stationId: string
  stationName: string
  templateName: string
  startTime: string
  endTime?: string
  status: 'OPEN' | 'CLOSED'
  openedBy: string
  closedBy?: string
  assignmentCount: number
  totalSales?: number
}

interface ShiftStats {
  activeShifts: number
  todayShifts: number
  totalSales: number
  averageShiftDuration: number
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [stats, setStats] = useState<ShiftStats>({
    activeShifts: 0,
    todayShifts: 0,
    totalSales: 0,
    averageShiftDuration: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShifts()
  }, [])

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shifts')
      const data = await response.json()
      
      // Transform the data to include station names and calculate stats
      const transformedShifts = data.map((shift: { id: string; stationId: string; templateId: string; startTime: string; endTime?: string; status: string }) => ({
        ...shift,
        stationName: `Station ${shift.stationId}`,
        templateName: `Template ${shift.templateId}`, // Map templateId to templateName
        assignmentCount: 4, // Mock assignment count
        totalSales: shift.status === 'CLOSED' ? Math.floor(Math.random() * 500000) + 100000 : undefined
      }))
      
      setShifts(transformedShifts)
      
      // Calculate stats
      const activeShifts = transformedShifts.filter((s: Shift) => s.status === 'OPEN').length
      const today = new Date().toDateString()
      const todayShifts = transformedShifts.filter((s: Shift) => 
        new Date(s.startTime).toDateString() === today
      ).length
      const closedShifts = transformedShifts.filter((s: Shift) => s.status === 'CLOSED' && s.totalSales)
      const totalSales = closedShifts.reduce((sum: number, s: Shift) => sum + (s.totalSales || 0), 0)
      
      setStats({
        activeShifts,
        todayShifts,
        totalSales,
        averageShiftDuration: 8.5 // Mock average
      })
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const shiftColumns = [
    {
      key: 'stationName' as keyof Shift,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'templateName' as keyof Shift,
      title: 'Template',
      render: (value: unknown) => (
        <Badge variant="outline">{value as string}</Badge>
      )
    },
    {
      key: 'status' as keyof Shift,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        return (
          <Badge variant={status === 'OPEN' ? 'default' : 'secondary'}>
            {status === 'OPEN' ? (
              <><PlayCircle className="h-3 w-3 mr-1" /> Open</>
            ) : (
              <><StopCircle className="h-3 w-3 mr-1" /> Closed</>
            )}
          </Badge>
        )
      }
    },
    {
      key: 'startTime' as keyof Shift,
      title: 'Start Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'endTime' as keyof Shift,
      title: 'End Time',
      render: (value: unknown) => {
        if (!value) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm">
              {new Date(value as string).toLocaleString()}
            </span>
          </div>
        )
      }
    },
    {
      key: 'openedBy' as keyof Shift,
      title: 'Opened By',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'assignmentCount' as keyof Shift,
      title: 'Assignments',
      render: (value: unknown) => (
        <Badge variant="outline">{value as number} pumpers</Badge>
      )
    },
    {
      key: 'totalSales' as keyof Shift,
      title: 'Total Sales',
      render: (value: unknown) => {
        if (!value) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="font-mono font-semibold text-green-600">
              Rs. {(value as number).toLocaleString()}
            </span>
          </div>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600 mt-1">
            Manage station shifts, assignments, and operations
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/shifts/open">
            <Button className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Open Shift
            </Button>
          </Link>
          <Link href="/shifts/close">
            <Button variant="outline" className="flex items-center gap-2">
              <StopCircle className="h-4 w-4" />
              Close Shift
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <PlayCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeShifts}</div>
            <p className="text-xs text-gray-600">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayShifts}</div>
            <p className="text-xs text-gray-600">Started today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Closed shifts today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageShiftDuration}h</div>
            <p className="text-xs text-gray-600">Per shift</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Shifts Alert */}
      {stats.activeShifts > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-medium text-green-800">
                {stats.activeShifts} Active Shift{stats.activeShifts > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-green-700">
                Monitor ongoing operations and close shifts when complete.
              </p>
            </div>
            <Link href="/shifts/close" className="ml-auto">
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                Manage Active Shifts
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Shifts Table */}
      <FormCard 
        title="Recent Shifts" 
        description="View and manage all station shifts"
      >
        <DataTable
          data={shifts}
          columns={shiftColumns}
          searchable={true}
          searchPlaceholder="Search shifts..."
          pagination={true}
          pageSize={10}
          emptyMessage="No shifts found"
        />
      </FormCard>
    </div>
  )
}
