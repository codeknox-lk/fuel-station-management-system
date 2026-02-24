'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    ArrowLeft,
    RefreshCw,
    Calendar,
    Building2,
    TrendingUp,
    TrendingDown,
    History,
    FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DataTable } from '@/components/ui/DataTable'

interface Supplier {
    id: string
    name: string
    contactPerson: string | null
    phoneNumber: string | null
    currentBalance: number
}

interface Transaction {
    id: string
    type: 'PURCHASE' | 'SETTLEMENT' | 'ADJUSTMENT'
    amount: number
    transactionDate: string
    description: string
    delivery?: { invoiceNumber: string }
    cheque?: { chequeNumber: string; status: string }
    balanceAfter: number
}

interface TransactionSummary {
    totalPurchases: number
    totalSettlements: number
    totalAdjustments: number
    transactionCount: number
}

export default function SupplierLedgerPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()

    const supplierId = params.id as string

    const [supplier, setSupplier] = useState<Supplier | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [summary, setSummary] = useState<TransactionSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingTransactions, setLoadingTransactions] = useState(false)

    // Filters
    const [transactionType, setTransactionType] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchSupplier()
        fetchTransactions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supplierId])

    const fetchSupplier = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/suppliers/${supplierId}`)
            if (!response.ok) throw new Error('Failed to fetch supplier')
            const data = await response.json()
            setSupplier(data)
        } catch (error) {
            console.error('Error fetching supplier:', error)
            toast({
                title: "Error",
                description: "Failed to fetch supplier details",
                variant: "destructive"
            })
            router.push('/banks')
        } finally {
            setLoading(false)
        }
    }

    const fetchTransactions = async () => {
        try {
            setLoadingTransactions(true)
            const params = new URLSearchParams()
            if (transactionType !== 'all') params.append('type', transactionType)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await fetch(`/api/suppliers/${supplierId}/transactions?${params.toString()}`)
            if (!response.ok) throw new Error('Failed to fetch transactions')

            const data = await response.json()
            setTransactions(data.transactions || [])
            setSummary(data.summary || null)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            toast({
                title: "Error",
                description: "Failed to fetch transaction history",
                variant: "destructive"
            })
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleApplyFilters = () => {
        fetchTransactions()
    }

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case 'PURCHASE': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
            case 'SETTLEMENT': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
            case 'ADJUSTMENT': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
            default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
        }
    }

    const transactionColumns = [
        {
            key: 'transactionDate' as keyof Transaction,
            title: 'Date',
            render: (value: unknown) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(value as string).toLocaleDateString()}</span>
                </div>
            )
        },
        {
            key: 'type' as keyof Transaction,
            title: 'Type',
            render: (value: unknown) => {
                const type = value as string
                return (
                    <Badge variant="outline" className={getTransactionTypeColor(type)}>
                        {type}
                    </Badge>
                )
            }
        },
        {
            key: 'description' as keyof Transaction,
            title: 'Description',
            render: (value: unknown, row: Transaction) => (
                <div className="max-w-md truncate" title={value as string}>
                    <span className="font-medium mr-1">{value as string}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {row.delivery && `(Inv: ${row.delivery.invoiceNumber})`}
                        {row.cheque && `(Chq: ${row.cheque.chequeNumber})`}
                    </span>
                </div>
            )
        },
        {
            key: 'amount' as keyof Transaction,
            title: 'Amount',
            render: (value: unknown, row: Transaction) => (
                <div className={`flex items-center gap-1 justify-end font-mono font-semibold ${row.type === 'PURCHASE' ? 'text-red-500' : 'text-green-600'}`}>
                    <span>{row.type === 'PURCHASE' ? '+' : '-'}</span>
                    <span>Rs. {(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            )
        },
        {
            key: 'balanceAfter' as keyof Transaction,
            title: 'Running Balance',
            render: (value: unknown) => (
                <div className="font-mono font-semibold text-right text-muted-foreground">
                    Rs. {(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!supplier) return null

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button onClick={() => router.push('/banks')} variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            <h1 className="text-3xl font-bold text-foreground">{supplier.name}</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {supplier.contactPerson && `${supplier.contactPerson} • `}
                            {supplier.phoneNumber && `Tel: ${supplier.phoneNumber}`}
                        </p>
                    </div>
                </div>
                <Button onClick={fetchTransactions} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Current Balance */}
            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Current Running Balance</div>
                    <div className={`text-3xl font-bold ${supplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {Math.abs(supplier.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-sm font-medium ml-2 uppercase tracking-wide opacity-70">
                            {supplier.currentBalance > 0 ? '(Debt)' : '(Advance)'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Grid */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Purchases */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-4 border-orange-200 dark:border-orange-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide">Purchases</div>
                            <div className="text-lg font-bold text-orange-900 dark:text-orange-100 font-mono">
                                Rs. {(summary.totalPurchases || 0).toLocaleString()}
                            </div>
                        </div>
                        <TrendingUp className="absolute right-2 bottom-2 h-8 w-8 text-orange-300 dark:text-orange-800 opacity-50" />
                    </div>

                    {/* Settlements */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-4 border-green-200 dark:border-green-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Settlements</div>
                            <div className="text-lg font-bold text-green-900 dark:text-green-100 font-mono">
                                Rs. {(summary.totalSettlements || 0).toLocaleString()}
                            </div>
                        </div>
                        <TrendingDown className="absolute right-2 bottom-2 h-8 w-8 text-green-300 dark:text-green-800 opacity-50" />
                    </div>

                    {/* Adjustments */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 p-4 border-yellow-200 dark:border-yellow-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Adjustments</div>
                            <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100 font-mono">
                                Rs. {(summary.totalAdjustments || 0).toLocaleString()}
                            </div>
                        </div>
                        <History className="absolute right-2 bottom-2 h-8 w-8 text-yellow-300 dark:text-yellow-800 opacity-50" />
                    </div>

                    {/* Records */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/30 dark:to-gray-900/20 p-4 border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wide">Total Records</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                                {summary.transactionCount}
                            </div>
                        </div>
                        <FileText className="absolute right-2 bottom-2 h-8 w-8 text-gray-300 dark:text-gray-800 opacity-50" />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-orange-500/10 rounded-lg">
                        <RefreshCw className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="font-semibold">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="transactionType" className="text-xs font-medium text-muted-foreground mb-1.5 block">Transaction Type</Label>
                        <Select value={transactionType} onValueChange={setTransactionType}>
                            <SelectTrigger id="transactionType" className="h-10">
                                <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Transactions</SelectItem>
                                <SelectItem value="PURCHASE">Purchases (Deliveries)</SelectItem>
                                <SelectItem value="SETTLEMENT">Settlements (Payments)</SelectItem>
                                <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</Label>
                        <Input
                            id="startDate"
                            type="date"
                            className="h-10"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground mb-1.5 block">End Date</Label>
                        <Input
                            id="endDate"
                            type="date"
                            className="h-10"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleApplyFilters} className="w-full h-10 bg-orange-600 hover:bg-orange-700">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Apply Filters
                        </Button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            {loadingTransactions ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading ledger...</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <DataTable
                        data={transactions}
                        columns={transactionColumns}
                        searchable={true}
                        searchPlaceholder="Search history..."
                        pagination={true}
                        pageSize={20}
                    />
                </div>
            )}
        </div>
    )
}
