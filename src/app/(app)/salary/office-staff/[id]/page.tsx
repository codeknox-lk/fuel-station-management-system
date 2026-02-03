'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Briefcase,
  ArrowLeft,
  Download,

  CreditCard,
  Settings
} from 'lucide-react'


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

export default function OfficeStaffSalaryDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { selectedStation } = useStation()

  // Extract values immediately using useMemo to avoid Next.js 15 enumeration issues
  const staffId = useMemo(() => (params?.id as string) || '', [params])
  const month = useMemo(() => searchParams?.get('month') || '', [searchParams])
  const staffName = useMemo(() => searchParams?.get('staffName') || 'Unknown', [searchParams])
  const employeeId = useMemo(() => searchParams?.get('employeeId') || '', [searchParams])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [salaryData, setSalaryData] = useState<OfficeStaffSalaryData | null>(null)



  const fetchSalaryData = useCallback(async () => {
    if (!selectedStation || !staffId || !month) return

    try {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/office-staff/salary?stationId=${selectedStation}&month=${month}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch salary data')
      }

      const data = await res.json()

      // Find the specific office staff member
      const staffData = data.salaryData?.find((s: OfficeStaffSalaryData) => s.id === staffId)

      // If not found, create empty data structure
      if (!staffData) {
        setSalaryData({
          id: staffId,
          name: staffName || 'Unknown',
          employeeId: employeeId || null,
          role: '',
          baseSalary: 0,

          // OfficeStaffSalaryData properties:
          specialAllowance: 0,
          otherAllowances: 0,
          medicalAllowance: 0,
          holidayAllowance: 0,
          fuelAllowance: 0,
          totalAllowances: 0,
          advances: 0,
          loans: 0,
          absentDays: 0,
          absentDeduction: 0,
          epf: 0,
          totalDeductions: 0,
          grossSalary: 0,
          netSalary: 0
        })
        return
      }

      setSalaryData(staffData)
    } catch (err) {
      console.error('Error fetching office staff salary data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load salary data')
    } finally {
      setLoading(false)
    }
  }, [selectedStation, staffId, month, staffName, employeeId])

  useEffect(() => {
    if (selectedStation && staffId && month) {
      fetchSalaryData()
    }
  }, [selectedStation, staffId, month, fetchSalaryData])

  // Parse month safely (format: YYYY-MM)
  const monthParts = month.split('-')
  const year = monthParts[0] || new Date().getFullYear().toString()
  const monthNum = monthParts[1] || String(new Date().getMonth() + 1).padStart(2, '0')
  const monthLabel = months.find(m => m.value === monthNum)?.label || monthNum

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
      </div>
    )
  }

  if (error || !salaryData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monthly Salary Report</h1>
            <p className="text-muted-foreground mt-1">
              {staffName} - {monthLabel} {year}
            </p>
          </div>
        </div>
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Salary data not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Monthly Salary Report
            </h1>
            <p className="text-muted-foreground mt-1">
              {salaryData.name} {salaryData.employeeId && `(${salaryData.employeeId})`} - {monthLabel} {year}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Role: <Badge variant="outline">{salaryData.role.replace('_', ' ')}</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/settings/office-staff`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Base Salary
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              Base Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              Rs. {salaryData.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              Total Allowances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rs. {salaryData.totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              Total Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rs. {salaryData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {salaryData.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allowances and Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Allowances</CardTitle>
            <CardDescription>Amounts added to base salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaryData.specialAllowance > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Special Allowance:</span>
                <span className="font-mono font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.specialAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.otherAllowances > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Other Allowances:</span>
                <span className="font-mono font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.otherAllowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.medicalAllowance > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Medical Allowance:</span>
                <span className="font-mono font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.medicalAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.holidayAllowance > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Holiday Allowance:</span>
                <span className="font-mono font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.holidayAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.fuelAllowance > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-green-500/30">
                <span className="text-sm font-medium">Fuel Allowance:</span>
                <span className="font-mono font-semibold text-green-600 text-lg">
                  +Rs. {salaryData.fuelAllowance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground ml-2">(Manager only)</span>
              </div>
            )}
            {salaryData.totalAllowances === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No allowances for this month</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Allowances:</span>
                <span className="font-mono font-bold text-green-600 text-xl">
                  +Rs. {salaryData.totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Deductions</CardTitle>
            <CardDescription>Amounts deducted from gross salary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaryData.advances > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <span className="text-sm font-medium">Advances Taken:</span>
                <span className="font-mono font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.advances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.loans > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <span className="text-sm font-medium">Loans:</span>
                <span className="font-mono font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.loans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.absentDays > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <span className="text-sm font-medium">Absent Days ({salaryData.absentDays} days):</span>
                <span className="font-mono font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.absentDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.epf > 0 && (
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border">
                <span className="text-sm font-medium">EPF (8%):</span>
                <span className="font-mono font-semibold text-red-600 text-lg">
                  -Rs. {salaryData.epf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {salaryData.totalDeductions === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No deductions for this month</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Deductions:</span>
                <span className="font-mono font-bold text-red-600 text-xl">
                  -Rs. {salaryData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Salary Calculation */}
      <Card className="border-2 border-primary bg-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl">Net Salary Calculation</CardTitle>
          <CardDescription>Final amount after all additions and deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border">
              <span className="text-lg font-medium">Base Salary:</span>
              <span className="font-mono font-semibold text-lg">
                Rs. {salaryData.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-green-500/30">
              <span className="text-lg font-medium">Additions (Allowances):</span>
              <span className="font-mono font-semibold text-green-600 text-lg">
                +Rs. {salaryData.totalAllowances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border">
              <span className="text-lg font-medium">Gross Salary:</span>
              <span className="font-mono font-semibold text-lg">
                Rs. {salaryData.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-red-500/30">
              <span className="text-lg font-medium">Deductions:</span>
              <span className="font-mono font-semibold text-red-600 text-lg">
                -Rs. {salaryData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center p-6 bg-primary/10 rounded-lg border-2 border-primary">
              <span className="text-xl font-bold">Net Salary:</span>
              <div className="flex items-center gap-2">
                <DollarSign className={`h-8 w-8 ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`text-4xl font-bold ${salaryData.netSalary >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {salaryData.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {success && (
        <Card className="border-green-500/20 bg-green-500/10">
          <CardContent className="pt-6">
            <p className="text-green-600 font-medium">{success}</p>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
