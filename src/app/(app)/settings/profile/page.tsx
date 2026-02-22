'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  User,
  Lock,
  ArrowLeft,
  Mail,
  ShieldCheck,
  Settings
} from 'lucide-react'
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
      case 'DEVELOPER': return 'bg-red-500/20 text-red-600 dark:bg-red-600/30 dark:text-red-300'
      case 'OWNER': return 'bg-purple-500/20 text-purple-600 dark:bg-purple-600/30 dark:text-purple-300'
      case 'MANAGER': return 'bg-orange-500/20 text-orange-600 dark:bg-orange-600/30 dark:text-orange-300'
      case 'ACCOUNTS': return 'bg-green-500/20 text-green-600 dark:bg-green-600/30 dark:text-green-300'
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal account details and security preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Settings - Left Columns */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border rounded-xl gap-1">
              <TabsTrigger
                value="profile"
                className="flex-1 md:flex-none flex items-center gap-2 px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border transition-all"
              >
                <User className="h-4 w-4" />
                Personal Details
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="flex-1 md:flex-none flex items-center gap-2 px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border transition-all"
              >
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Notifications & Status */}
            {(error || success) && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                {error && (
                  <Alert variant="destructive" className="border-rose-500/20 bg-rose-500/5 shadow-sm">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
                    <AlertDescription className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Profile Settings Tab */}
            <TabsContent value="profile" className="focus-visible:outline-none">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Update Profile</CardTitle>
                      <CardDescription>Adjust your public display name</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-xs font-bold uppercase text-muted-foreground tracking-tight ml-1">
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        placeholder="Enter your username"
                        disabled={updating}
                        className="h-11 border-muted-foreground/20 focus:border-primary transition-all rounded-lg"
                        required
                      />
                    </div>

                    <Button type="submit" disabled={updating || !profileForm.username} className="w-full md:w-auto px-8 h-10 rounded-lg font-semibold shadow-sm">
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Change Password Tab */}
            <TabsContent value="password" className="focus-visible:outline-none">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                      <Lock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle>Security Credentials</CardTitle>
                      <CardDescription>Update your password to stay secure</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="current_password" className="text-xs font-bold uppercase text-muted-foreground tracking-tight ml-1">
                          Current Password
                        </Label>
                        <Input
                          id="current_password"
                          type="password"
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          placeholder="••••••••"
                          disabled={updating}
                          className="h-11 border-muted-foreground/20 focus:border-primary transition-all rounded-lg"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_password" className="text-xs font-bold uppercase text-muted-foreground tracking-tight ml-1">
                          New Password
                        </Label>
                        <Input
                          id="new_password"
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          placeholder="Min. 6 characters"
                          disabled={updating}
                          className="h-11 border-muted-foreground/20 focus:border-primary transition-all rounded-lg"
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm_password" className="text-xs font-bold uppercase text-muted-foreground tracking-tight ml-1">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                          placeholder="Re-type new password"
                          disabled={updating}
                          className="h-11 border-muted-foreground/20 focus:border-primary transition-all rounded-lg"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={updating || !passwordForm.new_password} className="w-full md:w-auto px-8 h-10 rounded-lg font-semibold shadow-sm">
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Account Summary - Right Column */}
        <aside className="space-y-6">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 px-6">
              <div className="flex flex-col items-center">
                <div className="p-1 rounded-full bg-background border shadow-sm">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <User className="h-10 w-10" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h2 className="text-lg font-bold text-foreground">{profile?.username}</h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleColor(profile?.role || '')}`}>
                      {profile?.role}
                    </Badge>
                    <Badge
                      variant={profile?.is_active ? "default" : "secondary"}
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${profile?.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}`}
                    >
                      {profile?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4 pt-6 border-t font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight leading-none mb-1">Email</p>
                    <p className="font-medium truncate">{profile?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <ShieldCheck className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight leading-none mb-1">Security</p>
                    <p className="font-medium">Password protected</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20">
                    <Settings className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1 text-[10px]">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight leading-none mb-1">User ID</p>
                    <code className="text-muted-foreground break-all block leading-tight">{profile?.id}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </aside>
      </div>
    </div>
  )
}
