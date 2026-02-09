'use client'

import { useState } from 'react'
import { useStation } from '@/contexts/StationContext'
import { useRouter } from 'next/navigation'
import { getCurrentBusinessMonth, getBusinessMonth } from '@/lib/businessMonth'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, Column } from '@/components/ui/DataTable'
import {
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts'
import {
    AlertCircle,
    ArrowLeft,
    Package,
    ArrowUpRight,
    ShoppingBag
} from 'lucide-react'

interface PerformanceData {
    productId: string
    productName: string
    category: string
    quantitySold: number
    revenue: number
    cost: number
    profit: number
    margin: number
}

interface CategoryData {
    category: string
    revenue: number
    profit: number
    itemsSold: number
    [key: string]: string | number
}

interface ShopReportResponse {
    summary: {
        totalRevenue: number
        totalCost: number
        totalProfit: number
        totalWastageLoss: number
        inventoryValuation: number
    }
    performance: PerformanceData[]
    categories: CategoryData[]
    valuationBreakdown: { [key: string]: number }
}

const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function ShopProfitReportPage() {
    const router = useRouter()
    const { selectedStation, isAllStations } = useStation()
    const currentBusinessMonth = getCurrentBusinessMonth()
    const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))
    const [selectedYear, setSelectedYear] = useState(String(currentBusinessMonth.year))
    const [report, setReport] = useState<ShopReportResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    const generateReport = async () => {
        if (!selectedStation) {
            setError('Please select a station')
            return
        }

        setLoading(true)
        setError('')

        try {
            const businessMonth = getBusinessMonth(parseInt(selectedMonth), parseInt(selectedYear))
            const url = `/api/reports/shop-performance?stationId=${selectedStation}&startDate=${businessMonth.startDate.toISOString()}&endDate=${businessMonth.endDate.toISOString()}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch report')

            const data = await response.json()
            setReport(data)
        } catch (e) {
            console.error(e)
            setError('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    const performanceColumns: Column<PerformanceData>[] = [
        { key: 'productName' as keyof PerformanceData, title: 'Product' },
        { key: 'category' as keyof PerformanceData, title: 'Category' },
        { key: 'quantitySold' as keyof PerformanceData, title: 'Sold' },
        {
            key: 'revenue' as keyof PerformanceData,
            title: 'Revenue',
            render: (val) => `Rs. ${(val as (number) || 0).toLocaleString()}`
        },
        {
            key: 'cost' as keyof PerformanceData,
            title: 'Cost (FIFO)',
            render: (val) => `Rs. ${(val as (number) || 0).toLocaleString()}`
        },
        {
            key: 'profit' as keyof PerformanceData,
            title: 'Gross Profit',
            render: (val) => (
                <span className={`font-bold ${(val as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {(val as (number) || 0).toLocaleString()}
                </span>
            )
        },
        {
            key: 'margin' as keyof PerformanceData,
            title: 'Margin',
            render: (val) => `${(val as number).toFixed(1)}%`
        }
    ]

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push('/reports')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-8 w-8 text-orange-600" />
                    Shop Profitability Report
                </h1>
            </div>

            <FormCard title="Select Period" description="Business month runs from 7th to 6th of next month">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {isAllStations ? (
                        <div className="col-span-full p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                            Please select a specific station to view shop profitability.
                        </div>
                    ) : (
                        <>
                            <div>
                                <Label htmlFor="month">Month</Label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger id="month">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="year">Year</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger id="year">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button onClick={generateReport} disabled={loading} className="w-full">
                                    {loading ? 'Generating...' : 'Generate Report'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </FormCard>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {report && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Shop Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">Rs. {(report.summary.totalRevenue || 0).toLocaleString()}</div>
                                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <ArrowUpRight className="h-3 w-3" />
                                    From {report.performance.reduce((sum: number, p: PerformanceData) => sum + p.quantitySold, 0)} items
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Profit (Gross)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">Rs. {(report.summary.totalProfit || 0).toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {((report.summary.totalProfit / report.summary.totalRevenue) * 100).toFixed(1)}% avg margin
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Wastage Loss</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">Rs. {(report.summary.totalWastageLoss || 0).toLocaleString()}</div>
                                <div className="text-xs text-red-500 mt-1">
                                    Includes damaged & expired stock
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 font-bold">Inventory Value</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">Rs. {(report.summary.inventoryValuation || 0).toLocaleString()}</div>
                                <div className="text-xs text-orange-600 mt-1">
                                    Current stock at cost price
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Revenue by Category</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={report.categories}
                                            dataKey="revenue"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        >
                                            {report.categories.map((item: CategoryData, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `Rs. ${(Number(value) || 0).toLocaleString()}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Profit vs Revenue by Category</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={report.categories}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="category" />
                                        <YAxis tickFormatter={(val) => `Rs. ${val / 1000}K`} />
                                        <Tooltip formatter={(value) => `Rs. ${(Number(value) || 0).toLocaleString()}`} />
                                        <Legend />
                                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                                        <Bar dataKey="profit" fill="#10b981" name="Profit" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-600" />
                                Product Performance details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                data={report.performance}
                                columns={performanceColumns}
                                pagination={true}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
