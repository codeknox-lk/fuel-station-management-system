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
    ShoppingBag,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Layers
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

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
        {
            key: 'productName' as keyof PerformanceData,
            title: 'Product',
            render: (val, row) => (
                <div>
                    <div className="font-medium">{val as string}</div>
                    <div className="text-xs text-muted-foreground">{row.category}</div>
                </div>
            )
        },
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
            render: (val) => {
                const margin = val as number;
                let colorClass = 'text-muted-foreground';
                if (margin > 30) colorClass = 'text-green-600 font-medium';
                else if (margin > 15) colorClass = 'text-green-500';
                else if (margin < 0) colorClass = 'text-red-600 font-bold';
                else if (margin < 10) colorClass = 'text-amber-500';

                return <span className={colorClass}>{margin.toFixed(1)}%</span>
            }
        }
    ]

    // Prepare Top 5 Products by Margin (Filtered for significance - e.g. sold > 5 items)
    const topMarginProducts = report?.performance
        .filter(p => p.quantitySold > 5)
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 5) || [];

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => router.push('/reports')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingBag className="h-8 w-8 text-orange-600" />
                        Shop Profitability Report
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Inventory performance and product margins
                    </p>
                </div>
            </div>

            <FormCard title="Report Configuration" description="Business month runs from 7th to 6th of next month">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {isAllStations ? (
                        <div className="col-span-full p-4 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
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
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {report && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Glassmorphic Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                                    <span>Total Revenue</span>
                                    <DollarSign className="h-4 w-4 text-white/80" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold">
                                    Rs. {(report.summary.totalRevenue || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-white/70 mt-1 flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {report.performance.reduce((sum, p) => sum + p.quantitySold, 0)} items sold
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-gradient-to-br from-green-500 to-emerald-600 text-white relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                                    <span>Gross Profit</span>
                                    <TrendingUp className="h-4 w-4 text-white/80" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold">
                                    Rs. {(report.summary.totalProfit || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                    {((report.summary.totalProfit / report.summary.totalRevenue) * 100).toFixed(1)}% Avg Margin
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-gradient-to-br from-orange-500 to-red-500 text-white relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium flex items-center justify-between text-white/90">
                                    <span>Wastage & Loss</span>
                                    <AlertTriangle className="h-4 w-4 text-white/80" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-3xl font-bold">
                                    Rs. {(report.summary.totalWastageLoss || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-white/70 mt-1">
                                    Damaged / Expired Goods
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400 flex items-center justify-between">
                                    <span>Inventory Value</span>
                                    <Layers className="h-4 w-4" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                    Rs. {(report.summary.inventoryValuation || 0).toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Current stock at Cost Price
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue by Category (Donut) */}
                        <FormCard title="Revenue Distribution" description="By Product Category" className="lg:col-span-1">
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={report.categories}
                                            dataKey="revenue"
                                            nameKey="category"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {report.categories.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => `Rs. ${(Number(value) || 0).toLocaleString()}`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </FormCard>

                        {/* Top Products by Margin */}
                        <FormCard title="Top High-Margin Products" description="Products with highest margins (sold > 5 units)" className="lg:col-span-2">
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topMarginProducts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                        <XAxis type="number" unit="%" hide />
                                        <YAxis dataKey="productName" type="category" width={150} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margin']}
                                        />
                                        <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={20}>
                                            {topMarginProducts.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </FormCard>
                    </div>

                    <div className="grid grid-cols-1">
                        <FormCard title="Profitability vs Revenue" description="Performance by Category">
                            <div className="h-[350px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={report.categories} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                                        <YAxis tickFormatter={(val) => `Rs.${val / 1000}k`} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value) => `Rs. ${(Number(value) || 0).toLocaleString()}`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </FormCard>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-600" />
                                Detailed Product Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                data={report.performance}
                                columns={performanceColumns}
                                searchPlaceholder="Search products..."
                                pagination={true}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
