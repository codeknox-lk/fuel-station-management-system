'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface IdleWarningModalProps {
    isOpen: boolean
    onStayLoggedIn: () => void
    onLogout: () => void
    warningTime?: number // milliseconds
}

export function IdleWarningModal({
    isOpen,
    onStayLoggedIn,
    onLogout,
    warningTime = 30000,
}: IdleWarningModalProps) {
    const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(warningTime / 1000))

    useEffect(() => {
        if (!isOpen) {
            setSecondsRemaining(Math.floor(warningTime / 1000))
            return
        }

        const interval = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isOpen, warningTime])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
                    Still There?
                </h2>

                {/* Message */}
                <p className="text-gray-600 text-center mb-6">
                    You will be logged out in <span className="font-bold text-orange-600">{secondsRemaining} seconds</span> due to inactivity.
                </p>

                {/* Countdown Bar */}
                <Progress
                    value={(secondsRemaining / (warningTime / 1000)) * 100}
                    className="w-full h-2 mb-6"
                    indicatorClassName="bg-orange-600 transition-all duration-1000 ease-linear"
                />

                {/* Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={onLogout}
                        variant="outline"
                        className="flex-1 h-11 border-gray-300 hover:bg-gray-50"
                    >
                        Logout Now
                    </Button>
                    <Button
                        onClick={onStayLoggedIn}
                        className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        Stay Logged In
                    </Button>
                </div>
            </div>
        </div>
    )
}
