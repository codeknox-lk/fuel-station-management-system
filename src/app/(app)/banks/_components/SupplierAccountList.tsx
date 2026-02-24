'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Eye, RefreshCw, Landmark, Plus } from 'lucide-react'
import { AddSupplierDialog, SupplierPaymentDialog } from './SupplierDialogs'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Supplier {
    id: string
    name: string
    contactPerson: string | null
    phoneNumber: string | null
    email: string | null
    currentBalance: number
    _count?: {
        deliveries: number
        transactions: number
    }
}

export default function SupplierAccountList() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const { toast } = useToast()
    const router = useRouter()

    const fetchSuppliers = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/suppliers')
            if (!res.ok) throw new Error('Failed to fetch suppliers')
            const data = await res.json()
            setSuppliers(data)
        } catch (err) {
            console.error(err)
            toast({
                title: "Error",
                description: "Failed to fetch suppliers",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSuppliers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-orange-600" />
                        Supplier Credit Accounts
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage debt and advance balances with fuel suppliers.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setAddDialogOpen(true)} variant="default" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Supplier
                    </Button>
                    <Button onClick={fetchSuppliers} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map(s => (
                    <Card key={s.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-muted-foreground" />
                                        {s.name}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {s.contactPerson && <div>Contact: {s.contactPerson}</div>}
                                        {s.phoneNumber && <div>Tel: {s.phoneNumber}</div>}
                                    </CardDescription>
                                </div>
                                <Badge variant={s.currentBalance > 0 ? "destructive" : s.currentBalance < 0 ? "default" : "outline"}>
                                    {s.currentBalance > 0 ? "Debt" : s.currentBalance < 0 ? "Advance" : "Settled"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Current Balance */}
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="text-sm text-muted-foreground mb-1">Running Balance</div>
                                <div className={`text-2xl font-bold ${s.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    Rs. {Math.abs(s.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* Transaction Summary */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <div className="text-muted-foreground">Purchases</div>
                                    <div className="font-mono font-semibold">
                                        Rs. {(s._count?.deliveries || 0).toLocaleString()} (Qty)
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Transactions</div>
                                    <div className="font-mono font-semibold">
                                        {s._count?.transactions || 0} Records
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">A/C Status</div>
                                    <div className="font-mono font-semibold italic text-orange-600">
                                        {s.currentBalance > 0 ? 'Payment Due' : s.currentBalance < 0 ? 'Advance Paid' : 'No Balance'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Last Updated</div>
                                    <div className="font-mono font-semibold">
                                        {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedSupplier(s)
                                        setPaymentDialogOpen(true)
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Transaction
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/suppliers/${s.id}`)}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View All ({s._count?.transactions || 0})
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {suppliers.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Landmark className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No supplier accounts found</p>
                        <p className="text-xs mt-1">Create a supplier to start tracking purchases and credits.</p>
                    </CardContent>
                </Card>
            )}

            <AddSupplierDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onSuccess={fetchSuppliers}
            />

            <SupplierPaymentDialog
                open={paymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                supplier={selectedSupplier}
                onSuccess={fetchSuppliers}
            />
        </div>
    )
}
