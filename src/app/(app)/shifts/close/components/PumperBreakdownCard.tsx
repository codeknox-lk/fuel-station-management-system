'use client'

import { Fuel, ShoppingBag, DollarSign, CreditCard, ChevronDown, ChevronUp, Plus, Check, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { PumperBreakdown, POSSlipEntry } from '../types'

interface PumperBreakdownCardProps {
    breakdown: PumperBreakdown
    posSlips: POSSlipEntry[]
    posVerificationOpen: boolean
    minimizedPOSSlips: Record<string, boolean>
    duplicateCardErrors: Record<string, { cardNumber: string; duplicateSlip: POSSlipEntry }>
    // Handlers
    onUpdateCash: (value: number) => void
    onTogglePOS: () => void
    onAddPOSSlip: () => void
    onRemovePOSSlip: (id: string) => void
    onUpdatePOSSlip: <K extends keyof POSSlipEntry>(id: string, field: K, value: POSSlipEntry[K]) => void
    onMinimizePOSSlip: (id: string) => void
    onExpandPOSSlip: (id: string) => void
    isPOSSlipComplete: (slip: POSSlipEntry) => boolean
}

export function PumperBreakdownCard({
    breakdown,
    posSlips,
    posVerificationOpen,
    minimizedPOSSlips,
    duplicateCardErrors,
    onUpdateCash,
    onTogglePOS,
    onAddPOSSlip,
    onRemovePOSSlip,
    onUpdatePOSSlip,
    onMinimizePOSSlip,
    onExpandPOSSlip,
    isPOSSlipComplete
}: PumperBreakdownCardProps) {
    return (
        <div
            className={`border rounded-lg p-4 transition-all ${breakdown.varianceStatus === 'ADD_TO_SALARY'
                ? 'border-green-500/30 bg-green-500/5'
                : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-border bg-card'
                }`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                    <h4 className="font-semibold text-lg text-foreground">{breakdown.pumperName}</h4>
                    <p className="text-sm text-muted-foreground">
                        {breakdown.assignments.length} assignment{breakdown.assignments.length > 1 ? 's' : ''}
                    </p>
                </div>
                <Badge
                    variant={
                        breakdown.varianceStatus === 'ADD_TO_SALARY'
                            ? 'default'
                            : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                                ? 'destructive'
                                : 'outline'
                    }
                    className={
                        breakdown.varianceStatus === 'ADD_TO_SALARY'
                            ? 'bg-green-600 dark:bg-green-500 text-white'
                            : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                                ? 'bg-red-600 dark:bg-red-500 text-white'
                                : ''
                    }
                >
                    {breakdown.varianceStatus === 'ADD_TO_SALARY'
                        ? 'Add to Salary'
                        : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                            ? 'Deduct from Salary'
                            : 'Normal'}
                </Badge>
            </div>

            <div className="space-y-4">
                {/* Calculated Sales Breakdown */}
                <div className="bg-muted/30 dark:bg-muted/10 p-4 rounded-lg border space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Calculated Sales:
                    </Label>

                    {breakdown.meterSales > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <span className="text-muted-foreground">Meter Sales:</span>
                            </div>
                            <span className="font-mono font-medium text-foreground">
                                Rs. {breakdown.meterSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {breakdown.shopSales > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-muted-foreground">Shop Sales:</span>
                            </div>
                            <span className="font-mono font-medium text-foreground">
                                Rs. {breakdown.shopSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {(breakdown.meterSales > 0 && breakdown.shopSales > 0) && <div className="border-t border-dashed my-2" />}

                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-foreground">Total Calculated:</span>
                        <span className="font-mono font-bold text-lg text-orange-600 dark:text-orange-400">
                            Rs. {breakdown.calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Declared Amount Input */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                            Cash Amount Declared
                        </Label>
                        <MoneyInput
                            value={breakdown.declaredCash}
                            onChange={onUpdateCash}
                            placeholder="0.00"
                            className="w-full text-lg h-12"
                        />
                    </div>

                    {/* POS Terminal Section */}
                    <div className="space-y-4 pt-4 border-t border-border mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                POS Verification
                            </Label>
                            <Button
                                type="button"
                                variant={posVerificationOpen ? "default" : "outline"}
                                size="sm"
                                onClick={onTogglePOS}
                            >
                                {posVerificationOpen ? 'Hide' : 'Verify Slips'}
                            </Button>
                        </div>

                        {posVerificationOpen && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-end">
                                    <Button type="button" variant="outline" size="sm" onClick={onAddPOSSlip}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Slip
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {posSlips.length === 0 ? (
                                        <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
                                            No slips added.
                                        </div>
                                    ) : (
                                        posSlips.map(slip => {
                                            const isMinimized = minimizedPOSSlips[slip.id]
                                            const hasError = !!duplicateCardErrors[slip.id]

                                            return (
                                                <div
                                                    key={slip.id}
                                                    className={`border rounded-lg p-3 transition-colors ${hasError ? 'border-red-500 bg-red-500/5' : 'border-border bg-muted/20'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {isMinimized ? (
                                                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onExpandPOSSlip(slip.id)}>
                                                                    <ChevronDown className="h-4 w-4" />
                                                                    <span className="text-sm font-medium">Slip {slip.lastFourDigits || '####'}</span>
                                                                    <span className="text-sm font-mono text-blue-600">Rs. {slip.amount.toLocaleString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm font-semibold">POS Slip Details</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {!isMinimized && isPOSSlipComplete(slip) && (
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => onMinimizePOSSlip(slip.id)}>
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {isMinimized && (
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onExpandPOSSlip(slip.id)}>
                                                                    <ChevronUp className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRemovePOSSlip(slip.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {!isMinimized && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                                            <div className="col-span-full">
                                                                <MoneyInput
                                                                    value={slip.amount}
                                                                    onChange={(v) => onUpdatePOSSlip(slip.id, 'amount', v)}
                                                                    placeholder="Amount"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
