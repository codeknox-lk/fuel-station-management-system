'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Unhandled runtime error:', error)
    }, [error])

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <div className="flex flex-col items-center space-y-4 rounded-xl border border-red-100 bg-white p-8 shadow-xl md:min-w-[400px]">
                <div className="rounded-full bg-red-100 p-3">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>

                <p className="max-w-md text-gray-500">
                    We encountered an unexpected error. The system has logged this issue for investigation.
                </p>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 w-full rounded-md bg-gray-100 p-4 text-left font-mono text-xs text-red-800 overflow-auto max-h-48">
                        <p className="font-bold border-b border-gray-300 pb-2 mb-2">{error.message}</p>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                )}

                <div className="mt-6 flex gap-4">
                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                    >
                        Go Home
                    </Button>
                    <Button onClick={() => reset()}>
                        Try Again
                    </Button>
                </div>

                <div className="mt-4 text-xs text-gray-400">
                    Digest: {error.digest || 'N/A'}
                </div>
            </div>
        </div>
    )
}
