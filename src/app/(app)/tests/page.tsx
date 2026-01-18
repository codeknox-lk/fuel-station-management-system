'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { NumberInput } from '@/components/inputs/NumberInput'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Beaker,
  Fuel,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  FileText,
  XCircle,
  RefreshCw,
} from 'lucide-react'

interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  fuelType: string
  pumpNumber?: string
}

interface TestPour {
  id: string
  nozzleId: string
  timestamp?: string
  amount?: number
  litres?: number
  notes?: string
  testedBy?: string
  performedBy?: string
  status?: 'PASS' | 'FAIL' | 'PENDING'
  testType?: string
  returned?: boolean
  shift?: {
    id: string
    startTime: string
    status: string
  } | null
  nozzle?: {
    id: string
    nozzleNumber: string
    pump?: {
      pumpNumber: string
    }
    tank?: {
      fuelType: string
    }
  }
}

export default function TestsPage() {
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [tests, setTests] = useState<TestPour[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTest, setSelectedTest] = useState<TestPour | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { selectedStation } = useStation()
  const [selectedNozzle, setSelectedNozzle] = useState('')
  const [testTime, setTestTime] = useState<Date>(new Date())
  const [litres, setLitres] = useState(5)
  const [testedBy, setTestedBy] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [fuelReturned, setFuelReturned] = useState(true) // Default to returned

  // Load nozzles when station changes
  useEffect(() => {
    const loadNozzles = async () => {
      if (!selectedStation) {
        setNozzles([])
        setSelectedNozzle('')
        return
      }

      try {
        const res = await fetch(`/api/tanks?type=nozzles&stationId=${selectedStation}`)
        if (!res.ok) {
          setError('Failed to load nozzles')
          return
        }

        const nozzlesData = await res.json()
        if (Array.isArray(nozzlesData)) {
          const transformed = nozzlesData.map((nozzle: any) => ({
            id: nozzle.id,
            pumpId: nozzle.pumpId,
            tankId: nozzle.tankId,
            nozzleNumber: nozzle.nozzleNumber,
            fuelType: nozzle.tank?.fuelType || nozzle.fuelType || 'Unknown',
            pumpNumber: nozzle.pump?.pumpNumber || nozzle.pumpNumber || '?',
          }))
          setNozzles(transformed)
        }
      } catch (err) {
        console.error('Error loading nozzles:', err)
        setError('Failed to load nozzles')
      }
    }

    loadNozzles()
  }, [selectedStation])

  // Load tests function
  const loadTests = async () => {
    try {
      const res = await fetch('/api/tests')
      if (res.ok) {
        const testsData = await res.json()
        setTests(Array.isArray(testsData) ? testsData : [])
      }
    } catch (err) {
      console.error('Error loading tests:', err)
    }
  }

  // Load tests on mount and when page gains focus
  useEffect(() => {
    loadTests()

    // Refresh tests when page gains focus (e.g., when navigating back from closing a shift)
    const handleFocus = () => {
      loadTests()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleSubmitTest = async () => {
    if (!selectedStation || !selectedNozzle || !reason || !testedBy) {
      setError('Please fill in all required fields')
      return
    }

    // Warn if fuel not returned (tank level will decrease)
    if (!fuelReturned && !confirm('⚠️ Warning: Fuel will NOT be returned to tank. Tank level will decrease. Continue?')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          nozzleId: selectedNozzle,
          testTime: testTime.toISOString(),
          litres,
          reason,
          notes: notes || undefined,
          testedBy,
          returned: fuelReturned,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('❌ API Error Response:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to record test')
      }

      // Reload tests
      const testsRes = await fetch('/api/tests')
      if (testsRes.ok) {
        const testsData = await testsRes.json()
        setTests(Array.isArray(testsData) ? testsData : [])
      }

      setSuccess(fuelReturned 
        ? 'Test pour recorded! Fuel returned to tank.' 
        : 'Test pour recorded! Fuel discarded from tank.')

      setTimeout(() => setSuccess(''), 4000)

      // Reset form
      setSelectedNozzle('')
      setLitres(5)
      setReason('')
      setNotes('')
      setTestedBy('')
      setFuelReturned(true)
    } catch (err: any) {
      setError(err.message || 'Failed to record test')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test pour? Tank level will be adjusted accordingly.')) {
      return
    }

    try {
      const res = await fetch(`/api/tests?id=${testId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete test pour')
      }

      // Reload tests
      const testsRes = await fetch('/api/tests')
      if (testsRes.ok) {
        const testsData = await testsRes.json()
        setTests(Array.isArray(testsData) ? testsData : [])
      }

      setSuccess('Test pour deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to delete test pour')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Extract reason from notes
  const extractReason = (notes?: string | null): string => {
    if (!notes) return '-'
    const match = notes.match(/Reason:\s*([^\n\r]+)/i)
    if (match && match[1]) {
      return match[1].trim()
    }
    return '-'
  }

  const testColumns = [
    {
      key: 'timestamp' as keyof TestPour,
      title: 'Time',
      render: (_: unknown, row: TestPour) => {
        const timeValue = row.timestamp
        if (!timeValue) return '-'
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(timeValue).toLocaleString()}</span>
          </div>
        )
      },
    },
    {
      key: 'nozzle' as keyof TestPour,
      title: 'Nozzle',
      render: (_: unknown, row: TestPour) => {
        const nozzle = row.nozzle
        if (!nozzle) return '-'
        const display = `${nozzle.pump?.pumpNumber || '?'}-${nozzle.nozzleNumber}`
        const fuelType = nozzle.tank?.fuelType || 'UNKNOWN'
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {display}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {fuelType.replace(/_/g, ' ')}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'amount' as keyof TestPour,
      title: 'Litres',
      render: (_: unknown, row: TestPour) => {
        const amount = row.amount || row.litres || 0
        return <span className="font-medium">{amount}L</span>
      },
    },
    {
      key: 'testedBy' as keyof TestPour,
      title: 'Tested By',
      render: (_: unknown, row: TestPour) => row.testedBy || row.performedBy || '-',
    },
    {
      key: 'returned' as keyof TestPour,
      title: 'Status',
      render: (_: unknown, row: TestPour) => {
        const returned = row.returned
        return (
          <div className="flex items-center gap-2">
            {returned ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-green-700 font-medium">Returned</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-700 font-medium">Discarded</span>
              </>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions' as keyof TestPour,
      title: 'Actions',
      render: (_: unknown, row: TestPour) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteTest(row.id)
          }}
          className="text-red-600 dark:text-red-400 hover:text-red-700"
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Pours</h1>
          <p className="text-muted-foreground mt-1">
            Record and track fuel quality tests with tank level management
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTests}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <FormCard
        title="Record Test Pour"
        description="Document fuel quality tests and manage tank levels"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="nozzle">Nozzle *</Label>
            <Select value={selectedNozzle} onValueChange={setSelectedNozzle}>
              <SelectTrigger id="nozzle" aria-labelledby="nozzle-label">
                <SelectValue placeholder="Select nozzle" />
              </SelectTrigger>
              <SelectContent>
                {nozzles.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No nozzles available
                  </SelectItem>
                ) : (
                  nozzles.map((nozzle) => (
                    <SelectItem key={nozzle.id} value={nozzle.id}>
                      {nozzle.pumpNumber}-{nozzle.nozzleNumber} ({nozzle.fuelType.replace(/_/g, ' ')})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testTime">Test Time *</Label>
            <DateTimePicker
              id="testTime"
              value={testTime}
              onChange={setTestTime}
              aria-labelledby="testTime-label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="testedBy">Tested By *</Label>
            <Input
              id="testedBy"
              value={testedBy}
              onChange={(e) => setTestedBy(e.target.value)}
              placeholder="Enter tester name"
              aria-labelledby="testedBy-label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="litres">Litres *</Label>
            <NumberInput
              id="litres"
              value={litres}
              onChange={(value) => setLitres(value)}
              min={0}
              step={0.5}
              aria-labelledby="litres-label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" aria-labelledby="reason-label">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily_check">Daily Check</SelectItem>
                <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="calibration">Calibration</SelectItem>
                <SelectItem value="random_test">Random Test</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional additional notes"
              rows={3}
              aria-labelledby="notes-label"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted">
              <Checkbox
                id="fuelReturned"
                checked={fuelReturned}
                onCheckedChange={(checked) => setFuelReturned(checked as boolean)}
                aria-labelledby="fuelReturned-label"
              />
              <label
                htmlFor="fuelReturned"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Return fuel to tank
                <span className="block text-xs text-muted-foreground mt-1">
                  {fuelReturned 
                    ? '✅ Tank level will increase when test is recorded'
                    : '⚠️ Tank level will decrease - fuel discarded'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmitTest}
            disabled={loading || !selectedStation || !selectedNozzle || !reason || !testedBy}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? 'Recording...' : 'Record Test'}
          </Button>
        </div>
      </FormCard>

      <FormCard
        title="Recent Tests"
        description="Latest test pour records"
      >
        {tests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Beaker className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No tests recorded yet</p>
            <p className="text-sm">Record your first test pour above</p>
          </div>
        ) : (
          <DataTable
            data={tests}
            columns={testColumns}
            searchable={true}
            pagination={true}
            pageSize={10}
            onRowClick={(test) => {
              setSelectedTest(test as TestPour)
              setDialogOpen(true)
            }}
          />
        )}
      </FormCard>

      {/* Test Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Beaker className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Test Pour Details
            </DialogTitle>
            <DialogDescription>Complete information about this test pour</DialogDescription>
          </DialogHeader>

          {selectedTest && (
            <div className="space-y-6 mt-4">
              {/* Nozzle Information */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Nozzle Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nozzle</p>
                    <p className="font-medium">
                      {selectedTest.nozzle?.pump?.pumpNumber || '?'}-{selectedTest.nozzle?.nozzleNumber || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fuel Type</p>
                    <p className="font-medium">
                      {selectedTest.nozzle?.tank?.fuelType?.replace(/_/g, ' ') || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Information */}
              <div className="bg-blue-500/10 dark:bg-blue-500/20 p-4 rounded-lg">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Test Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Test Time</p>
                    <p className="font-medium">
                      {selectedTest.timestamp ? new Date(selectedTest.timestamp).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tested By</p>
                    <p className="font-medium">{selectedTest.testedBy || selectedTest.performedBy || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      {(selectedTest.amount || selectedTest.litres || 0).toFixed(2)}L
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Test Type</p>
                    <p className="font-medium">{selectedTest.testType || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">
                      {extractReason(selectedTest.notes) !== '-' 
                        ? extractReason(selectedTest.notes)
                        : selectedTest.notes || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Fuel Status
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedTest.returned ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="font-medium text-green-700">Returned to Tank</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="font-medium text-red-700">Discarded</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedTest.notes && extractReason(selectedTest.notes) !== selectedTest.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Additional Notes</p>
                  <p className="text-sm bg-card p-3 rounded border">
                    {selectedTest.notes.replace(/^Reason:\s*[^\n\r]+\s*/i, '').trim() || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
