'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, X } from 'lucide-react'

interface TempPasswordModalProps {
    isOpen: boolean
    onClose: () => void
    tempPassword: string
    username: string
}

export function TempPasswordModal({
    isOpen,
    onClose,
    tempPassword,
    username,
}: TempPasswordModalProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(tempPassword)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Password Reset Successful
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            For user: <span className="font-medium text-gray-700">{username}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Temporary Password Display */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
                    <label className="text-sm font-medium text-orange-900 block mb-2">
                        Temporary Password
                    </label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white px-4 py-3 rounded border border-orange-300 font-mono text-lg font-bold text-orange-600">
                            {tempPassword}
                        </code>
                        <Button
                            onClick={handleCopy}
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 border-orange-300 hover:bg-orange-100"
                        >
                            {copied ? (
                                <Check className="h-5 w-5 text-green-600" />
                            ) : (
                                <Copy className="h-5 w-5 text-orange-600" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                        <strong>Important:</strong> This password will only be shown once. Make sure to share it securely with the user. They will be required to change it on their next login.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={onClose}
                        className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    )
}
