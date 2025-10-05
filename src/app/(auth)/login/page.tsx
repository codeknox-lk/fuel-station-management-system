'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface LoginData {
  username: string
  password: string
}

interface User {
  id: string
  username: string
  email: string
  role: string
  station_id?: string
  is_active: boolean
}

interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export default function LoginPage() {
  const [loginData, setLoginData] = useState<LoginData>({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleInputChange = (field: keyof LoginData, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }))
    setError('') // Clear error when user types
  }

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      })

      if (response.ok) {
        const data: LoginResponse = await response.json()
        
        // Store token and user data
        localStorage.setItem('accessToken', data.access_token)
        localStorage.setItem('userRole', data.user.role)
        localStorage.setItem('userId', data.user.id)
        localStorage.setItem('username', data.user.username)
        
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Login failed')
      }
    } catch (error) {
      setError('Unable to connect to server. Please check if the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-purple-700">
          Petrol Shed Management
        </CardTitle>
        <CardDescription>
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={loginData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={loginData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={loading}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </div>

        <Button 
          onClick={handleLogin} 
          disabled={loading || !loginData.username || !loginData.password}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </Button>

        <div className="text-center text-xs text-gray-500">
          <div className="mb-2">Test Credentials:</div>
          <div className="space-y-1">
            <div><strong>Owner:</strong> admin / FuelStation2024!Admin</div>
            <div><strong>Manager:</strong> manager1 / ManagerSecure2024!</div>
            <div><strong>Accounts:</strong> accounts1 / AccountsSafe2024!</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}