'use client'

import { useState, useEffect } from 'react'
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
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { NumberInput } from '@/components/inputs/NumberInput'
import { Textarea } from '@/components/ui/textarea'
import { Beaker, Fuel, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  fuelType: string
}

interface TestPour {
  id: string
  stationId: string
  nozzleId: string
  testTime: string
  litres: number
  reason: string
  notes?: string
  testedBy: string
  status: 'PASS' | 'FAIL' | 'PENDING'
}

export default function TestsPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [tests, setTests] = useState<TestPour[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedNozzle, setSelectedNozzle] = useState('')
  const [testTime, setTestTime] = useState<Date>(new Date())
  const [litres, setLitres] = useState(5)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [testedBy, setTestedBy] = useState('')

  const presetLitres = [5, 10, 20, 50, 100]

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, testsRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/tests?limit=20')
        ])
        
        const stationsData = await stationsRes.json()
        const testsData = await testsRes.json()
        
        setStations(stationsData)
        setTests(testsData)
      } catch (err) {
        setError('Failed to load data')
      }
    }
    
    loadData()
  }, [])

  // Load nozzles when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadNozzles = async () => {
        try {
          const res = await fetch(`/api/tanks?stationId=${selectedStation}&type=nozzles`)
          const nozzlesData = await res.json()
          setNozzles(nozzlesData)
        } catch (err) {
          setError('Failed to load nozzles')
        }
      }
      
      loadNozzles()
    }
  }, [selectedStation])

  const handleSubmitTest = async () => {
    if (!selectedStation || !selectedNozzle || !reason || !testedBy) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

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
          testedBy
        })
      })

      if (!res.ok) {
        throw new Error('Failed to record test')
      }

      // Reload tests
      const testsRes = await fetch('/api/tests?limit=20')
      const testsData = await testsRes.json()
      setTests(testsData)

      setSuccess('Test pour recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)

      // Reset form
      setSelectedNozzle('')
      setLitres(5)
      setReason('')
      setNotes('')
    } catch (err) {
      setError('Failed to record test')
    } finally {
      setLoading(false)
    }
  }

  const testColumns = [
    {
      key: 'testTime' as keyof TestPour,
      title: 'Time',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      key: 'nozzleId' as keyof TestPour,
      title: 'Nozzle',
      render: (value: unknown) => {
        const nozzle = nozzles.find(n => n.id === value as string)
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{nozzle?.nozzleNumber || (value as string)}</span>
            {nozzle && <Badge variant="outline">{nozzle.fuelType}</Badge>}
          </div>
        )
      }
    },
    {
      key: 'litres' as keyof TestPour,
      title: 'Litres',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-blue-500" />
          <span className="font-mono font-semibold">{value as number}L</span>
        </div>
      )
    },
    {
      key: 'reason' as keyof TestPour,
      title: 'Reason',
      render: (value: unknown) => (
        <span className="text-sm">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof TestPour,
      title: 'Status',
      render: (value: unknown) => {
        const status = value as TestPour['status']
        return (
          <Badge 
            variant={
              status === 'PASS' ? 'default' : 
              status === 'FAIL' ? 'destructive' : 
              'secondary'
            }
            className="flex items-center gap-1"
          >
            {status === 'PASS' && <CheckCircle className="h-3 w-3" />}
            {status === 'FAIL' && <AlertTriangle className="h-3 w-3" />}
            {status}
          </Badge>
        )
      }
    },
    {
      key: 'testedBy' as keyof TestPour,
      title: 'Tested By',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    }
  ]

  const recentTests = tests.slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Beaker className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Test Pours</h1>
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

      <FormCard title="Record Test Pour" description="Document test pours for quality control">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station">Station *</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} - {station.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nozzle">Nozzle *</Label>
              <Select 
                value={selectedNozzle} 
                onValueChange={setSelectedNozzle}
                disabled={!selectedStation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select nozzle" />
                </SelectTrigger>
                <SelectContent>
                  {nozzles.map((nozzle) => (
                    <SelectItem key={nozzle.id} value={nozzle.id}>
                      {nozzle.nozzleNumber} - {nozzle.fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testTime">Test Time *</Label>
              <DateTimePicker
                value={testTime}
                onChange={(date) => setTestTime(date || new Date())}
                placeholder="Select test time"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testedBy">Tested By *</Label>
              <Input
                value={testedBy}
                onChange={(e) => setTestedBy(e.target.value)}
                placeholder="Enter tester name"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Litres *</Label>
              <div className="flex gap-2 flex-wrap">
                {presetLitres.map((preset) => (
                  <Button
                    key={preset}
                    variant={litres === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLitres(preset)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {preset}L
                  </Button>
                ))}
              </div>
              <div className="mt-2">
                <NumberInput
                  value={litres}
                  onChange={setLitres}
                  placeholder="Enter litres"
                  className="w-32"
                  min={0}
                  step={0.1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSubmitTest}
              disabled={loading || !selectedStation || !selectedNozzle || !reason || !testedBy}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Recording...' : 'Record Test'}
            </Button>
          </div>
        </div>
      </FormCard>

      <FormCard title="Recent Tests" description="Latest test pour records">
        {recentTests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Beaker className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tests recorded yet</p>
            <p className="text-sm">Record your first test pour above</p>
          </div>
        ) : (
          <DataTable
            data={recentTests}
            columns={testColumns}
            searchable={true}
            pagination={true}
            pageSize={10}
          />
        )}
      </FormCard>
    </div>
  )
}
