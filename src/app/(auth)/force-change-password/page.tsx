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
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gray-50">
            {/* Floating Rounded Container */}
            <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl bg-white min-h-[600px]">

                {/* Left: Form */}
                <div className="flex flex-col justify-center px-8 lg:px-16 py-12 order-2 lg:order-1 relative">
                    <div className="w-full max-w-sm mx-auto">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <Image
                                src="/images/fuelsync-logo-full.png"
                                alt="FuelSync Logo"
                                width={300}
                                height={100}
                                className="h-24 w-auto object-contain"
                                priority
                            />
                        </div>

                        {/* Heading */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                                Change Password
                            </h1>
                            <p className="text-gray-500 text-base">
                                For security, please secure your account.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
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
                                    className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                                    className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                                    className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            {newPassword && (
                                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Requirements:</p>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                        <PasswordRule met={rules.minLength} text="8+ characters" />
                                        <PasswordRule met={rules.hasUppercase} text="Uppercase" />
                                        <PasswordRule met={rules.hasLowercase} text="Lowercase" />
                                        <PasswordRule met={rules.hasNumber} text="Number" />
                                        <PasswordRule met={rules.hasSpecial} text="Special char" />
                                        {confirmPassword && (
                                            <PasswordRule met={rules.passwordsMatch} text="Passwords match" />
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 bg-[#FF4500] hover:bg-[#E03E00] text-white rounded-full text-lg font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98] mt-4"
                                disabled={isLoading || !allRulesMet}
                            >
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Update Password'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Right: Illustration */}
                <div className="hidden lg:flex flex-col justify-center items-center bg-white p-0 order-1 lg:order-2 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50/50 via-transparent to-transparent opacity-60"></div>

                    <div className="relative w-full h-full max-h-[600px] flex items-center justify-center">
                        <Image
                            src="/images/password-change-illustration.png"
                            alt="Security Illustration"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function PasswordRule({ met, text }: { met: boolean; text: string }) {
    return (
        <div className="flex items-center gap-2 transition-colors duration-200">
            <div className={`flex items-center justify-center w-4 h-4 rounded-full ${met ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </div>
            <span className={`text-xs font-medium ${met ? 'text-gray-900' : 'text-gray-500'}`}>
                {text}
            </span>
        </div>
    )
}
