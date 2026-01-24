'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/DataTable'
import { FormCard } from '@/components/ui/FormCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  Clock,
  TrendingUp,
  User,
  Download,
  RefreshCw,
  AlertCircle,
  Briefcase,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { exportSalaryReportPDF } from '@/lib/exportUtils'
import { useToast } from '@/hooks/use-toast'

interface SalaryData {
  pumperId: string
  pumperName: string
  employeeId?: string
  baseSalary: number
  holidayAllowance?: number
  restDaysTaken?: number
  daysWorked?: number
  shiftCount: number
  totalHours: number
  totalOvertimeHours?: number
  totalOvertimeAmount?: number
  commission?: number
  totalSales: number
  totalAdvances: number
  totalLoans: number
  varianceAdd: number
  varianceDeduct: number
  epf?: number
  netSalary: number
  shiftDetails: Array<{
    shiftId: string
    date: string
    hours: number
    sales: number
    advance: number
    variance: number
    varianceStatus: string
    overtimeHours?: number
    overtimeAmount?: number
  }>
}

interface SalaryResponse {
  month: string
  startDate: string
  endDate: string
  salaryData: SalaryData[]
}

interface OfficeStaffSalaryData {
  id: string
  name: string
  employeeId: string | null
  role: string
  baseSalary: number
  specialAllowance: number
  otherAllowances: number
  medicalAllowance: number
  holidayAllowance: number
  fuelAllowance: number
  totalAllowances: number
  advances: number
  loans: number
  absentDays: number
  absentDeduction: number
  epf: number
  totalDeductions: number
  grossSalary: number
  netSalary: number
}

interface OfficeStaffSalaryResponse {
  month: string
  stationId: string
  salaryData: OfficeStaffSalaryData[]
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

export default function SalaryPage() {
  const router = useRouter()
  const { selectedStation } = useStation()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [salaryData, setSalaryData] = useState<SalaryResponse | null>(null)
  const [officeStaffSalaryData, setOfficeStaffSalaryData] = useState<OfficeStaffSalaryResponse | null>(null)
  const [loadingOfficeStaff, setLoadingOfficeStaff] = useState(false)

  // Month selection
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'))

  // Generate years (current year and previous 2 years)
  const years = Array.from({ length: 3 }, (_, i) => {
    const year = currentDate.getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  useEffect(() => {
    if (selectedStation) {
      fetchSalaryData()
      fetchOfficeStaffSalaryData()
    }
  }, [selectedStation, selectedYear, selectedMonth])

  const fetchSalaryData = async () => {
    if (!selectedStation) return

    try {
      setLoading(true)


      // Format month for API (API expects YYYY-MM format, but will calculate 7th-6th period)
      const month = `${selectedYear}-${selectedMonth}`
      const res = await fetch(`/api/salary?stationId=${selectedStation}&month=${month}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch salary data')
      }

      const data = await res.json()
      setSalaryData(data)
    } catch (err) {
      console.error('Error fetching salary data:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to load salary data',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOfficeStaffSalaryData = async () => {
    if (!selectedStation) return

    try {
      setLoadingOfficeStaff(true)

      // Format month for API (API expects YYYY-MM format)
      const month = `${selectedYear}-${selectedMonth}`
      const res = await fetch(`/api/office-staff/salary?stationId=${selectedStation}&month=${month}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error fetching office staff salary:', errorData.error || 'Failed to fetch office staff salary data')
        setOfficeStaffSalaryData(null)
        return
      }

      const data = await res.json()
      setOfficeStaffSalaryData(data)
    } catch (err) {
      console.error('Error fetching office staff salary data:', err)
      setOfficeStaffSalaryData(null)
    } finally {
      setLoadingOfficeStaff(false)
    }
  }

  const handleRowClick = (row: SalaryData) => {
    // Navigate to pumper details page with month and pumper info
    const month = `${selectedYear}-${selectedMonth}`
    router.push(`/salary/${encodeURIComponent(row.pumperId)}?month=${month}&pumperName=${encodeURIComponent(row.pumperName)}`)
  }

  const handleOfficeStaffRowClick = (row: OfficeStaffSalaryData) => {
    // Navigate to office staff details page with month and staff info
    const month = `${selectedYear}-${selectedMonth}`
    router.push(`/salary/office-staff/${encodeURIComponent(row.id)}?month=${month}&staffName=${encodeURIComponent(row.name)}&employeeId=${encodeURIComponent(row.employeeId || '')}`)
  }

  const handleExport = () => {
    if (!salaryData || salaryData.salaryData.length === 0) {
      toast({
        title: "Error",
        description: "No data to export",
        variant: "destructive"
      })
      return
    }

    try {
      const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth
      exportSalaryReportPDF(salaryData.salaryData, `${monthLabel} ${selectedYear}`)
    } catch (err) {
      console.error('Error exporting salary report:', err)
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive"
      })
    }
  }

  const salaryColumns = [
    {
      key: 'pumperName' as keyof SalaryData,
      title: 'Pumper',
      render: (value: unknown, row: SalaryData) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            {row.employeeId && (
              <div className="text-xs text-muted-foreground">ID: {row.employeeId}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'shiftCount' as keyof SalaryData,
      title: 'Shifts',
      render: (value: unknown) => (
        <Badge variant="outline">{value as number}</Badge>
      )
    },
    {
      key: 'totalHours' as keyof SalaryData,
      title: 'Hours',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{(value as number).toFixed(1)}h</span>
        </div>
      )
    },
    {
      key: 'totalSales' as keyof SalaryData,
      title: 'Total Sales',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="font-semibold text-green-600">
            Rs. {(value as number).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'baseSalary' as keyof SalaryData,
      title: 'Base Salary',
      render: (value: unknown) => (
        <span>Rs. {(value as number).toLocaleString()}</span>
      )
    },
    {
      key: 'totalAdvances' as keyof SalaryData,
      title: 'Advances',
      render: (value: unknown) => {
        const advances = value as number
        return advances > 0 ? (
          <span className="text-orange-600">-Rs. {advances.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      }
    },
    {
      key: 'totalLoans' as keyof SalaryData,
      title: 'Loans',
      render: (value: unknown) => {
        const loans = value as number
        return loans > 0 ? (
          <span className="text-red-600">-Rs. {loans.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      }
    },
    {
      key: 'varianceAdd' as keyof SalaryData,
      title: 'Variance (+/-)',
      render: (value: unknown, row: SalaryData) => {
        const add = row.varianceAdd || 0
        const deduct = row.varianceDeduct || 0
        if (add > 0 && deduct > 0) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-green-600">+Rs. {add.toLocaleString()}</span>
              <span className="text-xs text-red-600">-Rs. {deduct.toLocaleString()}</span>
            </div>
          )
        } else if (add > 0) {
          return <span className="text-green-600">+Rs. {add.toLocaleString()}</span>
        } else if (deduct > 0) {
          return <span className="text-red-600">-Rs. {deduct.toLocaleString()}</span>
        }
        return <span className="text-muted-foreground">-</span>
      }
    },
    {
      key: 'netSalary' as keyof SalaryData,
      title: 'Net Salary',
      render: (value: unknown, row: SalaryData) => {
        const net = value as number
        return (
          <div className="flex items-center gap-2">
            <DollarSign className={`h-4 w-4 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {net.toLocaleString()}
            </span>
          </div>
        )
      }
    }
  ]

  const officeStaffSalaryColumns = [
    {
      key: 'name' as keyof OfficeStaffSalaryData,
      title: 'Name',
      render: (value: unknown, row: OfficeStaffSalaryData) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value as string}</div>
            {row.employeeId && (
              <div className="text-xs text-muted-foreground">ID: {row.employeeId}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role' as keyof OfficeStaffSalaryData,
      title: 'Role',
      render: (value: unknown) => (
        <Badge variant="outline">{String(value).replace('_', ' ')}</Badge>
      )
    },
    {
      key: 'baseSalary' as keyof OfficeStaffSalaryData,
      title: 'Base Salary',
      render: (value: unknown) => (
        <span>Rs. {(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      )
    },
    {
      key: 'totalAllowances' as keyof OfficeStaffSalaryData,
      title: 'Allowances',
      render: (value: unknown) => {
        const allowances = value as number
        return allowances > 0 ? (
          <span className="text-green-600">+Rs. {allowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      }
    },
    {
      key: 'totalDeductions' as keyof OfficeStaffSalaryData,
      title: 'Deductions',
      render: (value: unknown) => {
        const deductions = value as number
        return deductions > 0 ? (
          <span className="text-red-600">-Rs. {deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      }
    },
    {
      key: 'netSalary' as keyof OfficeStaffSalaryData,
      title: 'Net Salary',
      render: (value: unknown) => {
        const net = value as number
        return (
          <div className="flex items-center gap-2">
            <DollarSign className={`h-4 w-4 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )
      }
    }
  ]

  if (loading && !salaryData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Salary Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monthly salary calculation based on shifts, sales, advances, and variance adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSalaryData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!salaryData || salaryData.salaryData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Salary Period</CardTitle>
          <CardDescription>Salary periods run from 7th of each month to 6th of next month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="month">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Summary Cards */}
      {salaryData && salaryData.salaryData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pumpers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salaryData.salaryData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {salaryData.salaryData.reduce((sum, p) => sum + p.shiftCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                Rs. {salaryData.salaryData.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Advances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                Rs. {salaryData.salaryData.reduce((sum, p) => sum + p.totalAdvances, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Salary Tabs */}
      <Tabs defaultValue="pumpers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pumpers">
            <Users className="h-4 w-4 mr-2" />
            Pumpers
          </TabsTrigger>
          <TabsTrigger value="office-staff">
            <Briefcase className="h-4 w-4 mr-2" />
            Office Staff
          </TabsTrigger>
        </TabsList>

        {/* Pumpers Tab */}
        <TabsContent value="pumpers" className="space-y-4">
          <FormCard
            title="Monthly Salary Report for Pumpers"
            description={`Salary breakdown for ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
          >
            {!salaryData || salaryData.salaryData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>No salary data found for this month</p>
                <p className="text-sm">No shifts were closed during this period</p>
              </div>
            ) : (
              <DataTable
                data={salaryData.salaryData}
                columns={salaryColumns}
                searchable={true}
                searchPlaceholder="Search pumpers..."
                pagination={true}
                pageSize={10}
                onRowClick={handleRowClick}
              />
            )}
          </FormCard>
        </TabsContent>

        {/* Office Staff Tab */}
        <TabsContent value="office-staff" className="space-y-4">
          <FormCard
            title="Monthly Salary Report for Office Staff"
            description={`Salary breakdown for Manager, Supervisor, and Office Staff - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
          >
            {loadingOfficeStaff ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
              </div>
            ) : !officeStaffSalaryData || officeStaffSalaryData.salaryData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>No office staff found for this station</p>
                <p className="text-sm">Add office staff members in Settings to calculate their salaries</p>
              </div>
            ) : (
              <DataTable
                data={officeStaffSalaryData.salaryData}
                columns={officeStaffSalaryColumns}
                searchable={true}
                searchPlaceholder="Search office staff..."
                pagination={true}
                pageSize={10}
                onRowClick={handleOfficeStaffRowClick}
              />
            )}
          </FormCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

