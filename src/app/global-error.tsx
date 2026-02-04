'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global unhandled error:', error)
    }, [error])

    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
                    <div className="flex flex-col items-center space-y-4 rounded-xl border border-red-100 bg-white p-8 shadow-xl md:min-w-[400px]">
                        <div className="rounded-full bg-red-100 p-3">
                            <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Critical System Error</h2>
                        <p className="text-gray-500">The application encountered a critical error and cannot render.</p>
                        <Button onClick={() => reset()}>Reload Application</Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
