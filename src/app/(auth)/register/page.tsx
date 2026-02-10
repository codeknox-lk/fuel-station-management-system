'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        companyName: '',
        username: '',
        email: '',
        password: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Registration failed')
                return
            }

            // Success - Redirect to login
            router.push('/login?registered=true')
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
                                Get Started,<br />Create Account.
                            </h1>
                            <p className="text-gray-500 text-base">
                                Join the network of smart fuel stations.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                name="companyName"
                                placeholder="Station / Company Name"
                                value={formData.companyName}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                            />

                            <Input
                                name="username"
                                placeholder="Username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                            />

                            <Input
                                name="email"
                                type="email"
                                placeholder="Email Address"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                            />

                            <Input
                                name="password"
                                type="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                                className="h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all duration-200 text-gray-900"
                            />

                            <Button
                                type="submit"
                                className="w-full h-14 bg-[#FF4500] hover:bg-[#E03E00] text-white rounded-full text-lg font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98] mt-6"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Create Organization'}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link href="/login" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                                Back to Login
                            </Link>
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
                            alt="FuelSync Registration"
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
