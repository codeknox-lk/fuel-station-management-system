'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  pumperId: string
  pumperName: string
  startMeterReading: number
}

export default function OpenShiftPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [assignments, setAssignments] = useState<Assignment[]>([])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, templatesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/shift-templates?active=true')
        ])
        
        const stationsData = await stationsRes.json()
        const templatesData = await templatesRes.json()
        
        setStations(stationsData)
        setShiftTemplates(templatesData)
      } catch (err) {
        setError('Failed to load data')
      }
    }
    
    loadData()
  }, [])

  // Load nozzles and pumpers when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadStationData = async () => {
        try {
          const [nozzlesRes, pumpersRes] = await Promise.all([
            fetch(`/api/tanks?stationId=${selectedStation}&type=nozzles`),
            fetch(`/api/pumpers?stationId=${selectedStation}&active=true`)
          ])
          
          const nozzlesData = await nozzlesRes.json()
          const pumpersData = await pumpersRes.json()
          
          setNozzles(nozzlesData)
          setPumpers(pumpersData)
          
          // Reset assignments when station changes
          setAssignments([])
        } catch (err) {
          setError('Failed to load station data')
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
    if (!selectedStation || !selectedTemplate || assignments.length === 0) {
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

    try {
      // Create shift
      const shiftRes = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          templateId: selectedTemplate,
          startTime: startTime.toISOString(),
          openedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!shiftRes.ok) {
        throw new Error('Failed to create shift')
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

      router.push('/shifts')
    } catch (err) {
      setError('Failed to open shift')
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
          <span className="font-medium">{value as string}</span>
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Shift Details" description="Configure the shift parameters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label htmlFor="template">Shift Template *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
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
            <Label htmlFor="startTime">Start Time *</Label>
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
                  {availableNozzles.map((nozzle) => (
                    <SelectItem key={nozzle.id} value={nozzle.id}>
                      {nozzle.nozzleNumber} - {nozzle.fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={availableNozzles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          }
        >
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No assignments added yet</p>
              <p className="text-sm">Add nozzles and assign pumpers to start the shift</p>
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
          disabled={loading || !selectedStation || !selectedTemplate || assignments.length === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'Opening...' : 'Open Shift'}
        </Button>
      </div>
    </div>
  )
}
