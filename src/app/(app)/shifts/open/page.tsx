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
import { Clock, Fuel, User, Plus, ShoppingBag } from 'lucide-react'
import { getCurrentUserName } from '@/lib/auth'
import { getNozzleShortName, getNozzleDisplayWithBadge } from '@/lib/nozzleUtils'

// Component for Start Meter Reading cell with last reading display
const StartMeterCell = ({
  row,
  value,
  onUpdate
}: {
  row: Assignment
  value: number
  onUpdate: (nozzleId: string, field: keyof Assignment, value: string | number) => void
}) => {
  const [lastReading, setLastReading] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch last end meter reading for this nozzle
    fetch(`/api/nozzles/${row.nozzleId}/last-reading`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.lastEndMeterReading === 'number') {
          setLastReading(data.lastEndMeterReading)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [row.nozzleId])

  const currentValue = value
  const hasMismatch = lastReading !== null && currentValue > 0 && Math.abs(currentValue - lastReading) > 50

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          id={`meter-${row.nozzleId}`}
          type="number"
          min="0"
          value={currentValue}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 0
            onUpdate(row.nozzleId, 'startMeterReading', newValue)
          }}
          placeholder="0"
          className={`w-full ${hasMismatch ? 'border-amber-300 bg-amber-50' : ''}`}
        />
        {!loading && lastReading !== null && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Last: {(lastReading || 0).toLocaleString()}
          </span>
        )}
      </div>
      {hasMismatch && (
        <p className="text-xs text-amber-600">
          ⚠️ Differs from last reading ({(lastReading || 0).toLocaleString()})
        </p>
      )}
    </div>
  )
}

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

interface Fuel {
  id: string
  code: string
  name: string
  icon?: string | null
}

// Unified Nozzle interface used for both API responses and state
interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  fuelId: string
  fuel?: Fuel
  pumpNumber: string
  // Optional tank prop for mapping
  tank?: { fuelId: string; fuel?: Fuel }
}

// Unified Pumper interface
interface Pumper {
  id: string
  name: string
  employeeId: string
  status: string
  shift?: string
  experience: number
  rating: number
}

interface Assignment {
  nozzleId: string
  nozzleNumber: string
  fuelId: string
  fuel?: Fuel
  pumpNumber: string
  pumperId: string
  pumperName: string
  startMeterReading: number
}

interface ShiftAssignment {
  id?: string
  nozzleId: string
  status?: string
  pumperName?: string
}

interface ActiveShift {
  id: string
  status: string
  assignments?: ShiftAssignment[]
}

export default function OpenShiftPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [nozzles, setNozzles] = useState<Nozzle[]>([])
  const [unavailableNozzles, setUnavailableNozzles] = useState<Nozzle[]>([])
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [activeNozzleIds, setActiveNozzleIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [assignments, setAssignments] = useState<Assignment[]>([])

  interface Product {
    id: string
    name: string
    sellingPrice: number
  }

  // Shop assignment state
  const [shopPumperId, setShopPumperId] = useState('')
  const [shopPumperName, setShopPumperName] = useState('')
  const [shopProducts, setShopProducts] = useState<Product[]>([])
  const [isShopActive, setIsShopActive] = useState(false)

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
      } catch (error: unknown) {
        console.error('Error loading data:', error)
        setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            fetch(`/api/shifts?active=true`) // Check ALL active shifts across all stations
          ])

          console.log('Nozzles response:', nozzlesRes.status)
          console.log('Pumpers response:', pumpersRes.status)
          console.log('Active shifts response:', activeShiftsRes.status)

          // Handle responses - gracefully handle errors without throwing
          let nozzlesData: Nozzle[] = []
          let pumpersData: Pumper[] = []
          let activeShiftsData: { shifts: ActiveShift[] } = { shifts: [] }

          if (!nozzlesRes.ok) {
            const errorData = await nozzlesRes.json().catch(() => ({}))
            console.error('Nozzles API error:', nozzlesRes.status, errorData)
            // Continue with empty array instead of throwing
            nozzlesData = []
          } else {
            const rawNozzlesData = await nozzlesRes.json()
            // Transform API response to flatten nested structure
            nozzlesData = rawNozzlesData.map((nozzle: {
              id: string
              pumpId: string
              tankId: string
              nozzleNumber: string
              fuelId?: string
              tank?: { fuelId: string; fuel?: { id: string; code?: string; name: string; icon?: string | null } }
              fuel?: { id: string; code?: string; name: string; icon?: string | null }
              pump?: { pumpNumber: string }
              pumpNumber?: string
            }) => ({
              id: nozzle.id,
              pumpId: nozzle.pumpId,
              tankId: nozzle.tankId,
              nozzleNumber: nozzle.nozzleNumber,
              fuelId: nozzle.tank?.fuelId || nozzle.fuelId || '',
              // Ensure fuel has all required properties for Fuel interface
              fuel: (nozzle.tank?.fuel || nozzle.fuel) ? {
                id: (nozzle.tank?.fuel || nozzle.fuel)!.id,
                code: (nozzle.tank?.fuel || nozzle.fuel)!.code || 'UNK', // Default code if missing
                name: (nozzle.tank?.fuel || nozzle.fuel)!.name,
                icon: (nozzle.tank?.fuel || nozzle.fuel)!.icon
              } : undefined,
              pumpNumber: nozzle.pump?.pumpNumber || nozzle.pumpNumber || '?'
            }))
          }

          if (!pumpersRes.ok) {
            const errorData = await pumpersRes.json().catch(() => ({}))
            console.error('Pumpers API error:', pumpersRes.status, errorData)
            // Continue with empty array instead of throwing
            pumpersData = []
          } else {
            pumpersData = await pumpersRes.json()
          }

          if (!activeShiftsRes.ok) {
            const errorData = await activeShiftsRes.json().catch(() => ({}))
            console.error('Active shifts API error:', activeShiftsRes.status, errorData)
            // Continue with empty array instead of throwing
            activeShiftsData = { shifts: [] }
          } else {
            activeShiftsData = await activeShiftsRes.json()
          }

          // Ensure we have arrays
          const nozzles = Array.isArray(nozzlesData) ? nozzlesData : []
          const pumpers = Array.isArray(pumpersData) ? pumpersData : []
          const activeShifts = activeShiftsData?.shifts || (Array.isArray(activeShiftsData) ? activeShiftsData : [])

          console.log('Nozzles data:', nozzles)
          console.log('Pumpers data:', pumpers)
          console.log('Active shifts data:', activeShifts)

          // Get all assigned nozzle IDs from ACTIVE assignments in active shifts
          // Check ALL active shifts across ALL stations, not just current station
          // Only nozzles with ACTIVE assignments should be excluded
          // CLOSED assignments mean the nozzle is available again
          const assignedNozzleIds = new Set<string>()
          if (Array.isArray(activeShifts)) {
            console.log('🔍 Checking', activeShifts.length, 'active shift(s)')
            for (const shift of activeShifts) {
              console.log('🔍 Shift:', shift.id, 'Status:', shift.status, 'Has assignments:', !!shift.assignments, 'Assignments type:', typeof shift.assignments, 'Is array:', Array.isArray(shift.assignments))

              // Only check OPEN shifts
              if (shift.status === 'OPEN') {
                let assignments = shift.assignments

                // If assignments are missing or empty, fetch them directly
                if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
                  console.log('⚠️ Assignments missing or empty, fetching directly from API...')
                  try {
                    const assignmentsRes = await fetch(`/api/shifts/${shift.id}/assignments`)
                    if (assignmentsRes.ok) {
                      const assignmentsData = await assignmentsRes.json()
                      assignments = Array.isArray(assignmentsData) ? assignmentsData : []
                      console.log('✅ Fetched', assignments.length, 'assignments directly from API')
                    }
                  } catch (err) {
                    console.error('❌ Error fetching assignments:', err)
                    assignments = []
                  }
                }

                if (assignments && Array.isArray(assignments) && assignments.length > 0) {
                  console.log('🔍 Shift has', assignments.length, 'assignments')
                  for (const assignment of assignments) {
                    console.log('🔍 Assignment:', {
                      id: assignment.id,
                      nozzleId: assignment.nozzleId,
                      status: assignment.status,
                      pumperName: assignment.pumperName
                    })

                    // Only exclude nozzles with ACTIVE assignments
                    // If status is not provided, assume ACTIVE (backward compatibility)
                    const assignmentStatus = assignment.status || 'ACTIVE'
                    if (assignment.nozzleId && assignmentStatus === 'ACTIVE') {
                      // Ensure we're using string IDs consistently
                      const nozzleId = String(assignment.nozzleId)
                      assignedNozzleIds.add(nozzleId)
                      console.log(`🔴 Found ACTIVE assignment: nozzleId=${nozzleId}, shift=${shift.id}, status=${assignmentStatus}`)
                    } else {
                      console.log(`⚠️ Skipping assignment: nozzleId=${assignment.nozzleId}, status=${assignmentStatus}`)
                    }
                  }
                } else {
                  console.log('⚠️ Shift has no assignments after fetch attempt')
                }
              } else {
                console.log('⚠️ Shift status is not OPEN:', shift.status)
              }
            }
          } else {
            console.log('⚠️ Active shifts is not an array:', activeShifts)
          }

          console.log('🔴 Total active nozzle IDs found:', assignedNozzleIds.size, Array.from(assignedNozzleIds))

          console.log('Assigned nozzle IDs (ACTIVE only):', Array.from(assignedNozzleIds))
          console.log('Total nozzles before filtering:', nozzles.length)
          console.log('All nozzle IDs:', nozzles.map(n => n.id))

          // Filter out already assigned nozzles (only those with ACTIVE assignments)
          const availableNozzles = nozzles.filter((nozzle: Nozzle) => {
            // Ensure we're comparing strings
            const nozzleId = String(nozzle.id)
            const isActive = assignedNozzleIds.has(nozzleId)
            if (isActive) {
              console.log(`❌ FILTERING OUT ACTIVE NOZZLE: ${nozzleId} - ${nozzle.pumpNumber}-${nozzle.nozzleNumber}`)
            } else {
              console.log(`✅ KEEPING AVAILABLE NOZZLE: ${nozzleId} - ${nozzle.pumpNumber}-${nozzle.nozzleNumber}`)
            }
            return !isActive
          })

          const unavailableNozzles = nozzles.filter((nozzle: Nozzle) =>
            assignedNozzleIds.has(nozzle.id)
          )

          console.log('✅ Available nozzles after filtering:', availableNozzles.length, availableNozzles.map(n => `${n.pumpNumber}-${n.nozzleNumber} (${n.id})`))
          console.log('❌ Unavailable nozzles:', unavailableNozzles.length, unavailableNozzles.map(n => `${n.pumpNumber}-${n.nozzleNumber} (${n.id})`))

          // CRITICAL: Store ONLY available nozzles for dropdown (filter out active ones)
          // This is the ONLY place we set nozzles state - it should ONLY contain available nozzles
          setNozzles(availableNozzles)
          setUnavailableNozzles(unavailableNozzles)
          setPumpers(pumpers)

          // Store assigned nozzle IDs for display message and validation
          setActiveNozzleIds(assignedNozzleIds)

          console.log('✅ State updated - nozzles state now has', availableNozzles.length, 'nozzles')

          // Reset assignments when station changes
          setAssignments([])

          // Clear any previous errors since we handled API errors gracefully
          setError('')
        } catch (err) {
          console.error('Error loading station data:', err)
          // Only set error if it's a critical error, not API failures (they're handled above)
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          // Don't show error if APIs failed gracefully - page will work with empty data
          if (!errorMessage.includes('API error')) {
            setError(`Failed to load station data: ${errorMessage}`)
          }
        }
      }

      loadStationData()

      // Load shop products for the station
      fetch(`/api/shop/products?stationId=${selectedStation}&isActive=true`)
        .then(res => res.json())
        .then(data => setShopProducts(data || []))
        .catch(err => console.error('Error loading shop products:', err))
    }
  }, [selectedStation])

  const handleAddAssignment = async (nozzleId: string) => {
    // Check if nozzle is active (in activeNozzleIds)
    if (activeNozzleIds.has(nozzleId)) {
      setError('This nozzle is already assigned to an active shift and cannot be used.')
      return
    }

    // Check if nozzle is already in unavailable list (active in another shift)
    const isUnavailable = unavailableNozzles.some(n => n.id === nozzleId)
    if (isUnavailable) {
      setError('This nozzle is already assigned to an active shift and cannot be used.')
      return
    }

    // Check if nozzle is already in current assignments
    const alreadyAssigned = assignments.some(a => a.nozzleId === nozzleId)
    if (alreadyAssigned) {
      setError('This nozzle is already added to the current assignments.')
      return
    }

    // Check if nozzle is in available nozzles list
    const nozzle = nozzles.find(n => n.id === nozzleId)
    if (!nozzle) {
      setError('Nozzle not found or not available.')
      return
    }

    // Real-time check: Verify nozzle is still available by checking active shifts
    try {
      const activeShiftsRes = await fetch('/api/shifts?active=true')
      if (activeShiftsRes.ok) {
        const activeShiftsData = await activeShiftsRes.json()
        const activeShifts = activeShiftsData?.shifts || []

        // Check if nozzle is assigned to any active shift
        for (const shift of activeShifts) {
          if (shift.status === 'OPEN' && shift.assignments && Array.isArray(shift.assignments)) {
            const isAssigned = shift.assignments.some((a: ShiftAssignment) =>
              a.nozzleId === nozzleId && (a.status === 'ACTIVE' || !a.status)
            )
            if (isAssigned) {
              setError('This nozzle is currently assigned to an active shift. Please refresh the page.')
              // Refresh the nozzle list
              const station = stations.find(s => s.id === selectedStation)
              if (station) {
                // Trigger a reload by clearing and reloading
                window.location.reload()
              }
              return
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking nozzle availability:', err)
      // Continue anyway, server will validate
    }

    // Fetch the last end meter reading for this nozzle
    let lastEndReading = 0
    try {
      const res = await fetch(`/api/nozzles/${nozzleId}/last-reading`)
      if (res.ok) {
        const data = await res.json()
        lastEndReading = data.lastEndMeterReading || 0
      }
    } catch (err) {
      console.error('Failed to fetch last meter reading:', err)
      // Continue with 0 if fetch fails
    }

    const newAssignment: Assignment = {
      nozzleId,
      nozzleNumber: nozzle.nozzleNumber,
      fuelId: nozzle.fuelId,
      fuel: nozzle.fuel,
      pumpNumber: nozzle.pumpNumber,
      pumperId: '',
      pumperName: '',
      startMeterReading: lastEndReading
    }

    setAssignments(prev => [...prev, newAssignment])
    setError('') // Clear any previous errors
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
    const assignment = assignments.find(a => a.nozzleId === nozzleId)
    if (assignment && confirm(`Remove assignment for ${assignment.nozzleNumber}?`)) {
      setAssignments(prev => prev.filter(a => a.nozzleId !== nozzleId))
    }
  }

  const handleOpenShift = async () => {
    // Check if either assignments exist OR shop pumper is selected
    const hasShopAssignment = shopPumperId && shopPumperId !== 'none'
    const hasNozzleAssignments = assignments.length > 0

    if (!selectedTemplate) {
      setError('Please select a shift template')
      return
    }

    if (!hasNozzleAssignments && !hasShopAssignment) {
      setError('Please either add nozzle assignments OR assign a shop pumper to open a shift')
      return
    }

    // Validate start time is not in the future
    const now = new Date()
    if (startTime > now) {
      setError('Start time cannot be in the future. Please select a valid start time.')
      return
    }

    // Validate start time is not too old (more than 7 days ago)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    if (startTime < sevenDaysAgo) {
      setError('Start time cannot be more than 7 days ago. Please select a recent start time.')
      return
    }

    // Validate that all assignments have pumpers selected (only if there are assignments)
    if (hasNozzleAssignments) {
      const incompleteAssignments = assignments.filter(a => !a.pumperId || !a.pumperName)
      if (incompleteAssignments.length > 0) {
        setError('Please select a pumper for all nozzle assignments')
        return
      }

      // Validate that all assignments have valid start meter readings
      const invalidMeterReadings = assignments.filter(a => !a.startMeterReading || a.startMeterReading < 0)
      if (invalidMeterReadings.length > 0) {
        setError('Please enter valid start meter readings for all assignments (must be >= 0)')
        return
      }
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
        openedBy: getCurrentUserName()
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
        try {
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

          if (!assignRes.ok) {
            const errorData = await assignRes.json().catch(() => ({}))
            const errorMessage = errorData.error || `Failed to create assignment: ${assignRes.status}`
            console.error(`Failed to create assignment for nozzle ${assignment.nozzleId}:`, assignRes.status, errorData)

            // If nozzle is already assigned, this is a critical error - stop everything
            if (errorMessage.includes('already assigned')) {
              const nozzleDisplay = getNozzleShortName({
                id: assignment.nozzleId,
                pumpNumber: assignment.pumpNumber,
                nozzleNumber: assignment.nozzleNumber,
                fuelType: assignment.fuel?.name || 'Unknown'
              })
              throw new Error(`${nozzleDisplay} is already assigned to an active shift. Please refresh the page to see updated nozzle availability.`)
            }

            throw new Error(errorMessage)
          }

          // Log pumper assignment
          if (station) {
            const assignData = await assignRes.json()
            // Format nozzle display name
            const nozzleDisplayName = getNozzleShortName({
              id: assignment.nozzleId,
              pumpNumber: assignment.pumpNumber,
              nozzleNumber: assignment.nozzleNumber,
              fuelType: assignment.fuel?.name || 'Unknown'
            })
            await auditLogger.logPumperAssigned(
              assignData.id,
              assignment.pumperName,
              nozzleDisplayName,
              station.id,
              station.name
            )
          }
        } catch (assignError) {
          console.error('Error creating assignment:', assignError)
          throw new Error(`Failed to create assignment: ${assignError instanceof Error ? assignError.message : 'Unknown error'}`)
        }
      }

      // Create Shop Assignment if selected
      if (shopPumperId && shopPumperId !== 'none') {
        try {
          const shopAssignRes = await fetch('/api/shop/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shiftId: shift.id,
              pumperId: shopPumperId,
              pumperName: shopPumperName,
              productIds: shopProducts.map(p => p.id)
            })
          })
          if (!shopAssignRes.ok) {
            console.error('Failed to create shop assignment')
          }
        } catch (err) {
          console.error('Error creating shop assignment:', err)
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



  const assignmentColumns = [
    {
      key: 'nozzleNumber' as keyof Assignment,
      title: 'Nozzle',
      render: (value: unknown, row: Assignment) => {
        const display = getNozzleDisplayWithBadge({
          id: row.nozzleId,
          pumpNumber: row.pumpNumber,
          nozzleNumber: row.nozzleNumber,
          fuelType: row.fuel?.name || 'Unknown'
        })
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{display.label}</span>
            <Badge variant="outline">{display.badge}</Badge>
          </div>
        )
      }
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
                    <User className="h-4 w-4 text-muted-foreground" />
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
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{pumper.name}</span>
                      <span className="text-xs text-muted-foreground">
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
        <StartMeterCell row={row} value={value as number} onUpdate={handleUpdateAssignment} />
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
        <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
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
        <Alert className="border-green-500/20 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/20">
          <AlertDescription className="text-green-700 dark:text-green-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <FormCard title="Shift Details" description="Configure the shift parameters">
        {/* Display current station */}
        <div className="mb-4 p-3 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 dark:border-orange-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-600 dark:bg-orange-400 rounded-full"></div>
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
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

        {/* Shop Assignment (Optional) */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <Label className="text-base font-semibold">Shop Assignment (Optional)</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopPumper">Assign Shop Pumper</Label>
              <Select
                value={shopPumperId}
                onValueChange={(val) => {
                  setShopPumperId(val)
                  setShopPumperName(pumpers.find(p => p.id === val)?.name || '')
                  setIsShopActive(!!val)
                }}
              >
                <SelectTrigger id="shopPumper">
                  <SelectValue placeholder="No pumper assigned (Shop Closed)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No pumper assigned (Shop Closed)</SelectItem>
                  {pumpers.map((pumper) => (
                    <SelectItem key={pumper.id} value={pumper.id}>
                      {pumper.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isShopActive && (
              <div className="p-3 bg-muted rounded-md flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tracking {shopProducts.length} shop products</p>
                  <p className="text-xs text-muted-foreground italic">Suggested stock will be based on last counts.</p>
                </div>
                <Badge className="bg-green-500">Shop Active</Badge>
              </div>
            )}
          </div>
        </div>
      </FormCard>

      {selectedStation ? (
        <FormCard
          title="Nozzle Assignments"
          description="Assign pumpers to nozzles and set start meter readings"
          actions={
            <div className="flex items-center gap-2">
              <Select
                onValueChange={handleAddAssignment}
                disabled={nozzles.length === 0}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={nozzles.length === 0 ? "No nozzles available" : "Add nozzle"} />
                </SelectTrigger>
                <SelectContent>
                  {nozzles.length > 0 ? (
                    nozzles.map((nozzle) => {
                      // Safety check: if somehow an active nozzle got through, log it and skip it
                      if (activeNozzleIds.has(nozzle.id)) {
                        console.error('🚨 ERROR: Active nozzle found in dropdown!', nozzle.id, nozzle.pumpNumber, nozzle.nozzleNumber)
                        return null
                      }

                      const displayName = getNozzleShortName({
                        id: nozzle.id,
                        pumpNumber: nozzle.pumpNumber,
                        nozzleNumber: nozzle.nozzleNumber,
                        fuelType: nozzle.fuel?.name || 'Unknown'
                      })
                      return (
                        <SelectItem key={nozzle.id} value={nozzle.id}>
                          {displayName}
                        </SelectItem>
                      )
                    }).filter(Boolean) // Remove any null entries from safety check
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No nozzles available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={nozzles.length === 0}
                onClick={() => {
                  if (nozzles.length > 0) {
                    handleAddAssignment(nozzles[0].id)
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          }
        >
          {/* Show active nozzles message */}
          {unavailableNozzles.length > 0 && (
            <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
              <span className="font-medium text-amber-900 dark:text-amber-200">Active nozzles:</span>{' '}
              <span className="text-amber-800 dark:text-amber-300">
                {unavailableNozzles.map((nozzle, index) => {
                  const displayName = getNozzleShortName({
                    id: nozzle.id,
                    pumpNumber: nozzle.pumpNumber,
                    nozzleNumber: nozzle.nozzleNumber,
                    fuelType: nozzle.fuel?.name || 'Unknown'
                  })
                  return (
                    <span key={nozzle.id}>
                      {index > 0 && ', '}
                      {displayName}
                    </span>
                  )
                })}
              </span>
            </div>
          )}
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
      ) : (
        <FormCard
          title="Nozzle Assignments"
          description="Please select a station to manage assignments"
        >
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p>No station selected</p>
            <p className="text-sm">Select a station from the top navigation to continue</p>
          </div>
        </FormCard>
      )}

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleOpenShift}
          disabled={loading || !selectedTemplate || (assignments.length === 0 && (!shopPumperId || shopPumperId === 'none'))}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {loading ? 'Opening...' : 'Open Shift'}
        </Button>
      </div>
    </div>
  )
}
