'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Edit, Trash2, Mail, Shield, User, Crown, UserCheck, ArrowLeft, Key, Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { TempPasswordModal } from '@/components/admin/TempPasswordModal'

interface SystemUser {
  id: string
  name: string
  email: string
  role: 'DEVELOPER' | 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  stationId?: string | null
  stationName?: string | null
  createdAt: string
  updatedAt: string
}

interface Station {
  id: string
  name: string
}



export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MANAGER' as SystemUser['role'],
    stationId: undefined as string | undefined, // Add stationId
    status: 'active' as SystemUser['status']
  })
  const { toast } = useToast()
  const [resetPasswordUser, setResetPasswordUser] = useState<{ username: string; tempPassword: string } | null>(null)
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false)

  // Get current user role
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null
  const isDeveloper = userRole === 'DEVELOPER'
  const isOwner = userRole === 'OWNER'
  const isManager = userRole === 'MANAGER'

  // Define role hierarchy - who can manage whom
  const getRoleHierarchy = () => {
    if (isDeveloper) {
      return ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS']
    }
    if (isOwner) {
      return ['OWNER', 'MANAGER', 'ACCOUNTS']
    }
    if (isManager) {
      return ['MANAGER', 'ACCOUNTS']
    }
    return [] // ACCOUNTS can't manage users
  }

  const manageableRoles = getRoleHierarchy()

  // Filter users based on current user's role
  const filteredUsers = users.filter(user => manageableRoles.includes(user.role))



  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch('/api/stations?active=true')
      if (response.ok) {
        const data = await response.json()
        setStations(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch stations', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()

      if (Array.isArray(data)) {
        setUsers(data)
      } else {
        console.error('Invalid users data:', data)
        setUsers([])
      }
    } catch (error) {
      // Silent error or toast? Toast is better but error variable was unused.
      // We'll keep the toast but use the error content correctly or ignore it clearly
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
    fetchStations()
  }, [fetchUsers, fetchStations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      // Prepare request body with username field
      const requestBody = {
        ...formData,
        username: formData.name // API expects 'username' field
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save user')
      }

      toast({
        title: "Success",
        description: `User ${editingUser ? 'updated' : 'created'} successfully`
      })

      setDialogOpen(false)
      resetForm()
      fetchUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingUser ? 'update' : 'create'} user`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '', // Don't populate password when editing
      role: user.role,
      stationId: user.stationId || undefined,
      status: user.status
    })
    setDialogOpen(true)
  }

  const handleDelete = async (user: SystemUser) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) return

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete user')

      toast({
        title: "Success",
        description: "User deleted successfully"
      })

      fetchUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleResetPassword = async (user: SystemUser) => {
    // Prevent resetting own password
    const currentUserId = localStorage.getItem('userId')
    if (user.id === currentUserId) {
      toast({
        title: "Error",
        description: "You cannot reset your own password using this method",
        variant: "destructive"
      })
      return
    }

    // Confirm action
    if (!confirm(`Are you sure you want to reset the password for ${user.name}? They will be logged out and required to change their password on next login.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to reset password')
      }

      const data = await response.json()

      // Show temp password modal
      setResetPasswordUser({
        username: data.username,
        tempPassword: data.tempPassword
      })
      setShowTempPasswordModal(true)

      toast({
        title: "Success",
        description: "Password reset successfully"
      })

      fetchUsers()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'MANAGER',
      stationId: undefined,
      status: 'active'
    })
  }

  const getStatusColor = (status: SystemUser['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      case 'inactive': return 'bg-muted text-foreground'
      case 'suspended': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getRoleColor = (role: SystemUser['role']) => {
    switch (role) {
      case 'DEVELOPER': return 'bg-red-500/20 text-red-400 dark:bg-red-600/30 dark:text-red-300'
      case 'OWNER': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'MANAGER': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'ACCOUNTS': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      default: return 'bg-muted text-foreground'
    }
  }

  const getRoleIcon = (role: SystemUser['role']) => {
    switch (role) {
      case 'DEVELOPER': return <Shield className="h-3 w-3 fill-current" />
      case 'OWNER': return <Crown className="h-3 w-3" />
      case 'MANAGER': return <Shield className="h-3 w-3" />
      case 'ACCOUNTS': return <UserCheck className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const formatLastLogin = (dateString: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Never'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const columns = [
    {
      key: 'name' as keyof SystemUser,
      title: 'Name',
      render: (value: unknown, row: SystemUser) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'stationName' as keyof SystemUser,
      title: 'Station',
      render: (value: unknown, row: SystemUser) => (
        row.stationName ? (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{row.stationName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )
      )
    },
    {
      key: 'role' as keyof SystemUser,
      title: 'Role',
      render: (value: unknown) => (
        <Badge className={getRoleColor(value as SystemUser['role'])}>
          <div className="flex items-center gap-1">
            {getRoleIcon(value as SystemUser['role'])}
            {value as string}
          </div>
        </Badge>
      )
    },
    {
      key: 'status' as keyof SystemUser,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as string
        if (!status) return <Badge className="bg-muted text-foreground">Unknown</Badge>
        return (
          <Badge className={getStatusColor(status as SystemUser['status'])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
      }
    },
    {
      key: 'lastLogin' as keyof SystemUser,
      title: 'Last Login',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {formatLastLogin(value as string)}
        </span>
      )
    },
    {
      key: 'createdAt' as keyof SystemUser,
      title: 'Created',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value as string).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'id' as keyof SystemUser,
      title: 'Actions',
      render: (value: unknown, row: SystemUser) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {(isDeveloper || isOwner) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResetPassword(row)}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700"
              title="Reset Password"
            >
              <Key className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 dark:text-red-400 hover:text-red-700"
            disabled={row.role === 'OWNER'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  const stats = [
    {
      title: 'Total Users',
      value: filteredUsers.length.toString(),
      description: 'System users',
      icon: <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    },
    {
      title: 'Active',
      value: filteredUsers.filter(u => u.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500/10 dark:bg-green-500/200 rounded-full" />
    },
    {
      title: 'Owners',
      value: filteredUsers.filter(u => u.role === 'OWNER').length.toString(),
      description: 'System owners',
      icon: <Crown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    },
    {
      title: 'Managers',
      value: filteredUsers.filter(u => u.role === 'MANAGER').length.toString(),
      description: 'Station managers',
      icon: <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    }
  ]

  const rolePermissions = {
    DEVELOPER: [
      'FULL system access',
      'Add/Delete stations',
      'All OWNER permissions',
      'System configuration',
      'Database management'
    ],
    OWNER: [
      'Full system access',
      'User management',
      'Settings configuration',
      'Financial reports',
      'All station operations'
    ],
    MANAGER: [
      'Station operations',
      'Shift management',
      'Tank operations',
      'POS management',
      'Credit management'
    ],
    ACCOUNTS: [
      'Financial management',
      'POS reconciliation',
      'Credit management',
      'Reports access',
      'Safe operations'
    ]
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage system users, roles, and access permissions
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password field - required for new users, optional for editing */}
              <div>
                <Label htmlFor="password">
                  Password {editingUser ? '(leave blank to keep current)' : ''}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    title="Select User Role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemUser['role'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {/* Show roles based on current user's permissions */}
                    {isDeveloper && <option value="DEVELOPER">Developer</option>}
                    {(isDeveloper || isOwner) && <option value="OWNER">Owner</option>}
                    {(isDeveloper || isOwner || isManager) && <option value="MANAGER">Manager</option>}
                    {(isDeveloper || isOwner || isManager) && <option value="ACCOUNTS">Accounts</option>}
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    title="Select User Status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as SystemUser['status'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Station Selection - Show for Managers/Staff if stations exist */}
              {isDeveloper || isOwner && (
                <div>
                  <Label htmlFor="station">Assigned Station</Label>
                  <Select
                    value={formData.stationId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, stationId: value === "none" ? undefined : value })}
                    disabled={stations.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a station (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Global/No Station)</SelectItem>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigning a station limits the user&apos;s scope to that station (especially for Managers).
                  </p>
                </div>
              )}

              {/* Role Permissions Preview */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  {getRoleIcon(formData.role)}
                  {formData.role} Permissions
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {rolePermissions[formData.role].map((permission, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.title}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Permissions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(rolePermissions)
          .filter(([role]) => !isOwner || role !== 'DEVELOPER')
          .map(([role, permissions]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getRoleIcon(role as SystemUser['role'])}
                  {role}
                  <Badge className={getRoleColor(role as SystemUser['role'])} variant="secondary">
                    {filteredUsers.filter(u => u.role === role).length} users
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {permissions.map((permission, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0"></div>
                      {permission}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Users Table */}
      <FormCard title="System Users" description="Manage user accounts and access permissions">
        <DataTable
          data={filteredUsers}
          columns={columns}
          searchPlaceholder="Search users..."
          loading={loading}
        />
      </FormCard>

      {/* Temp Password Modal */}
      {resetPasswordUser && (
        <TempPasswordModal
          isOpen={showTempPasswordModal}
          onClose={() => {
            setShowTempPasswordModal(false)
            setResetPasswordUser(null)
          }}
          tempPassword={resetPasswordUser.tempPassword}
          username={resetPasswordUser.username}
        />
      )}
    </div>
  )
}
