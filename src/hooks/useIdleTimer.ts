'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseIdleTimerOptions {
    onIdle: () => void
    onWarning?: () => void
    idleTime?: number // milliseconds
    warningTime?: number // milliseconds
}

export function useIdleTimer({
    onIdle,
    onWarning,
    idleTime = 15 * 60 * 1000, // 15 minutes
    warningTime = 30 * 1000, // 30 seconds
}: UseIdleTimerOptions) {
    const [isIdle, setIsIdle] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    const clearTimers = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current)
            idleTimerRef.current = null
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current)
            warningTimerRef.current = null
        }
    }, [])

    const resetTimer = useCallback(() => {
        clearTimers()
        setIsIdle(false)
        setShowWarning(false)
        lastActivityRef.current = Date.now()

        // Set warning timer
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true)
            if (onWarning) {
                onWarning()
            }

            // Set idle timer after warning
            idleTimerRef.current = setTimeout(() => {
                setIsIdle(true)
                onIdle()
            }, warningTime)
        }, idleTime - warningTime)
    }, [clearTimers, onIdle, onWarning, idleTime, warningTime])

    const handleActivity = useCallback(() => {
        // Throttle activity detection to once per second
        const now = Date.now()
        if (now - lastActivityRef.current > 1000) {
            resetTimer()
        }
    }, [resetTimer])

    useEffect(() => {
        // Events to monitor for user activity
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true })
        })

        // Start the timer
        resetTimer()

        // Cleanup
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
            clearTimers()
        }
    }, [handleActivity, resetTimer, clearTimers])

    return {
        isIdle,
        showWarning,
        resetTimer,
    }
}
