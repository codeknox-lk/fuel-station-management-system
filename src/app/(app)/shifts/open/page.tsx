'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStation } from '@/contexts/StationContext'
import { auditLogger } from '@/lib/auditLogger'
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
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Fuel, User, Plus } from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  duration: number
}

interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  fuelType: string
  pumpNumber: string
}

interface Pumper {
  id: string
  name: string
  employeeId: string
  status: string
  shift: string
  experience: number
  rating: number
}

interface Assignment {
  nozzleId: string
  nozzleNumber: string
  fuelType: string
  pumpNumber: string
  pumperId: string
  pumperName: string
  startMeterReading: number
}

export default function OpenShiftPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [unavailableNozzles, setUnavailableNozzles] = useState<Nozzle[]>([])
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [assignments, setAssignments] = useState<Assignment[]>([])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading stations and templates...')
        const [stationsRes, templatesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/shift-templates?active=true')
        ])
        
        console.log('Stations response:', stationsRes.status)
        console.log('Templates response:', templatesRes.status)
        
        if (!stationsRes.ok) {
          throw new Error(`Stations API error: ${stationsRes.status}`)
        }
        if (!templatesRes.ok) {
          throw new Error(`Templates API error: ${templatesRes.status}`)
        }
        
        const stationsData = await stationsRes.json()
        const templatesData = await templatesRes.json()
        
        console.log('Stations data:', stationsData)
        console.log('Templates data:', templatesData)
        
        setStations(stationsData)
        setShiftTemplates(templatesData)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    
    loadData()
  }, [])

  // Load nozzles and pumpers when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadStationData = async () => {
        try {
          console.log('Loading data for station:', selectedStation)
          const [nozzlesRes, pumpersRes, activeShiftsRes] = await Promise.all([
            fetch(`/api/tanks?stationId=${selectedStation}&type=nozzles`),
            fetch(`/api/pumpers?stationId=${selectedStation}&active=true`),
            fetch(`/api/shifts?stationId=${selectedStation}&active=true`)
          ])
          
          console.log('Nozzles response:', nozzlesRes.status)
          console.log('Pumpers response:', pumpersRes.status)
          console.log('Active shifts response:', activeShiftsRes.status)
          
          if (!nozzlesRes.ok) {
            throw new Error(`Nozzles API error: ${nozzlesRes.status}`)
          }
          if (!pumpersRes.ok) {
            throw new Error(`Pumpers API error: ${pumpersRes.status}`)
          }
          if (!activeShiftsRes.ok) {
            throw new Error(`Active shifts API error: ${activeShiftsRes.status}`)
          }
          
          const nozzlesData = await nozzlesRes.json()
          const pumpersData = await pumpersRes.json()
          const activeShiftsData = await activeShiftsRes.json()
          
          console.log('Nozzles data:', nozzlesData)
          console.log('Pumpers data:', pumpersData)
          console.log('Active shifts data:', activeShiftsData)
          
          // Get all assigned nozzle IDs from active shifts
          const assignedNozzleIds = new Set<string>()
          if (activeShiftsData.shifts && Array.isArray(activeShiftsData.shifts)) {
            for (const shift of activeShiftsData.shifts) {
              if (shift.assignments && Array.isArray(shift.assignments)) {
                for (const assignment of shift.assignments) {
                  if (assignment.nozzleId) {
                    assignedNozzleIds.add(assignment.nozzleId)
                  }
                }
              }
            }
          }
          
          console.log('Assigned nozzle IDs:', Array.from(assignedNozzleIds))
          
          // Filter out already assigned nozzles
          const availableNozzles = nozzlesData.filter((nozzle: Nozzle) => 
            !assignedNozzleIds.has(nozzle.id)
          )
          
          const unavailableNozzles = nozzlesData.filter((nozzle: Nozzle) => 
            assignedNozzleIds.has(nozzle.id)
          )
          
          console.log('Available nozzles:', availableNozzles)
          console.log('Unavailable nozzles:', unavailableNozzles)
          
          setNozzles(availableNozzles)
          setUnavailableNozzles(unavailableNozzles)
          setPumpers(pumpersData)
          
          // Reset assignments when station changes
          setAssignments([])
        } catch (err) {
          console.error('Error loading station data:', err)
          setError(`Failed to load station data: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
      
      loadStationData()
    }
  }, [selectedStation])

  const handleAddAssignment = (nozzleId: string) => {
    const nozzle = nozzles.find(n => n.id === nozzleId)
    if (!nozzle) return

    const newAssignment: Assignment = {
      nozzleId,
      nozzleNumber: nozzle.nozzleNumber,
      fuelType: nozzle.fuelType,
      pumpNumber: nozzle.pumpNumber,
      pumperId: '',
      pumperName: '',
      startMeterReading: 0
    }

    setAssignments(prev => [...prev, newAssignment])
  }

  const handleUpdateAssignment = (nozzleId: string, field: keyof Assignment, value: string | number) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.nozzleId === nozzleId 
          ? { ...assignment, [field]: value }
          : assignment
      )
    )
  }

  const handleRemoveAssignment = (nozzleId: string) => {
    setAssignments(prev => prev.filter(a => a.nozzleId !== nozzleId))
  }

  const handleOpenShift = async () => {
    if (!selectedTemplate || assignments.length === 0) {
      setError('Please fill in all required fields and add at least one assignment')
      return
    }

    // Validate that all assignments have pumpers selected
    const incompleteAssignments = assignments.filter(a => !a.pumperId || !a.pumperName)
    if (incompleteAssignments.length > 0) {
      setError('Please select a pumper for all nozzle assignments')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Create shift
      const shiftData = {
        stationId: selectedStation,
        templateId: selectedTemplate,
        startTime: startTime.toISOString(),
        openedBy: 'Current User' // In real app, get from auth context
      }
      
      console.log('Creating shift with data:', shiftData)
      
      const shiftRes = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      })

      if (!shiftRes.ok) {
        const errorData = await shiftRes.json()
        console.error('Shift creation error:', errorData)
        
        // Handle specific error cases with user-friendly messages
        if (errorData.error === 'Another shift is already active at this station') {
          throw new Error('There is already an open shift at this station. Please close the existing shift before opening a new one.')
        }
        
        // Handle validation errors
        if (errorData.error && errorData.error.includes('validation')) {
          throw new Error(`Please check your input: ${errorData.error}`)
        }
        
        throw new Error(`Failed to create shift: ${errorData.error || 'Unknown error'}`)
      }

      const shift = await shiftRes.json()

      // Get station and template names for audit logging
      const station = stations.find(s => s.id === selectedStation)
      const template = shiftTemplates.find(t => t.id === selectedTemplate)

      // Log shift creation
      if (station && template) {
        await auditLogger.logShiftCreated(shift.id, station.id, station.name, template.name)
      }

      // Create assignments
      for (const assignment of assignments) {
        const assignRes = await fetch(`/api/shifts/${shift.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nozzleId: assignment.nozzleId,
            pumperId: assignment.pumperId,
            pumperName: assignment.pumperName,
            startMeterReading: assignment.startMeterReading
          })
        })

        // Log pumper assignment
        if (assignRes.ok && station) {
          const assignData = await assignRes.json()
          await auditLogger.logPumperAssigned(
            assignData.id, 
            assignment.pumperName, 
            assignment.nozzleId, 
            station.id, 
            station.name
          )
        }
      }

      setSuccess('Shift created successfully! Redirecting to shifts page...')
      setTimeout(() => {
        router.push('/shifts')
      }, 1500)
    } catch (err) {
      console.error('Shift creation failed:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to open shift. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const availableNozzles = nozzles.filter(nozzle => 
    !assignments.some(assignment => assignment.nozzleId === nozzle.id)
  )

  const assignmentColumns = [
    {
      key: 'nozzleNumber' as keyof Assignment,
      title: 'Nozzle',
      render: (value: unknown, row: Assignment) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{row.pumpNumber} {value as string}</span>
          <Badge variant="outline">{row.fuelType}</Badge>
        </div>
      )
    },
    {
      key: 'pumperName' as keyof Assignment,
      title: 'Pumper',
      render: (value: unknown, row: Assignment) => {
        const selectedPumper = pumpers.find(p => p.id === row.pumperId)
        return (
          <Select
            value={row.pumperId}
            onValueChange={(pumperId) => {
              const pumper = pumpers.find(p => p.id === pumperId)
              handleUpdateAssignment(row.nozzleId, 'pumperId', pumperId)
              handleUpdateAssignment(row.nozzleId, 'pumperName', pumper?.name || '')
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select pumper">
                {selectedPumper && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{selectedPumper.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {selectedPumper.experience}y exp
                    </Badge>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pumpers.map((pumper) => (
                <SelectItem key={pumper.id} value={pumper.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">{pumper.name}</span>
                      <span className="text-xs text-gray-500">
                        {pumper.employeeId} • {pumper.experience}y exp • ⭐{pumper.rating}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
    },
    {
      key: 'startMeterReading' as keyof Assignment,
      title: 'Start Meter',
      render: (value: unknown, row: Assignment) => (
        <Input
          id={`meter-${row.nozzleId}`}
          type="number"
          value={value as number}
          onChange={(e) => handleUpdateAssignment(row.nozzleId, 'startMeterReading', parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-full"
        />
      )
    },
    {
      key: 'actions' as keyof Assignment,
      title: 'Actions',
      render: (value: unknown, row: Assignment) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleRemoveAssignment(row.nozzleId)}
        >
          Remove
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Open Shift</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error}</span>
              {error.includes('already an open shift') && (
                <Link href="/shifts/close">
                  <Button variant="outline" size="sm" className="ml-4">
                    Close Existing Shift
                  </Button>
                </Link>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <FormCard title="Shift Details" description="Configure the shift parameters">
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
            <Label htmlFor="template">Shift Template *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {shiftTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.startTime} - {template.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Time *</Label>
            <DateTimePicker
              value={startTime}
              onChange={(date) => setStartTime(date || new Date())}
              placeholder="Select start time"
            />
          </div>
        </div>
      </FormCard>

      {selectedStation && (
        <FormCard 
          title="Nozzle Assignments" 
          description="Assign pumpers to nozzles and set start meter readings"
          actions={
            <div className="flex items-center gap-2">
              <Select onValueChange={handleAddAssignment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Add nozzle" />
                </SelectTrigger>
                <SelectContent>
                  {nozzles.map((nozzle) => (
                    <SelectItem key={nozzle.id} value={nozzle.id}>
                      {nozzle.pumpNumber} {nozzle.nozzleNumber} - {nozzle.fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={nozzles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          }
        >
          {/* Show unavailable nozzles info */}
          {unavailableNozzles.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    {unavailableNozzles.length} nozzle{unavailableNozzles.length > 1 ? 's' : ''} currently in use:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {unavailableNozzles.map((nozzle) => (
                      <Badge key={nozzle.id} variant="outline" className="text-amber-700 border-amber-300">
                        {nozzle.pumpNumber} {nozzle.nozzleNumber} - {nozzle.fuelType}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    These nozzles are assigned to active shifts and cannot be used for new assignments.
                  </p>
                </div>
              </div>
            </div>
          )}
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              {nozzles.length === 0 ? (
                <>
                  <p>No nozzles available for assignment</p>
                  <p className="text-sm">All nozzles are currently in use by active shifts</p>
                </>
              ) : (
                <>
                  <p>No assignments added yet</p>
                  <p className="text-sm">Add nozzles and assign pumpers to start the shift</p>
                </>
              )}
            </div>
          ) : (
            <DataTable
              data={assignments}
              columns={assignmentColumns}
              searchable={false}
              pagination={false}
            />
          )}
        </FormCard>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button 
          onClick={handleOpenShift}
          disabled={loading || !selectedTemplate || assignments.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'Opening...' : 'Open Shift'}
        </Button>
      </div>
    </div>
  )
}
