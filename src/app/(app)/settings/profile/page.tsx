'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Lock, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  station_id?: string
  is_active: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile update form
  const [profileForm, setProfileForm] = useState({
    username: ''
  })

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')

      // Get user data from localStorage first (fallback)
      const userId = localStorage.getItem('userId')
      const username = localStorage.getItem('username')
      const userRole = localStorage.getItem('userRole')
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setError('Not logged in. Redirecting to login...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 1500)
        setLoading(false)
        return
      }

      // Try to fetch from API
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setProfileForm({
          username: data.username
        })
      } else {
        // If API fails but we have localStorage data, use that as fallback
        if (userId && username && userRole) {
          console.warn('Using localStorage fallback for profile data')
          const fallbackProfile = {
            id: userId,
            username: username,
            email: '',
            role: userRole,
            station_id: localStorage.getItem('stationId') || undefined,
            is_active: true
          }
          setProfile(fallbackProfile)
          setProfileForm({
            username: username
          })
          setError('Could not verify session with server, using cached profile data')
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Profile fetch error:', response.status, errorData)
          setError(errorData.detail || errorData.error || `Failed to load profile (${response.status})`)
        }
      }
    } catch (error) {
      console.error('Profile fetch exception:', error)

      // Use localStorage fallback on network error
      const userId = localStorage.getItem('userId')
      const username = localStorage.getItem('username')
      const userRole = localStorage.getItem('userRole')

      if (userId && username && userRole) {
        const fallbackProfile = {
          id: userId,
          username: username,
          email: '',
          role: userRole,
          station_id: localStorage.getItem('stationId') || undefined,
          is_active: true
        }
        setProfile(fallbackProfile)
        setProfileForm({
          username: username
        })
        setError('Could not connect to server, using cached profile data')
      } else {
        setError('Unable to load profile. Please try logging in again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setError('No authentication token found. Please log in again.')
        setUpdating(false)
        return
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setSuccess('Profile updated successfully')
        // Update localStorage with new username
        localStorage.setItem('username', data.username)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to update profile')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match')
      setUpdating(false)
      return
    }

    if (passwordForm.new_password.length < 6) {
      setError('New password must be at least 6 characters')
      setUpdating(false)
      return
    }

    try {
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setError('No authentication token found. Please log in again.')
        setUpdating(false)
        return
      }

      const response = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      })

      if (response.ok) {
        setSuccess('Password updated successfully. Please log in again with your new password.')
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
        // Clear the current session since password changed
        localStorage.removeItem('accessToken')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to change password')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setUpdating(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'MANAGER': return 'bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300'
      case 'ACCOUNTS': return 'bg-green-500/20 text-green-400 dark:bg-green-600/30 dark:text-green-300'
      default: return 'bg-muted text-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
            Manage your account information and security settings.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your current account details and role information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <p className="text-lg font-semibold">{profile.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <div className="mt-1">
                    <Badge className={getRoleColor(profile.role)}>
                      {profile.role}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile Settings
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Update Profile
              </CardTitle>
              <CardDescription>
                Update your username
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-4 border-green-500/20 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/20">
                  <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    placeholder="Enter your username"
                    disabled={updating}
                    required
                  />
                </div>


                <Button type="submit" disabled={updating} className="w-full">
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password for better security
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="mb-4 border-green-500/20 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/20">
                  <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="Enter your current password"
                    disabled={updating}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Enter your new password"
                    disabled={updating}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    placeholder="Confirm your new password"
                    disabled={updating}
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={updating} className="w-full">
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
