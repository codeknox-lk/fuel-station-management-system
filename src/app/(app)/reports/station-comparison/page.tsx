'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import {
  ArrowLeft,
  TrendingUp,
  Building2,
  DollarSign,
  Fuel,
  Award,
  AlertCircle,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface StationStats {
  id: string
  name: string
  totalSales: number
  totalVolume: number
  totalProfit: number
  avgDailySales: number
  pumperCount: number
  shiftsCount: number
  profitMargin: number
}


export default function StationComparisonPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stations, setStations] = useState<StationStats[]>([])
  const [error, setError] = useState<string | null>(null)

  // Date range state - default last 30 days
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    date.setHours(0, 0, 0, 0)
    return date
  })
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date()
    date.setHours(23, 59, 59, 999)
    return date
  })

  const fetchStationData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      console.log('Fetching station data for:', { startDate: startDateStr, endDate: endDateStr })

      const response = await fetch(
        `/api/reports/station-comparison?startDate=${startDateStr}&endDate=${endDateStr}`
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Failed to fetch data')
      }

      const data = await response.json()
      console.log('Received station data:', data)
      setStations(data)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch station data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load report data')
      setStations([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    // Check if user is owner
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole')
      if (role !== 'OWNER') {
        router.push('/reports')
        return
      }
    }
    fetchStationData()
  }, [fetchStationData, router])


  const handleApplyFilters = () => {
    fetchStationData()
  }

  const handleExportPDF = () => {
    if (stations.length === 0) {
      alert('No data to export')
      return
    }

    const doc = new jsPDF()

    // Add title
    doc.setFontSize(18)
    doc.text('Station Comparison Report', 14, 20)

    // Add date range
    doc.setFontSize(11)
    doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 28)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)

    // Calculate totals
    const totals = stations.reduce((acc, station) => ({
      totalSales: acc.totalSales + station.totalSales,
      totalVolume: acc.totalVolume + station.totalVolume,
      totalProfit: acc.totalProfit + station.totalProfit,
      avgDailySales: acc.avgDailySales + station.avgDailySales,
      shiftsCount: acc.shiftsCount + station.shiftsCount
    }), { totalSales: 0, totalVolume: 0, totalProfit: 0, avgDailySales: 0, shiftsCount: 0 })

    // Add summary section
    doc.setFontSize(12)
    doc.text('Summary', 14, 44)
    doc.setFontSize(10)
    doc.text(`Total Stations: ${stations.length}`, 14, 50)
    doc.text(`Total Sales: Rs. ${(totals.totalSales || 0).toLocaleString()}`, 14, 56)
    doc.text(`Total Volume: ${(totals.totalVolume || 0).toLocaleString()} L`, 14, 62)
    doc.text(`Total Profit: Rs. ${(totals.totalProfit || 0).toLocaleString()}`, 14, 68)

    // Prepare table data
    const tableData = stations.map(station => [
      station.name,
      `Rs. ${(station.totalSales || 0).toLocaleString()}`,
      `${(station.totalVolume || 0).toLocaleString()} L`,
      `Rs. ${(station.totalProfit || 0).toLocaleString()}`,
      `Rs. ${(station.avgDailySales || 0).toLocaleString()}`,
      station.pumperCount.toString(),
      station.shiftsCount.toString(),
      `${station.profitMargin.toFixed(2)}%`
    ])

    // Add totals row
    tableData.push([
      'TOTAL',
      `Rs. ${(totals.totalSales || 0).toLocaleString()}`,
      `${(totals.totalVolume || 0).toLocaleString()} L`,
      `Rs. ${(totals.totalProfit || 0).toLocaleString()}`,
      `Rs. ${(totals.avgDailySales || 0).toLocaleString()}`,
      '-',
      totals.shiftsCount.toString(),
      '-'
    ])

    // Add table
    autoTable(doc, {
      startY: 75,
      head: [['Station', 'Total Sales', 'Volume', 'Profit', 'Avg Daily', 'Pumpers', 'Shifts', 'Margin %']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 }
    })

    // Save PDF
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    doc.save(`Station_Comparison_${startDateStr}_to_${endDateStr}.pdf`)
  }

  const handleExportExcel = () => {
    if (stations.length === 0) {
      alert('No data to export')
      return
    }

    // Calculate totals
    const totals = stations.reduce((acc, station) => ({
      totalSales: acc.totalSales + station.totalSales,
      totalVolume: acc.totalVolume + station.totalVolume,
      totalProfit: acc.totalProfit + station.totalProfit,
      avgDailySales: acc.avgDailySales + station.avgDailySales,
      shiftsCount: acc.shiftsCount + station.shiftsCount
    }), { totalSales: 0, totalVolume: 0, totalProfit: 0, avgDailySales: 0, shiftsCount: 0 })

    // Prepare data for Excel
    const excelData = [
      ['Station Comparison Report'],
      [`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary'],
      [`Total Stations: ${stations.length}`],
      [`Total Sales: Rs. ${(totals.totalSales || 0).toLocaleString()}`],
      [`Total Volume: ${(totals.totalVolume || 0).toLocaleString()} L`],
      [`Total Profit: Rs. ${(totals.totalProfit || 0).toLocaleString()}`],
      [],
      ['Station', 'Total Sales (Rs.)', 'Volume (L)', 'Profit (Rs.)', 'Avg Daily Sales (Rs.)', 'Pumpers', 'Shifts', 'Profit Margin (%)'],
      ...stations.map(station => [
        station.name,
        station.totalSales,
        station.totalVolume,
        station.totalProfit,
        station.avgDailySales,
        station.pumperCount,
        station.shiftsCount,
        station.profitMargin
      ]),
      [
        'TOTAL',
        totals.totalSales,
        totals.totalVolume,
        totals.totalProfit,
        totals.avgDailySales,
        '',
        totals.shiftsCount,
        ''
      ]
    ]

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Station Comparison')

    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // Station
      { wch: 18 }, // Total Sales
      { wch: 15 }, // Volume
      { wch: 18 }, // Profit
      { wch: 20 }, // Avg Daily
      { wch: 10 }, // Pumpers
      { wch: 10 }, // Shifts
      { wch: 18 }  // Margin
    ]
    ws['!cols'] = colWidths

    // Save Excel file
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    XLSX.writeFile(wb, `Station_Comparison_${startDateStr}_to_${endDateStr}.xlsx`)
  }

  const bestPerformer = stations.length > 0
    ? stations.reduce((best, station) => station.totalProfit > best.totalProfit ? station : best, stations[0])
    : null

  const topVolume = stations.length > 0
    ? stations.reduce((best, station) => station.totalVolume > best.totalVolume ? station : best, stations[0])
    : null

  const topMargin = stations.length > 0
    ? stations.reduce((best, station) => station.profitMargin > best.profitMargin ? station : best, stations[0])
    : null

  const totalAcrossStations = {
    sales: stations.reduce((sum, s) => sum + s.totalSales, 0),
    volume: stations.reduce((sum, s) => sum + s.totalVolume, 0),
    profit: stations.reduce((sum, s) => sum + s.totalProfit, 0)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Station Comparison Report</h1>
            <p className="text-muted-foreground mt-1">
              Cross-station performance analytics
            </p>
          </div>
        </div>
        <Badge variant="default" className="bg-orange-600 hover:bg-orange-700">Owner Access Only</Badge>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900 dark:text-red-100">
                <p className="font-semibold mb-1">Error Loading Report:</p>
                <p>{error}</p>
                <Button
                  onClick={fetchStationData}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <FormCard title="Report Configuration" description="Select date range for comparison">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Start Date</Label>
            <DateTimePicker
              value={startDate}
              onChange={(date) => {
                if (date) {
                  date.setHours(0, 0, 0, 0)
                  setStartDate(date)
                }
              }}
              placeholder="Select start date"
              showTime={false}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold">End Date</Label>
            <DateTimePicker
              value={endDate}
              onChange={(date) => {
                if (date) {
                  date.setHours(23, 59, 59, 999)
                  setEndDate(date)
                }
              }}
              placeholder="Select end date"
              showTime={false}
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleApplyFilters}
              className="w-full"
              disabled={loading}
              variant="default"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Analyze Data'}
            </Button>
          </div>

          <div className="flex items-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={stations.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-red-600" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                  <span>Export as Excel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </FormCard>

      {/* Leaderboard Cards */}
      {stations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bestPerformer && (
            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-none text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Award className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                  <DollarSign className="h-4 w-4" />
                  Most Profitable
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{bestPerformer.name}</div>
                <div className="text-indigo-100">
                  Rs. {bestPerformer.totalProfit.toLocaleString()}
                </div>
                <div className="mt-4 text-xs text-indigo-200 bg-indigo-700/30 inline-block px-2 py-1 rounded">
                  {bestPerformer.profitMargin.toFixed(1)}% Margin
                </div>
              </CardContent>
            </Card>
          )}

          {topVolume && (
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Fuel className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-100 text-sm font-medium">
                  <Fuel className="h-4 w-4" />
                  Highest Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{topVolume.name}</div>
                <div className="text-blue-100">
                  {topVolume.totalVolume.toLocaleString()} Liters
                </div>
                <div className="mt-4 text-xs text-blue-200 bg-blue-700/30 inline-block px-2 py-1 rounded">
                  {topVolume.pumperCount} Active Pumpers
                </div>
              </CardContent>
            </Card>
          )}

          {topMargin && (
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-none text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="h-24 w-24" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-emerald-100 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  Best Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{topMargin.name}</div>
                <div className="text-emerald-100">
                  {topMargin.profitMargin.toFixed(2)}% Net Margin
                </div>
                <div className="mt-4 text-xs text-emerald-200 bg-emerald-700/30 inline-block px-2 py-1 rounded">
                  Rs. {topMargin.avgDailySales.toLocaleString()} Avg Daily
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {stations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales vs Volume Chart */}
          <FormCard title="Sales vs Volume" description="Comparative performance by station">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stations}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => `Rs.${val / 1000}k`} stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val / 1000}k L`} stroke="#f59e0b" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'totalSales' ? `Rs. ${value.toLocaleString()}` : `${value.toLocaleString()} L`,
                      name === 'totalSales' ? 'Total Sales' : 'Total Volume'
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalSales" name="Total Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="totalVolume" name="Total Volume" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FormCard>

          {/* Profit Margin Chart */}
          <FormCard title="Profit Margin Comparison" description="Net profit percentage Comparison">
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" unit="%" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Profit Margin']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="profitMargin" radius={[0, 4, 4, 0]} barSize={30}>
                    {stations.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profitMargin > 15 ? '#10b981' : entry.profitMargin > 5 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FormCard>
        </div>
      )}


      {/* Station Comparison Table */}
      <FormCard title="Detailed Station Performance">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No station data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Station</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Total Sales</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Volume</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Net Profit</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Daily Avg</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Pumpers</th>
                  <th className="text-center p-3 font-semibold text-muted-foreground">Shifts</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <tr key={station.id} className={`border-b hover:bg-muted/20 transition-colors ${index % 2 === 0 ? 'bg-muted/5' : ''}`}>
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center bg-background">
                          {index + 1}
                        </Badge>
                        {station.name}
                        {station.id === bestPerformer?.id && (
                          <Award className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      Rs. {(station.totalSales || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {(station.totalVolume || 0).toLocaleString()} <span className="text-muted-foreground text-xs">L</span>
                    </td>
                    <td className="p-3 text-right font-bold text-green-600 dark:text-green-500">
                      Rs. {(station.totalProfit || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      Rs. {(station.avgDailySales || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      {station.pumperCount}
                    </td>
                    <td className="p-3 text-center">
                      {station.shiftsCount}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium ${station.profitMargin > 15 ? 'text-green-600' : 'text-amber-600'}`}>
                          {station.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-medium">
                <tr className="border-t-2 border-primary/20">
                  <td className="p-3">TOTAL / AVG</td>
                  <td className="p-3 text-right">
                    Rs. {(totalAcrossStations.sales || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    {(totalAcrossStations.volume || 0).toLocaleString()} L
                  </td>
                  <td className="p-3 text-right text-green-700 dark:text-green-400">
                    Rs. {(totalAcrossStations.profit || 0).toLocaleString()}
                  </td>
                  <td colSpan={3}></td>
                  <td className="p-3 text-right">
                    {/* Weighted average margin */}
                    {(totalAcrossStations.sales > 0 ? (totalAcrossStations.profit / totalAcrossStations.sales * 100) : 0).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  )
}
