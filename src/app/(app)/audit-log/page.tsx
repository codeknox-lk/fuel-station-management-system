'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { Label } from '@/components/ui/label'
import { 
  Shield, 
  Activity, 
  Users, 
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  userRole: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  action: string
  entity: string
  entityId?: string
  details: string
  ipAddress?: string
  timestamp: string
  stationId?: string
  stationName?: string
}

interface ActivityStats {
  todayCount: number
  yesterdayCount: number
  totalEntries: number
  uniqueUsers: number
}

export default function AuditLogPage() {
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filter state
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 days ago
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedStation, setSelectedStation] = useState<string>('all')
  const [selectedEntity, setSelectedEntity] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  // Load initial data
  useEffect(() => {
    loadAuditLog()
    loadStats()
  }, [])

  const loadAuditLog = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      
      if (startDate && endDate) {
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
      }
      if (selectedUser && selectedUser !== 'all') params.append('userId', selectedUser)
      if (selectedStation && selectedStation !== 'all') params.append('stationId', selectedStation)
      if (selectedEntity && selectedEntity !== 'all') params.append('entity', selectedEntity)
      if (selectedAction && selectedAction !== 'all') params.append('action', selectedAction)

      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      
      let data = await res.json()
      
      // Filter by action if selected
      if (selectedAction) {
        data = data.filter((entry: AuditLogEntry) => entry.action === selectedAction)
      }
      
      setAuditEntries(data)
    } catch (err) {
      setError('Failed to load audit log')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/audit-log?stats=true')
      if (res.ok) {
        const statsData = await res.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleFilter = () => {
    loadAuditLog()
  }

  const handleClearFilters = () => {
    setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    setEndDate(new Date())
    setSelectedUser('')
    setSelectedStation('')
    setSelectedEntity('')
    setSelectedAction('')
    setTimeout(() => loadAuditLog(), 100)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'UPDATE': return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'DELETE': return <XCircle className="h-4 w-4 text-red-600" />
      case 'VIEW': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <Activity className="h-4 w-4 text-purple-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'VIEW': return 'bg-gray-100 text-gray-800'
      default: return 'bg-purple-100 text-purple-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-red-100 text-red-800'
      case 'MANAGER': return 'bg-blue-100 text-blue-800'
      case 'ACCOUNTS': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const auditColumns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      title: 'Date & Time',
      render: (value: unknown) => {
        const date = new Date(value as string)
        return (
          <div className="text-sm">
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-gray-500">{date.toLocaleTimeString()}</div>
          </div>
        )
      }
    },
    {
      key: 'userName',
      title: 'User',
      render: (value: unknown, row: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">{value as string}</div>
          <Badge className={getRoleColor(row.userRole)}>
            {row.userRole}
          </Badge>
        </div>
      )
    },
    {
      key: 'action',
      title: 'Action',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          {getActionIcon(value as string)}
          <Badge className={getActionColor(value as string)}>
            {value as string}
          </Badge>
        </div>
      )
    },
    {
      key: 'entity',
      title: 'Entity',
      render: (value: unknown) => (
        <Badge variant="outline">
          {(value as string).replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'details',
      title: 'Details',
      render: (value: unknown) => (
        <div className="max-w-md text-sm text-gray-700">
          {value as string}
        </div>
      )
    },
    {
      key: 'stationName',
      title: 'Station',
      render: (value: unknown) => value ? (
        <div className="text-sm text-gray-600">{value as string}</div>
      ) : (
        <div className="text-sm text-gray-400">System-wide</div>
      )
    },
    {
      key: 'ipAddress',
      title: 'IP Address',
      render: (value: unknown) => (
        <div className="text-xs text-gray-500 font-mono">
          {value as string || 'N/A'}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Audit Log</h1>
          <p className="text-gray-600 mt-1">Track all system activities and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAuditLog} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.todayCount}</div>
                  <div className="text-sm text-gray-600">Today&apos;s Activities</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.yesterdayCount}</div>
                  <div className="text-sm text-gray-600">Yesterday&apos;s Activities</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalEntries}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.uniqueUsers}</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <FormCard title="Filter Audit Log">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <DateTimePicker
              value={startDate}
              onChange={(date) => setStartDate(date || new Date())}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <DateTimePicker
              value={endDate}
              onChange={(date) => setEndDate(date || new Date())}
            />
          </div>

          <div>
            <Label htmlFor="user">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="user1">John Manager</SelectItem>
                <SelectItem value="user2">Sarah Accounts</SelectItem>
                <SelectItem value="user3">Owner Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="station">Station</Label>
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger>
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                <SelectItem value="1">Station 1 - Colombo</SelectItem>
                <SelectItem value="2">Station 2 - Kandy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="entity">Entity</Label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="SHIFT">Shifts</SelectItem>
                <SelectItem value="EXPENSE">Expenses</SelectItem>
                <SelectItem value="PRICE">Prices</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="CREDIT_CUSTOMER">Credit Customers</SelectItem>
                <SelectItem value="DELIVERY">Deliveries</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="action">Action</Label>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="VIEW">View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleFilter} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </FormCard>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <FormCard title="Audit Log Entries">
        <DataTable
          data={auditEntries}
          columns={auditColumns}
          searchPlaceholder="Search audit entries..."
          emptyMessage="No audit entries found for the selected filters."
        />
      </FormCard>
    </div>
  )
}
