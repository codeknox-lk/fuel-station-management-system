'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { Clock, Fuel, DollarSign, CreditCard, FileText, Plus, Trash2, Printer } from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Shift {
  id: string
  stationId: string
  templateId: string
  startTime: string
  endTime?: string
  status: string
  openedBy: string
}

interface Assignment {
  id: string
  nozzleId: string
  pumperName: string
  startMeterReading: number
  endMeterReading?: number
  status: string
  canSales?: number // Can sales in litres
  pumpSales?: number // Pump sales in litres (calculated)
}

interface Bank {
  id: string
  name: string
  code: string
}

interface TenderSummary {
  totalSales: number
  totalDeclared: number
  variance: number
  varianceClassification: {
    variance: number
    variancePercentage: number
    isNormal: boolean
    tolerance: number
  }
  salesBreakdown?: {
    totalPumpSales: number
    totalCanSales: number
    totalLitres: number
    oilSales?: {
      totalAmount: number
      salesCount: number
    }
  }
}

export default function CloseShiftPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedShift, setSelectedShift] = useState('')
  const [endTime, setEndTime] = useState<Date>(new Date())
  
  // Tender state
  const [cashAmount, setCashAmount] = useState(0)
  const [cardAmounts, setCardAmounts] = useState<Record<string, number>>({})
  const [creditAmount, setCreditAmount] = useState(0)
  const [chequeAmount, setChequeAmount] = useState(0)
  const [tenderSummary, setTenderSummary] = useState<TenderSummary | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, banksRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/banks?active=true')
        ])
        
        const stationsData = await stationsRes.json()
        const banksData = await banksRes.json()
        
        setStations(stationsData)
        setBanks(banksData)
      } catch (err) {
        setError('Failed to load data')
      }
    }
    
    loadData()
  }, [])

  // Load shifts when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadShifts = async () => {
        try {
          const res = await fetch(`/api/shifts?stationId=${selectedStation}&active=true`)
          const shiftsData = await res.json()
          console.log('Shifts API response:', shiftsData)
          
          // Handle both old format (array) and new format (object with shifts property)
          if (Array.isArray(shiftsData)) {
            console.log('Using array format, shifts count:', shiftsData.length)
            setShifts(shiftsData)
          } else if (shiftsData.shifts && Array.isArray(shiftsData.shifts)) {
            console.log('Using object format, shifts count:', shiftsData.shifts.length)
            setShifts(shiftsData.shifts)
          } else {
            console.log('No valid shifts data found, setting empty array')
            setShifts([])
          }
        } catch (err) {
          setError('Failed to load shifts')
        }
      }
      
      loadShifts()
    }
  }, [selectedStation])

  // Load assignments when shift changes
  useEffect(() => {
    if (selectedShift) {
      const loadAssignments = async () => {
        try {
          const res = await fetch(`/api/shifts/${selectedShift}/assignments`)
          const assignmentsData = await res.json()
          console.log('Assignments API response:', assignmentsData)
          
          // Ensure assignmentsData is an array
          if (Array.isArray(assignmentsData)) {
            setAssignments(assignmentsData)
          } else {
            console.error('Assignments data is not an array:', assignmentsData)
            setAssignments([])
          }
        } catch (err) {
          setError('Failed to load assignments')
        }
      }
      
      loadAssignments()
    }
  }, [selectedShift])

  // Calculate tender summary when amounts change
  useEffect(() => {
    if (selectedShift && assignments.length > 0) {
      const calculateSummary = async () => {
        try {
          const totalCardAmount = Object.values(cardAmounts).reduce((sum, amount) => sum + amount, 0)
          const totalDeclared = cashAmount + totalCardAmount + creditAmount + chequeAmount
          
          const assignmentsParam = encodeURIComponent(JSON.stringify(assignments))
          const res = await fetch(
            `/api/tenders/shift/${selectedShift}?cashAmount=${cashAmount}&cardAmount=${totalCardAmount}&creditAmount=${creditAmount}&chequeAmount=${chequeAmount}&assignments=${assignmentsParam}`
          )
          const summary = await res.json()
          setTenderSummary(summary)
        } catch (err) {
          console.error('Failed to calculate summary:', err)
        }
      }
      
      calculateSummary()
    }
  }, [selectedShift, cashAmount, cardAmounts, creditAmount, chequeAmount, assignments])

  const handleUpdateAssignment = (assignmentId: string, field: 'endMeterReading' | 'canSales', value: number) => {
    setAssignments(prev => 
      prev.map(assignment => {
        if (assignment.id === assignmentId) {
          const updated = { ...assignment, [field]: value }
          
          // Calculate pump sales when meter reading or can sales change
          if (field === 'endMeterReading' || field === 'canSales') {
            const meterDelta = (updated.endMeterReading || 0) - updated.startMeterReading
            const canSales = updated.canSales || 0
            updated.pumpSales = Math.max(0, meterDelta - canSales)
          }
          
          return updated
        }
        return assignment
      })
    )
  }

  const handleAddCardRow = (bankId: string) => {
    setCardAmounts(prev => ({ ...prev, [bankId]: 0 }))
  }

  const handleRemoveCardRow = (bankId: string) => {
    setCardAmounts(prev => {
      const newAmounts = { ...prev }
      delete newAmounts[bankId]
      return newAmounts
    })
  }

  const handleUpdateCardAmount = (bankId: string, amount: number) => {
    setCardAmounts(prev => ({ ...prev, [bankId]: amount }))
  }


  const handleCloseShiftAndPrint = async () => {
    if (!selectedShift || !Array.isArray(assignments) || assignments.some(a => !a.endMeterReading)) {
      setError('Please fill in all end meter readings')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Use the selected end time, or current time if not set
      const finalEndTime = endTime || new Date()
      
      // Calculate total card amount
      const totalCardAmount = Object.values(cardAmounts).reduce((sum, amount) => sum + amount, 0)
      
      console.log('Closing shift:', selectedShift)
      console.log('Assignments to close:', assignments)
      
      // Update assignments with end meter readings
      for (const assignment of assignments) {
        console.log('Closing assignment:', assignment.id, 'with end reading:', assignment.endMeterReading)
        const res = await fetch(`/api/shifts/${selectedShift}/assignments/${assignment.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endMeterReading: assignment.endMeterReading,
            endTime: finalEndTime.toISOString()
          })
        })
        
        if (!res.ok) {
          const error = await res.json()
          throw new Error(`Failed to close assignment ${assignment.id}: ${error.error}`)
        }
        
        const result = await res.json()
        console.log('Assignment closed successfully:', result)
      }

      // Close shift
      console.log('Closing shift:', selectedShift)
      
      // Ensure end time is after start time
      // Get shift data to check start time
      const shiftResponse = await fetch(`/api/shifts/${selectedShift}`)
      const shiftData = await shiftResponse.json()
      const shiftStartTime = new Date(shiftData.startTime)
      const validatedEndTime = finalEndTime > shiftStartTime ? finalEndTime : new Date()
      
      console.log('🔍 FRONTEND DEBUG:')
      console.log('  Shift start time:', shiftStartTime)
      console.log('  Selected end time:', finalEndTime)
      console.log('  Validated end time:', validatedEndTime)
      console.log('  Final end time ISO:', validatedEndTime.toISOString())
      
      const shiftRes = await fetch(`/api/shifts/${selectedShift}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: validatedEndTime.toISOString(),
          closedBy: 'Current User',
          cashAmount: cashAmount,
          cardAmount: totalCardAmount,
          creditAmount: creditAmount,
          chequeAmount: chequeAmount
        })
      })
      
      if (!shiftRes.ok) {
        const error = await shiftRes.json()
        throw new Error(`Failed to close shift: ${error.error}`)
      }
      
      const shiftResult = await shiftRes.json()
      console.log('Shift closed successfully:', shiftResult)

      setSuccess('Shift closed successfully!')
      
      // Print the page after successful closure
      setTimeout(() => {
        window.print()
      }, 500) // Small delay to ensure success message is shown
      
      setTimeout(() => {
        router.push('/shifts')
      }, 3000) // Increased delay to allow printing
    } catch (err) {
      setError('Failed to close shift')
    } finally {
      setLoading(false)
    }
  }

  const assignmentColumns = [
    {
      key: 'pumperName' as keyof Assignment,
      title: 'Pumper',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'startMeterReading' as keyof Assignment,
      title: 'Start Meter',
      render: (value: unknown) => {
        const numValue = value as number
        return (
          <span className="font-mono">
            {numValue != null ? numValue.toLocaleString() : '-'}
          </span>
        )
      }
    },
    {
      key: 'endMeterReading' as keyof Assignment,
      title: 'End Meter',
      render: (value: unknown, row: Assignment) => (
        <Input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => handleUpdateAssignment(row.id, 'endMeterReading', parseInt(e.target.value) || 0)}
          placeholder="Enter end reading"
          className="w-full"
        />
      )
    },
    {
      key: 'canSales' as keyof Assignment,
      title: 'Can Sales (L)',
      render: (value: unknown, row: Assignment) => (
        <Input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => handleUpdateAssignment(row.id, 'canSales', parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-full"
        />
      )
    },
    {
      key: 'pumpSales' as keyof Assignment,
      title: 'Pump Sales (L)',
      render: (_value: unknown, row: Assignment) => {
        const pumpSales = row.pumpSales ?? 0
        return (
          <span className="font-mono text-blue-600">
            {pumpSales.toLocaleString()}
          </span>
        )
      }
    },
    {
      key: 'delta' as keyof Assignment,
      title: 'Total Delta (L)',
      render: (_value: unknown, row: Assignment) => {
        const endReading = row.endMeterReading ?? 0
        const startReading = row.startMeterReading ?? 0
        const delta = endReading - startReading
        return (
          <span className={`font-mono ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {delta.toLocaleString()}
          </span>
        )
      }
    }
  ]

  const availableBanks = banks.filter(bank => !cardAmounts.hasOwnProperty(bank.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Close Shift</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Shift Selection" description="Select the station and shift to close">
        {/* Display current station */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              Station: {stations.find(s => s.id === selectedStation)?.name || 'No station selected'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label htmlFor="shift">Shift *</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(shifts) && shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {new Date(shift.startTime).toLocaleString()} - {shift.openedBy}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No active shifts found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End Time *</Label>
            <DateTimePicker
              value={endTime}
              onChange={(date) => setEndTime(date || new Date())}
              placeholder="Select end time"
            />
          </div>
        </div>
      </FormCard>

      {selectedShift && assignments.length > 0 && (
        <FormCard title="Meter Readings" description="Enter end meter readings for each assignment">
          <DataTable
            data={assignments}
            columns={assignmentColumns}
            searchable={false}
            pagination={false}
          />
        </FormCard>
      )}

      {selectedShift && (
        <FormCard 
          title="Tender Reconciliation" 
          description="Enter the actual amounts collected"
        >
          <div className="space-y-6">
            {/* Cash */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash Amount
              </Label>
              <MoneyInput
                value={cashAmount}
                onChange={setCashAmount}
                placeholder="0.00"
                className="w-full"
              />
            </div>

            {/* Card Amounts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Card Amounts by Bank
                </Label>
                <div className="flex items-center gap-2">
                  <Select onValueChange={handleAddCardRow}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.id}>
                          {bank.name} ({bank.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={availableBanks.length === 0}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {Object.entries(cardAmounts).map(([bankId, amount]) => {
                const bank = banks.find(b => b.id === bankId)
                return (
                  <div key={bankId} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-sm text-gray-600">{bank?.name}</Label>
                      <MoneyInput
                        value={amount}
                        onChange={(value) => handleUpdateCardAmount(bankId, value)}
                        placeholder="0.00"
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCardRow(bankId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Credit */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Credit Amount
              </Label>
              <MoneyInput
                value={creditAmount}
                onChange={setCreditAmount}
                placeholder="0.00"
                className="w-full"
              />
            </div>

            {/* Cheque */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Cheque Amount
              </Label>
              <MoneyInput
                value={chequeAmount}
                onChange={setChequeAmount}
                placeholder="0.00"
                className="w-full"
              />
            </div>
          </div>
        </FormCard>
      )}

      {tenderSummary && (
        <FormCard title="Summary" description="Sales vs declared amounts">
          {/* Sales Breakdown */}
          {tenderSummary?.salesBreakdown && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-900 mb-3">Sales Breakdown</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-blue-600 font-mono text-lg">
                    {tenderSummary.salesBreakdown.totalPumpSales.toLocaleString()}L
                  </div>
                  <div className="text-gray-600">Pump Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-green-600 font-mono text-lg">
                    {tenderSummary.salesBreakdown.totalCanSales.toLocaleString()}L
                  </div>
                  <div className="text-gray-600">Can Sales</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-600 font-mono text-lg">
                    Rs. {(tenderSummary.salesBreakdown.oilSales?.totalAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-gray-600">Oil Sales ({tenderSummary.salesBreakdown.oilSales?.salesCount || 0})</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-600 font-mono text-lg font-bold">
                    {tenderSummary.salesBreakdown.totalLitres.toLocaleString()}L
                  </div>
                  <div className="text-gray-600">Total Fuel</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sales (Calculated):</span>
                <span className="font-mono font-semibold">
                  Rs. {(tenderSummary?.totalSales ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Declared:</span>
                <span className="font-mono font-semibold">
                  Rs. {(tenderSummary?.totalDeclared ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variance:</span>
                <span className={`font-mono font-semibold ${
                  (tenderSummary?.variance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  Rs. {(tenderSummary?.variance ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Tolerance:</span>
                <span className="font-mono">
                  Rs. {(tenderSummary?.varianceClassification?.tolerance ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Variance %:</span>
                <span className="font-mono">
                  {(tenderSummary?.varianceClassification?.variancePercentage ?? 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge 
                  variant={tenderSummary?.varianceClassification?.isNormal ? "success" : "destructive"}
                >
                  {tenderSummary?.varianceClassification?.isNormal ? 'Normal' : 'Suspicious'}
                </Badge>
              </div>
            </div>
          </div>
        </FormCard>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button 
          onClick={handleCloseShiftAndPrint}
          disabled={loading || !selectedShift || !Array.isArray(assignments) || assignments.some(a => !a.endMeterReading)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Printer className="h-4 w-4 mr-2" />
          {loading ? 'Closing...' : 'Close Shift & Print'}
        </Button>
      </div>
    </div>
  )
}
