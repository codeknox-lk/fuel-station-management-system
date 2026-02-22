'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Wallet, Banknote, AlertTriangle } from 'lucide-react'
import { DeliveryData } from './types'
import { format } from 'date-fns'

interface Bank {
    id: string
    name: string
    accountNumber?: string
}

interface Props {
    data: DeliveryData
    onUpdate: (data: Partial<DeliveryData>) => void
    onSubmit: () => void
    onBack: () => void
    loading?: boolean
}

export default function Stage4_Payment({ data, onUpdate, onSubmit, loading }: Props) {
    const [banks, setBanks] = useState<Bank[]>([])
    const [error, setError] = useState('')
    const [formValid, setFormValid] = useState(false)

    const paymentType = data.paymentType || 'CASH'

    const [safeBalance, setSafeBalance] = useState<number | null>(null)

    // Initialize payment type to CASH if not set
    useEffect(() => {
        if (!data.paymentType) {
            console.log('Initializing paymentType to CASH')
            onUpdate({ paymentType: 'CASH' })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run once on mount

    // Load banks and safe balance
    useEffect(() => {
        // Fetch banks
        fetch('/api/banks')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setBanks(data)
                }
            })
            .catch(err => console.error('Failed to load banks:', err))

        // Fetch Safe Balance (only if stationId is available)
        if (data.stationId) {
            console.log('Fetching safe balance for stationId:', data.stationId)
            // Use /api/safe which returns the live currentBalance from Safe table
            fetch(`/api/safe?stationId=${data.stationId}`)
                .then(res => res.json())
                .then(responseData => {
                    console.log('Safe response:', responseData)
                    // The /api/safe endpoint returns currentBalance directly
                    if (responseData && typeof responseData.currentBalance === 'number') {
                        console.log('Setting safe balance to:', responseData.currentBalance)
                        setSafeBalance(responseData.currentBalance)
                    }
                })
                .catch(err => console.error('Failed to load safe balance:', err))
        } else {
            console.warn('No stationId available, cannot fetch safe balance')
        }
    }, [data.stationId])

    // Validate form
    useEffect(() => {
        let isValid = true
        setError('')

        console.log('Form validation check:', {
            costPrice: data.costPrice,
            totalCost: data.totalCost,
            paymentType: data.paymentType
        })

        // Cost price and total cost required
        if (!data.costPrice || data.costPrice <= 0) {
            console.log('Validation failed: costPrice invalid')
            isValid = false
        }
        if (!data.totalCost || data.totalCost <= 0) {
            console.log('Validation failed: totalCost invalid')
            isValid = false
        }

        // Payment type required
        if (!data.paymentType) {
            console.log('Validation failed: paymentType missing')
            isValid = false
        }

        // If CHEQUE, validate cheque fields
        if (data.paymentType === 'CHEQUE') {
            if (!data.chequeNumber || data.chequeNumber.trim() === '') {
                console.log('Validation failed: chequeNumber missing')
                isValid = false
            }
            if (!data.bankId) {
                console.log('Validation failed: bankId missing')
                isValid = false
            }
            if (!data.chequeDate) {
                console.log('Validation failed: chequeDate missing')
                isValid = false
            }
        }

        console.log('Form valid:', isValid)
        setFormValid(isValid)
    }, [data])

    const handleSubmit = () => {
        // Final validation
        if (!data.costPrice || data.costPrice <= 0) {
            setError('Please enter a valid cost price')
            return
        }
        if (!data.totalCost || data.totalCost <= 0) {
            setError('Please enter a valid total cost')
            return
        }
        if (!data.paymentType) {
            setError('Please select a payment method')
            return
        }

        // Check safe balance for CASH payments
        if (data.paymentType === 'CASH') {
            if (safeBalance === null) {
                setError('Unable to verify safe balance. Please try again.')
                return
            }
            if (safeBalance < (data.totalCost || 0)) {
                setError(
                    `Insufficient safe balance. Available: Rs. ${safeBalance.toLocaleString()}, Required: Rs. ${(data.totalCost || 0).toLocaleString()}. Please use Cheque payment or add cash to safe.`
                )
                return
            }
        }

        if (data.paymentType === 'CHEQUE') {
            if (!data.chequeNumber || data.chequeNumber.trim() === '') {
                setError('Please enter cheque number')
                return
            }
            if (!data.bankId) {
                setError('Please select a bank')
                return
            }
            if (!data.chequeDate) {
                setError('Please enter cheque date')
                return
            }
        }

        setError('')
        onSubmit()
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">Financial Settlement</h2>
                <p className="text-muted-foreground">Record payment details for this delivery</p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {/* Cost Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="costPrice">Cost Price (Per Litre) *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">Rs</span>
                            <Input
                                id="costPrice"
                                type="number"
                                className="pl-10"
                                min="0"
                                step="0.01"
                                value={data.costPrice !== undefined && data.costPrice !== null ? data.costPrice : ''}
                                onChange={e => {
                                    const val = e.target.value
                                    const cost = parseFloat(val) || 0
                                    const qty = Number(data.invoiceQuantity || 0)
                                    const total = cost * qty
                                    console.log(`[Stage4] Cost Change: val="${val}", cost=${cost}, qty=${qty}, total=${total}`)
                                    onUpdate({
                                        costPrice: cost,
                                        totalCost: total
                                    })
                                }}
                                placeholder="0.00"
                                disabled={loading}
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Calculated for: {Number(data.invoiceQuantity || 0).toLocaleString()} Liters
                        </p>
                    </div>
                    <div>
                        <Label htmlFor="totalCost">Total Cost *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">Rs</span>
                            <Input
                                id="totalCost"
                                type="number"
                                className="pl-10 font-bold"
                                min="0"
                                step="0.01"
                                value={data.totalCost !== undefined && data.totalCost !== null ? data.totalCost : ''}
                                onChange={e => onUpdate({ totalCost: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Payment Method */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Payment Method *</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={paymentType}
                            onValueChange={(val: string) => onUpdate({ paymentType: val as 'CASH' | 'CHEQUE' })}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="CASH" id="cash" className="peer sr-only" />
                                <Label htmlFor="cash" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer relative overflow-hidden">
                                    <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                        Safe Balance
                                    </div>
                                    <Banknote className="mb-3 h-6 w-6" />
                                    Cash
                                    <div className={`text-sm font-bold mt-1 ${safeBalance !== null && safeBalance < (data.totalCost || 0) ? 'text-red-500' : 'text-green-600'}`}>
                                        (Rs. {(safeBalance || 0).toLocaleString()})
                                    </div>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="CHEQUE" id="cheque" className="peer sr-only" />
                                <Label htmlFor="cheque" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                    <Wallet className="mb-3 h-6 w-6" />
                                    Cheque
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Cheque Details */}
                {paymentType === 'CHEQUE' && (
                    <Card className="border-orange-500/30 bg-orange-500/5">
                        <CardHeader>
                            <CardTitle className="text-lg">Cheque Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="chequeNumber">Cheque Number *</Label>
                                    <Input
                                        id="chequeNumber"
                                        value={data.chequeNumber || ''}
                                        onChange={(e) => onUpdate({ chequeNumber: e.target.value })}
                                        placeholder="Enter cheque number"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="chequeDate">Cheque Date *</Label>
                                    <Input
                                        id="chequeDate"
                                        type="date"
                                        value={data.chequeDate ? format(new Date(data.chequeDate), 'yyyy-MM-dd') : ''}
                                        onChange={(e) => onUpdate({ chequeDate: new Date(e.target.value) })}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="bank">Bank *</Label>
                                <Select
                                    value={data.bankId}
                                    onValueChange={(val) => onUpdate({ bankId: val })}
                                    disabled={loading}
                                >
                                    <SelectTrigger id="bank">
                                        <SelectValue placeholder="Select Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banks.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                                {bank.name}
                                                {bank.accountNumber && (
                                                    <span className="text-muted-foreground text-xs ml-2">
                                                        ({bank.accountNumber})
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Summary */}
                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Total Payable</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Payment: {paymentType}
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-foreground">
                                Rs. {(data.totalCost || 0).toLocaleString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSubmit}
                    size="lg"
                    disabled={!formValid || loading}
                    className="w-full md:w-auto"
                >
                    {loading ? 'Processing...' : 'Complete Delivery & Payment'}
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
