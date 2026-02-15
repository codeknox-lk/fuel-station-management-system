'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    ArrowLeft,
    DollarSign,
    TrendingUp,
    CheckCircle,
    Clock,
    XCircle,
    CreditCard,
    RefreshCw,
    Calendar,
    Landmark
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DataTable } from '@/components/ui/DataTable'

interface BankAccount {
    id: string
    name: string
    branch: string | null
    accountNumber: string | null
    currentBalance: number
}

interface Transaction {
    id: string
    type: 'DEPOSIT' | 'CHEQUE' | 'CREDIT_PAYMENT' | 'MANUAL'
    amount: number
    date: string
    status?: string
    description: string
    station?: string
    chequeNumber?: string
    depositSlip?: string
    customer?: string
}

interface TransactionSummary {
    totalDeposits: number
    totalCheques: number
    clearedCheques: number
    pendingCheques: number
    bouncedCheques: number
    totalCreditPayments: number
    manualDeposits: number
    manualWithdrawals: number
    transactionCount: number
}

export default function BankTransactionDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { selectedStation } = useStation()
    const { toast } = useToast()

    const bankId = params.id as string

    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingTransactions, setLoadingTransactions] = useState(false)

    // Filters
    const [transactionType, setTransactionType] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchBankAccount()
        fetchBankTransactions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bankId, selectedStation])

    const fetchBankAccount = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/banks/accounts?stationId=${selectedStation || ''}`)
            if (!response.ok) throw new Error('Failed to fetch bank account')

            const data = await response.json()
            const bank = data.bankAccounts?.find((b: BankAccount) => b.id === bankId)

            if (bank) {
                setBankAccount(bank)
            } else {
                toast({
                    title: "Error",
                    description: "Bank account not found",
                    variant: "destructive"
                })
                router.push('/banks')
            }
        } catch (error) {
            console.error('Error fetching bank account:', error)
            toast({
                title: "Error",
                description: "Failed to fetch bank account details",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchBankTransactions = async () => {
        try {
            setLoadingTransactions(true)

            const params = new URLSearchParams()
            if (selectedStation) params.append('stationId', selectedStation)
            if (transactionType !== 'all') params.append('type', transactionType)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const response = await fetch(`/api/banks/${bankId}/transactions?${params.toString()}`)
            if (!response.ok) throw new Error('Failed to fetch transactions')

            const data = await response.json()
            setTransactions(data.transactions || [])
            setTransactionSummary(data.summary || null)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            toast({
                title: "Error",
                description: "Failed to fetch transactions",
                variant: "destructive"
            })
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleApplyFilters = () => {
        fetchBankTransactions()
    }

    const getTransactionTypeColor = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
            case 'CHEQUE': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
            case 'CREDIT_PAYMENT': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
            case 'WITHDRAWAL': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
            case 'TRANSFER_IN': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
            case 'TRANSFER_OUT': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
            case 'FEE': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
            case 'INTEREST': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            case 'ADJUSTMENT': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
            default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
        }
    }

    const getStatusBadge = (status?: string) => {
        if (!status) return null

        switch (status) {
            case 'CLEARED':
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Cleared</Badge>
            case 'PENDING':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
            case 'DEPOSITED':
                return <Badge variant="outline" className="bg-primary/10 text-primary dark:text-orange-400 border-primary/20"><Clock className="h-3 w-3 mr-1" />Deposited</Badge>
            case 'BOUNCED':
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Bounced</Badge>
            default:
                return null
        }
    }

    const transactionColumns = [
        {
            key: 'date' as keyof Transaction,
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
                        {type.replace('_', ' ')}
                    </Badge>
                )
            }
        },
        {
            key: 'description' as keyof Transaction,
            title: 'Description',
            render: (value: unknown) => (
                <div className="max-w-md truncate" title={value as string}>
                    {value as string}
                </div>
            )
        },
        {
            key: 'status' as keyof Transaction,
            title: 'Status',
            render: (value: unknown) => getStatusBadge(value as string) || <span className="text-muted-foreground">-</span>
        },
        {
            key: 'amount' as keyof Transaction,
            title: 'Amount',
            render: (value: unknown) => (
                <div className="flex items-center gap-1 justify-end">
                    <span className="font-mono font-semibold">
                        Rs. {(value as (number) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
            </div>
        )
    }

    if (!bankAccount) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground">Bank account not found</p>
                    <Button onClick={() => router.push('/banks')} className="mt-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Banks
                    </Button>
                </div>
            </div>
        )
    }

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
                            <Landmark className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            <h1 className="text-3xl font-bold text-foreground">{bankAccount.name}</h1>
                        </div>
                        <p className="text-muted-foreground mt-1">
                            {bankAccount.branch && `${bankAccount.branch} • `}
                            {bankAccount.accountNumber && `A/C: ${bankAccount.accountNumber}`}
                        </p>
                    </div>
                </div>
                <Button onClick={fetchBankTransactions} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Current Balance */}
            <Card>
                <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
                    <div className="text-3xl font-bold text-green-600">
                        Rs. {(bankAccount.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Summary Cards */}
            {transactionSummary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Deposits */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-4 border-orange-200 dark:border-orange-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide">Deposits</div>
                            <div className="text-lg font-bold text-orange-900 dark:text-orange-100 font-mono">
                                Rs. {(transactionSummary.totalDeposits || 0).toLocaleString()}
                            </div>
                        </div>
                        <TrendingUp className="absolute right-2 bottom-2 h-8 w-8 text-orange-300 dark:text-orange-800 opacity-50" />
                    </div>

                    {/* Cleared */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 p-4 border-green-200 dark:border-green-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Cleared</div>
                            <div className="text-lg font-bold text-green-900 dark:text-green-100 font-mono">
                                Rs. {(transactionSummary.clearedCheques || 0).toLocaleString()}
                            </div>
                        </div>
                        <CheckCircle className="absolute right-2 bottom-2 h-8 w-8 text-green-300 dark:text-green-800 opacity-50" />
                    </div>

                    {/* Pending */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 p-4 border-yellow-200 dark:border-yellow-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Pending</div>
                            <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100 font-mono">
                                Rs. {(transactionSummary.pendingCheques || 0).toLocaleString()}
                            </div>
                        </div>
                        <Clock className="absolute right-2 bottom-2 h-8 w-8 text-yellow-300 dark:text-yellow-800 opacity-50" />
                    </div>

                    {/* Bounced */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 p-4 border-red-200 dark:border-red-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">Bounced</div>
                            <div className="text-lg font-bold text-red-900 dark:text-red-100 font-mono">
                                Rs. {(transactionSummary.bouncedCheques || 0).toLocaleString()}
                            </div>
                        </div>
                        <XCircle className="absolute right-2 bottom-2 h-8 w-8 text-red-300 dark:text-red-800 opacity-50" />
                    </div>

                    {/* Credit */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 p-4 border-orange-200 dark:border-orange-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-orange-700 dark:text-orange-400 uppercase tracking-wide">Credit</div>
                            <div className="text-lg font-bold text-orange-900 dark:text-orange-100 font-mono">
                                Rs. {(transactionSummary.totalCreditPayments || 0).toLocaleString()}
                            </div>
                        </div>
                        <CreditCard className="absolute right-2 bottom-2 h-8 w-8 text-orange-300 dark:text-orange-800 opacity-50" />
                    </div>

                    {/* Total */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950/30 dark:to-gray-900/20 p-4 border-gray-200 dark:border-gray-800">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wide">Total</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                                {transactionSummary.transactionCount}
                            </div>
                        </div>
                        <DollarSign className="absolute right-2 bottom-2 h-8 w-8 text-gray-300 dark:text-gray-800 opacity-50" />
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
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="deposit">Deposits</SelectItem>
                                <SelectItem value="cheque">Cheques</SelectItem>
                                <SelectItem value="credit_payment">Credit Payments</SelectItem>
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
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 dark:border-orange-400 mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading transactions...</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                    <DataTable
                        data={transactions}
                        columns={transactionColumns}
                        searchable={true}
                        searchPlaceholder="Search transactions..."
                        pagination={true}
                        pageSize={20}
                        emptyMessage="No data available"
                    />
                </div>
            )}
        </div>
    )
}
