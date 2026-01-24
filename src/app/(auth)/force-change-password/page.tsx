'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react'
import Image from 'next/image'

export default function ForceChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    // Password validation rules
    const rules = {
        minLength: newPassword.length >= 8,
        hasUppercase: /[A-Z]/.test(newPassword),
        hasLowercase: /[a-z]/.test(newPassword),
        hasNumber: /[0-9]/.test(newPassword),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
        passwordsMatch: newPassword === confirmPassword && newPassword.length > 0,
    }

    const allRulesMet = Object.values(rules).every(Boolean)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        if (!allRulesMet) {
            setError('Please meet all password requirements')
            setIsLoading(false)
            return
        }

        try {
            const token = localStorage.getItem('accessToken')
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.detail || 'Failed to change password')
                return
            }

            // Redirect to dashboard after successful password change
            router.push('/dashboard')
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
                                Change Your Password
                            </h1>
                            <p className="text-gray-500">
                                For security, please create a new password
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
                            {/* Current Password */}
                            <div className="relative">
                                <Input
                                    type={showCurrent ? 'text' : 'password'}
                                    placeholder="Current Password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* New Password */}
                            <div className="relative">
                                <Input
                                    type={showNew ? 'text' : 'password'}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <Input
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            {newPassword && (
                                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Password must contain:</p>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                        <PasswordRule met={rules.minLength} text="8+ characters" />
                                        <PasswordRule met={rules.hasUppercase} text="Uppercase" />
                                        <PasswordRule met={rules.hasLowercase} text="Lowercase" />
                                        <PasswordRule met={rules.hasNumber} text="Number" />
                                        <PasswordRule met={rules.hasSpecial} text="Special char" />
                                        {confirmPassword && (
                                            <PasswordRule met={rules.passwordsMatch} text="Match" />
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-full"
                                disabled={isLoading || !allRulesMet}
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Change Password'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right: Illustration */}
                <div className="hidden lg:block p-4">
                    <div className="h-full w-full rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-red-700 relative overflow-hidden">
                        {/* Cloud decorations */}
                        <div className="absolute top-10 left-10 w-32 h-16 bg-white/20 rounded-full blur-xl" />
                        <div className="absolute bottom-20 right-20 w-40 h-20 bg-white/20 rounded-full blur-xl" />
                        <div className="absolute top-1/4 right-1/4 w-24 h-12 bg-white/10 rounded-full blur-lg" />

                        {/* Illustration */}
                        <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
                            <div className="text-white text-center">
                                <div className="text-6xl mb-4">🔒</div>
                                <h3 className="text-2xl font-bold">Secure Your Account</h3>
                                <p className="text-white/80 mt-2">Create a strong password</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
    return (
        <div className="flex items-center gap-1.5">
            {met ? (
                <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
                <X className="h-3 w-3 text-gray-400 flex-shrink-0" />
            )}
            <span className={`text-xs ${met ? 'text-green-600' : 'text-gray-600'}`}>
                {text}
            </span>
        </div>
    )
}
