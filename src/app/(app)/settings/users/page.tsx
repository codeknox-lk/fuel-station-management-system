'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, Edit, Trash2, Mail, Shield, User, Crown, UserCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SystemUser {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  status: 'active' | 'inactive' | 'suspended'
  lastLogin: string
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'MANAGER' as SystemUser['role'],
    status: 'active' as SystemUser['status']
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save user')

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
        description: `Failed to ${editingUser ? 'update' : 'create'} user`,
        variant: "destructive"
      })
    }
  }

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
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
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      role: 'MANAGER',
      status: 'active'
    })
  }

  const getStatusColor = (status: SystemUser['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: SystemUser['role']) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-100 text-purple-800'
      case 'MANAGER': return 'bg-blue-100 text-blue-800'
      case 'ACCOUNTS': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: SystemUser['role']) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-3 w-3" />
      case 'MANAGER': return <Shield className="h-3 w-3" />
      case 'ACCOUNTS': return <UserCheck className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString)
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
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">{value as string}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.email}
            </div>
          </div>
        </div>
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
        if (!status) return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
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
        <span className="text-sm text-gray-600">
          {formatLastLogin(value as string)}
        </span>
      )
    },
    {
      key: 'createdAt' as keyof SystemUser,
      title: 'Created',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
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
      value: users.length.toString(),
      description: 'System users',
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    {
      title: 'Active',
      value: users.filter(u => u.status === 'active').length.toString(),
      description: 'Currently active',
      icon: <div className="h-5 w-5 bg-green-500 rounded-full" />
    },
    {
      title: 'Owners',
      value: users.filter(u => u.role === 'OWNER').length.toString(),
      description: 'System owners',
      icon: <Crown className="h-5 w-5 text-purple-500" />
    },
    {
      title: 'Managers',
      value: users.filter(u => u.role === 'MANAGER').length.toString(),
      description: 'Station managers',
      icon: <Shield className="h-5 w-5 text-blue-500" />
    }
  ]

  const rolePermissions = {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage system users, roles, and access permissions
          </p>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemUser['role'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="ACCOUNTS">Accounts</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
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

              {/* Role Permissions Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  {getRoleIcon(formData.role)}
                  {formData.role} Permissions
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {rolePermissions[formData.role].map((permission, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
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
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.title}</div>
                  <div className="text-xs text-gray-500">{stat.description}</div>
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
        {Object.entries(rolePermissions).map(([role, permissions]) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {getRoleIcon(role as SystemUser['role'])}
                {role}
                <Badge className={getRoleColor(role as SystemUser['role'])} variant="secondary">
                  {users.filter(u => u.role === role).length} users
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {permissions.map((permission, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
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
          data={users}
          columns={columns}
          searchPlaceholder="Search users..."
        />
      </FormCard>
    </div>
  )
}
