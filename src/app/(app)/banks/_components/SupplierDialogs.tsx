'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, TrendingDown } from 'lucide-react'
import { useStation } from '@/contexts/StationContext'

interface Supplier {
    id: string
    name: string
    currentBalance: number
}

interface AddSupplierDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AddSupplierDialog({ open, onOpenChange, onSuccess }: AddSupplierDialogProps) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        contactPerson: '',
        phoneNumber: '',
        email: '',
        initialBalance: '0'
    })
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    initialBalance: parseFloat(form.initialBalance) || 0
                })
            })

            if (!res.ok) throw new Error('Failed to create supplier')

            toast({
                title: "Success",
                description: "Supplier created successfully"
            })
            onSuccess()
            onOpenChange(false)
            setForm({ name: '', contactPerson: '', phoneNumber: '', email: '', initialBalance: '0' })
        } catch (err) {
            console.error(err)
            toast({
                title: "Error",
                description: "Failed to create supplier",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Supplier</DialogTitle>
                    <DialogDescription>Create a financial account for a fuel supplier.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Supplier Name *</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="e.g. Ceypetco"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact">Contact Person</Label>
                            <Input id="contact" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="balance">Initial Balance (Rs.)</Label>
                        <Input
                            id="balance"
                            type="number"
                            value={form.initialBalance}
                            onChange={e => setForm({ ...form, initialBalance: e.target.value })}
                            placeholder="0.00"
                        />
                        <p className="text-[10px] text-muted-foreground">Positive for Debt, Negative for Advance.</p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Supplier
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface SupplierPaymentDialogProps {
    supplier: Supplier | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function SupplierPaymentDialog({ supplier, open, onOpenChange, onSuccess }: SupplierPaymentDialogProps) {
    const { selectedStation } = useStation()
    const [loading, setLoading] = useState(false)
    const [banks, setBanks] = useState<{ id: string; name: string; accountNumber?: string | null }[]>([])
    const [form, setForm] = useState({
        amount: '',
        paymentSource: 'SAFE', // SAFE, CHEQUE, BANK_TRANSFER, OTHER
        bankId: '',
        chequeNumber: '',
        chequeDate: new Date().toISOString().split('T')[0],
        description: '',
        recordedBy: ''
    })
    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            fetch('/api/banks')
                .then(res => res.json())
                .then(data => setBanks(Array.isArray(data) ? data : []))
                .catch(err => console.error('Failed to load banks:', err))
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supplier) return

        if ((form.paymentSource === 'CHEQUE' || form.paymentSource === 'BANK_TRANSFER') && !form.bankId) {
            toast({ title: "Error", description: "Please select a bank account", variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/suppliers/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: supplier.id,
                    type: 'SETTLEMENT',
                    amount: parseFloat(form.amount) || 0,
                    paymentMethod: form.paymentSource, // Backend uses paymentMethod
                    bankId: form.bankId || undefined,
                    chequeNumber: form.chequeNumber || undefined,
                    chequeDate: form.chequeDate || undefined,
                    stationId: selectedStation || undefined,
                    description: form.description || `Manual Settlement for ${supplier.name}`,
                    recordedBy: form.recordedBy || 'User'
                })
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || 'Failed to record payment')
            }

            toast({
                title: "Success",
                description: `Payment of Rs. ${parseFloat(form.amount).toLocaleString()} recorded successfully.`
            })
            onSuccess()
            onOpenChange(false)
            setForm({
                amount: '',
                paymentSource: 'SAFE',
                bankId: '',
                chequeNumber: '',
                chequeDate: new Date().toISOString().split('T')[0],
                description: '',
                recordedBy: ''
            })
        } catch (err) {
            console.error(err)
            toast({
                title: "Payment Failed",
                description: err instanceof Error ? err.message : "Failed to record payment",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment: {supplier?.name}</DialogTitle>
                    <DialogDescription>Decrease debt or add advance to supplier account.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-3 bg-muted rounded-md flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Current Balance:</span>
                        <span className={`font-bold ${(supplier?.currentBalance ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            Rs. {Math.abs(supplier?.currentBalance ?? 0).toLocaleString()}
                            {(supplier?.currentBalance ?? 0) > 0 ? ' (Debt)' : ' (Advance)'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pay-amt">Amount (Rs.) *</Label>
                            <Input
                                id="pay-amt"
                                type="number"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="source">Payment Source *</Label>
                            <Select value={form.paymentSource} onValueChange={v => setForm({ ...form, paymentSource: v })}>
                                <SelectTrigger id="source">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SAFE">Station Safe (Cash)</SelectItem>
                                    <SelectItem value="CHEQUE">Bank Cheque</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Direct Bank Transfer</SelectItem>
                                    <SelectItem value="OTHER">Other/Direct</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {(form.paymentSource === 'CHEQUE' || form.paymentSource === 'BANK_TRANSFER') && (
                        <div className="space-y-4 p-3 border rounded-md bg-muted/30">
                            <div className="space-y-2">
                                <Label htmlFor="bank">Select Bank Account *</Label>
                                <Select value={form.bankId} onValueChange={v => setForm({ ...form, bankId: v })}>
                                    <SelectTrigger id="bank">
                                        <SelectValue placeholder="Choose account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banks.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                                {bank.name} {bank.accountNumber && `(${bank.accountNumber})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.paymentSource === 'CHEQUE' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="chequeNum">Cheque Number *</Label>
                                        <Input
                                            id="chequeNum"
                                            value={form.chequeNumber}
                                            onChange={e => setForm({ ...form, chequeNumber: e.target.value })}
                                            required={form.paymentSource === 'CHEQUE'}
                                            placeholder="XXXXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="chequeDate">Cheque Date *</Label>
                                        <Input
                                            id="chequeDate"
                                            type="date"
                                            value={form.chequeDate}
                                            onChange={e => setForm({ ...form, chequeDate: e.target.value })}
                                            required={form.paymentSource === 'CHEQUE'}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="pay-desc">Description</Label>
                        <Input
                            id="pay-desc"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="e.g. Ceypetco Weekly Settlement"
                        />
                    </div>

                    {/* Forecast */}
                    {form.amount && supplier && (
                        <div className="p-2 border border-dashed rounded-md text-xs flex justify-between">
                            <span className="text-muted-foreground">Balance After:</span>
                            <span className="font-bold">
                                Rs. {Math.abs(supplier.currentBalance - (parseFloat(form.amount) || 0)).toLocaleString()}
                                {(supplier.currentBalance - (parseFloat(form.amount) || 0)) > 0 ? ' (Debt)' : ' (Advance)'}
                            </span>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !form.amount} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingDown className="mr-2 h-4 w-4" />}
                            Record Settlement
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
