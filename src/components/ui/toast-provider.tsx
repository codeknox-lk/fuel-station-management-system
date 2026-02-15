'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

// Define types locally to avoid circular dependencies if we were to import from elsewhere
export type ToastVariant = 'default' | 'destructive' | 'success'

export interface Toast {
    id: string
    title: string
    description?: string
    variant?: ToastVariant
}

export interface ToastContextType {
    toasts: Toast[]
    toast: (props: Omit<Toast, 'id'>) => void
    dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Internal Toaster Component
function Toaster() {
    const context = useContext(ToastContext)
    if (!context) return null
    const { toasts, dismiss } = context

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`
            pointer-events-auto
            relative flex w-full items-start gap-4 overflow-hidden rounded-md border bg-background p-4 shadow-md transition-all animate-in slide-in-from-top-full fade-in duration-300
            ${t.variant === 'destructive' ? 'border-t-4 border-t-red-500' : ''}
            ${t.variant === 'success' ? 'border-t-4 border-t-green-500' : ''}
            ${t.variant === 'default' ? 'border-t-4 border-t-orange-500' : ''}
          `}
                >
                    {t.variant === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
                    {t.variant === 'destructive' && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                    {t.variant === 'default' && <Info className="h-5 w-5 text-orange-500 mt-0.5" />}

                    <div className="flex-1">
                        <h3 className="font-medium text-sm text-foreground">{t.title}</h3>
                        {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    </div>

                    <button
                        onClick={() => dismiss(t.id)}
                        title="Dismiss notification"
                        className="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity hover:bg-muted"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback(({ title, description, variant }: Omit<Toast, 'id'>) => {
        // Auto-detect variant based on title if not specified
        let finalVariant = variant || 'default'
        if (finalVariant === 'default') {
            if (title.toLowerCase() === 'success') finalVariant = 'success'
            if (title.toLowerCase() === 'error') finalVariant = 'destructive'
        }

        const id = Math.random().toString(36).substr(2, 9)
        setToasts((prev) => [...prev, { id, title, description, variant: finalVariant }])

        // Auto dismiss
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
    }, [])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss }}>
            {children}
            <Toaster />
        </ToastContext.Provider>
    )
}
