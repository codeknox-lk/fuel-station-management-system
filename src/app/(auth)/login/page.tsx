'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false)
  const [showSignUpInfo, setShowSignUpInfo] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      })

      interface LoginResponse {
        access_token: string
        user: {
          id: string
          username: string
          role: string
        }
        requireChangePassword?: boolean
        detail?: string
      }
      const data = await res.json() as LoginResponse

      if (!res.ok) {
        setError(data.detail || 'Invalid credentials')
        return
      }

      localStorage.setItem('accessToken', data.access_token)
      localStorage.setItem('userRole', data.user.role)
      localStorage.setItem('userId', data.user.id)
      localStorage.setItem('username', data.user.username)

      // Check if user needs to change password
      if (data.requireChangePassword) {
        router.push('/force-change-password')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Unable to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-100">
      {/* Floating Rounded Container */}
      <div className="w-full max-w-6xl grid lg:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white">

        {/* Left: Form */}
        <div className="flex flex-col justify-center px-8 lg:px-16 xl:px-20 py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <Image
                src="/images/logo-icon.png"
                alt="FuelSync Logo"
                width={64}
                height={64}
                className="w-16 h-16 drop-shadow-md"
              />
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Hello,<br />Welcome Back
              </h1>
              <p className="text-gray-500">
                Hey, welcome back to your dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordInfo(true)}
                  className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-full"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-sm text-gray-500 text-center">
              Need an account?{' '}
              <button
                type="button"
                onClick={() => setShowSignUpInfo(true)}
                className="text-orange-600 font-medium hover:underline cursor-pointer"
              >
                Contact Administrator
              </button>
            </p>
          </div>
        </div>

        <div className="hidden lg:block p-4">
          <div className="h-full w-full rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-red-700 relative overflow-hidden">
            {/* Cloud decorations */}
            <div className="absolute top-10 left-10 w-32 h-16 bg-white/20 rounded-full blur-xl" />
            <div className="absolute bottom-20 right-20 w-40 h-20 bg-white/20 rounded-full blur-xl" />
            <div className="absolute top-1/4 right-1/4 w-24 h-12 bg-white/10 rounded-full blur-lg" />

            {/* Illustration */}
            <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
              <Image
                src="/images/login-illustration-red.png"
                alt="Security Illustration"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Info Modal */}
      {showForgotPasswordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Forgot Your Password?</h3>
            <p className="text-gray-600 mb-6">
              For security reasons, passwords cannot be reset online. Please contact your system administrator to reset your password.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-900">
                <strong>What to do:</strong>
              </p>
              <ol className="text-sm text-orange-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Contact your OWNER or DEVELOPER administrator</li>
                <li>They will generate a temporary password for you</li>
                <li>Log in with the temporary password</li>
                <li>You&apos;ll be prompted to create a new secure password</li>
              </ol>
            </div>
            <button
              onClick={() => setShowForgotPasswordInfo(false)}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Sign Up Info Modal */}
      {showSignUpInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need an Account?</h3>
            <p className="text-gray-600 mb-6">
              FuelSync is an internal management system. User accounts are created and managed by system administrators only.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-orange-900">
                <strong>How to get access:</strong>
              </p>
              <ol className="text-sm text-orange-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Contact your station OWNER or DEVELOPER</li>
                <li>Request a user account for your role</li>
                <li>They will create your account and provide credentials</li>
                <li>You&apos;ll set your own password on first login</li>
              </ol>
            </div>
            <button
              onClick={() => setShowSignUpInfo(false)}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}