'use client'

import { useState, useEffect, useCallback } from 'react'
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
    Legend,
    LineChart,
    Line
} from 'recharts'
import {
    AlertCircle,
    ArrowLeft,
    Package,
    ShoppingBag,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Layers,
    Calendar,
    RefreshCw,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailySalesData {
    date: string
    day: number
    sales: Record<string, number>
    totalSales: number
}

interface WastageData {
    id: string
    productName: string
    quantity: number
    cost: number
    reason?: string
    date: string
}

interface LowStockData {
    productId: string
    productName: string
    category: string
    currentQuantity: number
    threshold: number
}

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
    dailySales: DailySalesData[]
    totalsByProduct: Record<string, number>
    productNames: string[]
    wastageBreakdown: WastageData[]
    lowStockAlerts: LowStockData[]
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
    const { selectedStation, isAllStations, stations } = useStation()

    const station = stations.find(s => s.id === selectedStation)
    const monthStartDay = station?.monthStartDate || 1

    const currentBusinessMonth = getCurrentBusinessMonth(monthStartDay)
    const [selectedMonth, setSelectedMonth] = useState(String(currentBusinessMonth.month).padStart(2, '0'))
    const [selectedYear, setSelectedYear] = useState(String(currentBusinessMonth.year))
    const [report, setReport] = useState<ShopReportResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [chartType, setChartType] = useState<'line' | 'bar'>('bar')

    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    const generateReport = useCallback(async () => {
        if (!selectedStation) {
            setError('Please select a station')
            return
        }

        setLoading(true)
        setError('')

        try {
            const businessMonth = getBusinessMonth(parseInt(selectedMonth), parseInt(selectedYear), monthStartDay)
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
    }, [selectedStation, selectedMonth, selectedYear, monthStartDay])

    useEffect(() => {
        if (selectedStation && !isAllStations) {
            generateReport()
        }
    }, [selectedStation, isAllStations, selectedMonth, selectedYear, generateReport])

    const getGrowthIndicator = (current: number, previous: number) => {
        if (!previous) return null;
        const growth = ((current - previous) / previous) * 100;
        const isPositive = growth > 0;
        return (
            <div className={cn("flex items-center text-[10px] font-medium ml-1", isPositive ? "text-green-600" : "text-red-600")}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(growth).toFixed(0)}%
            </div>
        )
    }

    const getProductColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return `hsl(${hash % 360}, 70%, 50%)`;
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
            render: (val) => `Rs. ${(val as number || 0).toLocaleString()}`
        },
        {
            key: 'cost' as keyof PerformanceData,
            title: 'Cost (FIFO)',
            render: (val) => `Rs. ${(val as number || 0).toLocaleString()}`
        },
        {
            key: 'profit' as keyof PerformanceData,
            title: 'Gross Profit',
            render: (val) => (
                <span className={`font-bold ${(val as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. ${(val as number || 0).toLocaleString()}
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

    const wastageColumns: Column<WastageData>[] = [
        { key: 'date', title: 'Date', render: (val) => new Date(val as string).toLocaleDateString() },
        { key: 'productName', title: 'Product' },
        { key: 'reason', title: 'Reason', render: (val) => (val as string) || 'Not specified' },
        { key: 'quantity', title: 'Qty' },
        { key: 'cost', title: 'Loss Value', render: (val) => <span className="text-red-600 font-medium">Rs. {(val as number).toLocaleString()}</span> },
    ]

    const lowStockColumns: Column<LowStockData>[] = [
        { key: 'productName', title: 'Product', render: (val) => <span className="font-medium">{val as string}</span> },
        { key: 'category', title: 'Category' },
        { key: 'threshold', title: 'Restock Threshold' },
        {
            key: 'currentQuantity',
            title: 'Current Qty',
            render: (val) => (
                <span className="font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    {val as number}
                </span>
            )
        }
    ]

    // Prepare Top 5 Products by Margin (Filtered for significance - e.g. sold > 5 items)
    const topMarginProducts = report?.performance
        .filter(p => p.quantitySold > 5)
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 5) || [];

    const lowStockAlerts = report?.lowStockAlerts || [];
    const recentWastage = report?.wastageBreakdown || [];

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
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
                {report && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={generateReport}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                )}
            </div>

            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-6">
                        <div className="w-32">
                            <Label htmlFor="year" className="text-xs mb-1 block text-muted-foreground">Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger id="year">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-40">
                            <Label htmlFor="month" className="text-xs mb-1 block text-muted-foreground">Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger id="month">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {report && (
                            <div className="ml-auto flex items-center bg-background rounded-lg border p-1">
                                <Button
                                    variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setChartType('bar')}
                                    className="h-8 px-3"
                                >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Bar Chart
                                </Button>
                                <Button
                                    variant={chartType === 'line' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setChartType('line')}
                                    className="h-8 px-3"
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Line Chart
                                </Button>
                            </div>
                        )}
                    </div>

                    {isAllStations && (
                        <div className="mt-4 flex items-center p-4 text-amber-800 bg-amber-50 rounded-lg dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                            <span className="font-medium text-sm">Please select a specific station to view shop profitability.</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {loading && !report && (
                <div className="flex flex-col items-center justify-center py-20 bg-card rounded-lg border border-dashed animate-pulse">
                    <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading report data...</p>
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

                    {/* Daily Sales Chart */}
                    {report.dailySales.length > 0 ? (
                        <FormCard title="Daily Shop Sales (Revenue)" description="Item-wise daily revenue trend">
                            <div className="w-full h-96 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === 'line' ? (
                                        <LineChart data={report.dailySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(value) => {
                                                    const d = new Date(value)
                                                    return `${d.getDate()}/${d.getMonth() + 1}`
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                                                labelFormatter={(date) => {
                                                    const d = new Date(date)
                                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {report.productNames.slice(0, 15).map((pName) => (
                                                <Line
                                                    key={pName}
                                                    type="monotone"
                                                    dataKey={(row) => row.sales[pName] || 0}
                                                    stroke={getProductColor(pName)}
                                                    strokeWidth={2}
                                                    dot={{ r: 0 }}
                                                    activeDot={{ r: 6 }}
                                                    name={pName}
                                                />
                                            ))}
                                        </LineChart>
                                    ) : (
                                        <BarChart data={report.dailySales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(value) => {
                                                    const d = new Date(value)
                                                    return `${d.getDate()}`
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                formatter={(value: number) => `Rs. ${(value || 0).toLocaleString()}`}
                                                labelFormatter={(date) => {
                                                    const d = new Date(date)
                                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {report.productNames.slice(0, 15).map((pName) => (
                                                <Bar
                                                    key={pName}
                                                    dataKey={(row) => row.sales[pName] || 0}
                                                    stackId="a"
                                                    fill={getProductColor(pName)}
                                                    name={pName}
                                                    radius={[0, 0, 0, 0]}
                                                />
                                            ))}
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                            {report.productNames.length > 15 && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    Displaying top 15 products in chart out of {report.productNames.length}. See table for all products.
                                </p>
                            )}
                        </FormCard>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Calendar className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">No Daily Data Available</h3>
                                </div>
                            </CardContent>
                        </Card>
                    )}



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
                                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                            // @ts-ignore - recharts PieLabelRenderProps typing issue
                                            label={({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`}
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Low Stock Alerts */}
                        <Card className={cn(lowStockAlerts.length > 0 ? "border-red-200 bg-red-50/30" : "")}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    Low Stock Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {lowStockAlerts.length > 0 ? (
                                    <DataTable
                                        data={lowStockAlerts}
                                        columns={lowStockColumns}
                                        pagination={false}
                                    />
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>All stock levels are healthy.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Wastage */}
                        <Card className={recentWastage.length > 0 ? "border-orange-200 bg-orange-50/30" : ""}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-orange-600">
                                    <AlertCircle className="h-5 w-5" />
                                    Wastage Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentWastage.length > 0 ? (
                                    <DataTable
                                        data={recentWastage}
                                        columns={wastageColumns}
                                        pagination={false}
                                    />
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p>No wastage recorded for this period.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
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

                    {/* Daily Sales Breakdown Table at the end */}
                    {report.dailySales.length > 0 && (
                        <FormCard title="Daily Sales Breakdown" description="Item-wise daily revenue">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-3 font-semibold text-muted-foreground sticky left-0 bg-background/95 backdrop-blur z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#1f2937]">Day</th>
                                            {report.productNames.map(pName => (
                                                <th key={pName} className="text-right p-3 font-semibold">
                                                    {pName}
                                                </th>
                                            ))}
                                            <th className="text-right p-3 font-semibold text-foreground sticky right-0 bg-background/95 backdrop-blur z-10 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#1f2937]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.dailySales.map((day, index) => {
                                            const previousDay = index > 0 ? report.dailySales[index - 1] : null
                                            return (
                                                <tr key={day.date} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                    <td className="p-3 font-medium sticky left-0 bg-background/95 backdrop-blur z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#1f2937]">
                                                        <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                                                    </td>
                                                    {report.productNames.map(pName => (
                                                        <td key={pName} className="text-right p-3">
                                                            {(day.sales[pName] || 0) > 0 ? `Rs. ${(day.sales[pName] || 0).toLocaleString()}` : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="text-right p-3 font-semibold flex flex-col items-end sticky right-0 bg-background/95 backdrop-blur z-10 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#1f2937]">
                                                        <span>Rs. {(day.totalSales || 0).toLocaleString()}</span>
                                                        {previousDay && getGrowthIndicator(day.totalSales, previousDay.totalSales)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        <tr className="bg-muted/50 font-bold border-t-2 border-primary/20">
                                            <td className="p-4 sticky left-0 bg-background/95 backdrop-blur z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#1f2937]">TOTAL</td>
                                            {report.productNames.map(pName => (
                                                <td key={pName} className="text-right p-4">
                                                    Rs. {(report.totalsByProduct[pName] || 0).toLocaleString()}
                                                </td>
                                            ))}
                                            <td className="text-right p-4 text-orange-600 text-lg sticky right-0 bg-background/95 backdrop-blur z-10 shadow-[-1px_0_0_0_#e5e7eb] dark:shadow-[-1px_0_0_0_#1f2937]">
                                                Rs. {report.dailySales.reduce((sum, d) => sum + d.totalSales, 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </FormCard>
                    )}
                </div>
            )}
        </div>
    )
}
