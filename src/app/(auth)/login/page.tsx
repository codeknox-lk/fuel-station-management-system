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
          station_id?: string
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
      if (data.user.station_id) {
        localStorage.setItem('stationId', data.user.station_id)
      }

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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gray-50">
      {/* Floating Rounded Container */}
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl bg-white min-h-[600px]">

        {/* Left: Form */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-12 order-2 lg:order-1 relative">
          <div className="w-full max-w-sm mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <Image
                src="/images/fuelsync-logo-full.png"
                alt="FuelSync Logo"
                width={300}
                height={100}
                className="h-24 w-auto object-contain"
                priority
              />
            </div>

            {/* Welcome Text */}
            <div className="mb-10">
              <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Hello,<br />Welcome back.
              </h1>
              <p className="text-gray-500 text-base">
                Let&apos;s manage your station&apos;s success.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                />

                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 rounded-md"
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer font-medium">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordInfo(true)}
                  className="text-sm text-gray-500 hover:text-orange-600 transition-colors font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-[#FF4500] hover:bg-[#E03E00] text-white rounded-full text-lg font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98] mt-4"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            {/* Footer */}
            <p className="mt-8 text-sm text-gray-400 text-center">
              Need an account?{' '}
              <button
                type="button"
                onClick={() => setShowSignUpInfo(true)}
                className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                Contact Administrator
              </button>
            </p>
          </div>
        </div>

        {/* Right: Illustration */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-white p-0 order-1 lg:order-2 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50/50 via-transparent to-transparent opacity-60"></div>

          <div className="relative w-full h-full max-h-[600px] flex items-center justify-center">
            <Image
              src="/images/login-illustration-final.png"
              alt="FuelSync Dashboard"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* Forgot Password Info Modal */}
      {showForgotPasswordInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-auto transform transition-all scale-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Forgot Password?</h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              For security reasons, passwords cannot be reset online. Please follow these steps to recover access:
            </p>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-8">
              <ol className="text-sm text-gray-700 space-y-3 list-decimal list-inside font-medium">
                <li>Contact your station <span className="text-orange-700 font-bold">Owner</span> or <span className="text-orange-700 font-bold">Administrator</span></li>
                <li>Request a temporary password reset</li>
                <li>Log in using the temporary credentials</li>
                <li>Create a new secure password immediately</li>
              </ol>
            </div>
            <button
              onClick={() => setShowForgotPasswordInfo(false)}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sign Up Info Modal */}
      {showSignUpInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-auto transform transition-all scale-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Access?</h3>
            <p className="text-gray-500 mb-6 leading-relaxed">
              FuelSync is an invite-only internal system. Accounts are managed centrally to ensure security.
            </p>
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-8">
              <p className="text-sm font-semibold text-gray-900 mb-2">How to get an account:</p>
              <ul className="text-sm text-gray-700 space-y-3 list-disc list-inside">
                <li>Reach out to your station manager</li>
                <li>Provide your employee details</li>
                <li>Wait for your account credentials via email/SMS</li>
              </ul>
            </div>
            <button
              onClick={() => setShowSignUpInfo(false)}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-semibold transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
