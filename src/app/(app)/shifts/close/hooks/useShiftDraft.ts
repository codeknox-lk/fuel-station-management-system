'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to persist shift closure progress to local storage
 */
export function useShiftDraft<T>(key: string, initialState: T) {
    const [state, setState] = useState<T>(initialState)
    const [isInitialized, setIsInitialized] = useState(false)

    // Load draft on mount
    useEffect(() => {
        const saved = localStorage.getItem(`shift_draft_${key}`)
        if (saved) {
            try {
                setState(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse shift draft:', e)
            }
        }
        setIsInitialized(true)
    }, [key])

    // Save draft on change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(`shift_draft_${key}`, JSON.stringify(state))
        }
    }, [state, key, isInitialized])

    const clearDraft = () => {
        localStorage.removeItem(`shift_draft_${key}`)
        setState(initialState)
    }

    return [state, setState, clearDraft] as const
}
