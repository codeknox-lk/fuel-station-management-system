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
  TrendingDown,
  Building2,
  DollarSign,
  Fuel,
  Award,
  AlertCircle,
  Download,
  RefreshCw,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

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
    ? stations.reduce((best, station) => station.totalSales > best.totalSales ? station : best, stations[0])
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
              Compare performance metrics across all stations
            </p>
          </div>
        </div>
        <Badge variant="default" className="bg-orange-600">Owner Only</Badge>
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
      <FormCard title="Filters & Date Range">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Start Date</Label>
            <DateTimePicker
              value={startDate}
              onChange={(date) => {
                if (date) {
                  date.setHours(0, 0, 0, 0)
                  setStartDate(date)
                  console.log('Start date changed to:', date)
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
                  console.log('End date changed to:', date)
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
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Apply Filters'}
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
                  Export Report
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
        <p className="text-xs text-muted-foreground mt-3">
          📅 Showing data from <span className="font-semibold">{startDate.toLocaleDateString()}</span> to <span className="font-semibold">{endDate.toLocaleDateString()}</span>
        </p>
      </FormCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stations</p>
                <p className="text-2xl font-bold">{stations.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">Rs. {(totalAcrossStations.sales || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{(totalAcrossStations.volume || 0).toLocaleString()} L</p>
              </div>
              <Fuel className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold">Rs. {(totalAcrossStations.profit || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Performer */}
      {bestPerformer && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Award className="h-5 w-5" />
              Best Performing Station
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{bestPerformer.name}</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Total Sales: Rs. {(bestPerformer.totalSales || 0).toLocaleString()}
                </p>
              </div>
              <Badge className="bg-green-600 text-white">Top Performer</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Station Comparison Table */}
      <FormCard title="Station Performance Comparison">
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
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Station</th>
                  <th className="text-right p-3 font-semibold">Total Sales</th>
                  <th className="text-right p-3 font-semibold">Volume (L)</th>
                  <th className="text-right p-3 font-semibold">Profit</th>
                  <th className="text-right p-3 font-semibold">Avg Daily Sales</th>
                  <th className="text-center p-3 font-semibold">Pumpers</th>
                  <th className="text-center p-3 font-semibold">Shifts</th>
                  <th className="text-right p-3 font-semibold">Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <tr key={station.id} className={`border-b ${index % 2 === 0 ? 'bg-muted/50' : ''}`}>
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {station.name}
                        {station.id === bestPerformer?.id && (
                          <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      Rs. {(station.totalSales || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {(station.totalVolume || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-green-600 dark:text-green-400">
                      Rs. {(station.totalProfit || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      Rs. {(station.avgDailySales || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{station.pumperCount}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{station.shiftsCount}</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="">{station.profitMargin}%</span>
                        {station.profitMargin >= 10 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold bg-muted">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-right">
                    Rs. {(totalAcrossStations.sales || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    {(totalAcrossStations.volume || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-green-600 dark:text-green-400">
                    Rs. {(totalAcrossStations.profit || 0).toLocaleString()}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </FormCard>

      {/* Info Box */}
      <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-900 dark:text-orange-100">
              <p className="font-semibold mb-1">About This Report:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Shows real-time data from your database</li>
                <li>Compares all active stations in the selected date range</li>
                <li>Includes only CLOSED shifts for accurate reporting</li>
                <li>Profit = Total Sales - Total Expenses</li>
                <li>Use filters above to customize the date range</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
