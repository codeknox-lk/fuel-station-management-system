'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStation } from '@/contexts/StationContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { Clock, CheckCircle2 } from 'lucide-react'
import { PrintHeader } from '@/components/PrintHeader'

// Core Modular Components
import { PumperBreakdownCard } from './components/PumperBreakdownCard'
import { MeterReadingSection } from './components/MeterReadingSection'
import { ShopSalesSection } from './components/ShopSalesSection'
import { ShiftClosingSkeleton } from './components/ShiftClosingSkeleton'

// Hooks and Utilities
import { useShiftDraft } from './hooks/useShiftDraft'
import { useShiftData } from './hooks/useShiftData'
import { calculateBreakdowns } from './utils/calculations'
import {
  PumperCheque, POSSlipEntry
} from './types'

export default function CloseShiftPage() {
  const router = useRouter()
  const { selectedStation } = useStation()

  // Primary State
  const [selectedShift, setSelectedShift] = useState('')
  const [endTime, setEndTime] = useState(new Date())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Draft persistence using custom hook
  const [pumperDeclaredCash, setPumperDeclaredCash] = useShiftDraft<Record<string, number>>('shift-cash', {})
  const [shopClosingStocks, setShopClosingStocks] = useShiftDraft<Record<string, number>>('shift-shop-stock', {})
  const [posSlips, setPosSlips] = useShiftDraft<Record<string, POSSlipEntry[]>>('shift-pos-slips', {})
  const [pumperDeclaredCreditAmounts] = useShiftDraft<Record<string, Record<string, number>>>('shift-credit', {})
  const [pumperDeclaredCheques] = useShiftDraft<Record<string, PumperCheque[]>>('shift-cheques', {})

  // Data fetching hook (optimized with batching)
  const {
    shifts, assignments,
    shopAssignment,
    prices, loading: dataLoading, setAssignments
  } = useShiftData(selectedStation, selectedShift)

  // Derived state: Breakdown calculations
  const pumperBreakdowns = useMemo(() => {
    if (!selectedShift || (assignments.length === 0 && !shopAssignment)) return []
    return calculateBreakdowns({
      assignments,
      shopAssignment,
      shopClosingStocks,
      pumperDeclaredCash,
      posSlips,
      pumperDeclaredCreditAmounts,
      pumperDeclaredCheques,
      prices
    })
  }, [selectedShift, assignments, shopAssignment, shopClosingStocks, pumperDeclaredCash, posSlips, pumperDeclaredCreditAmounts, pumperDeclaredCheques, prices])

  // UI State
  const [posVerificationOpen, setPosVerificationOpen] = useState<Record<string, boolean>>({})
  const [minimizedPOSSlips, setMinimizedPOSSlips] = useState<Record<string, boolean>>({})

  // Event Handlers
  const handleUpdateAssignment = useCallback((nozzleId: string, reading: number) => {
    setAssignments(prev => prev.map(a => a.nozzleId === nozzleId ? { ...a, endMeterReading: reading } : a))
  }, [setAssignments])

  const handleUpdateShopStock = useCallback((itemId: string, stock: number) => {
    setShopClosingStocks(prev => ({ ...prev, [itemId]: stock }))
  }, [setShopClosingStocks])

  const handleUpdateCash = useCallback((pumperName: string, value: number) => {
    setPumperDeclaredCash(prev => ({ ...prev, [pumperName]: value }))
  }, [setPumperDeclaredCash])

  const handleAddPOSSlip = (pumperName: string) => {
    const newSlip: POSSlipEntry = {
      id: crypto.randomUUID(),
      terminalId: '',
      amount: 0,
      lastFourDigits: '',
      cardType: 'VISA',
      timestamp: new Date()
    }
    setPosSlips(prev => ({ ...prev, [pumperName]: [...(prev[pumperName] || []), newSlip] }))
  }

  const handleRemovePOSSlip = (pumperName: string, slipId: string) => {
    setPosSlips(prev => ({ ...prev, [pumperName]: (prev[pumperName] || []).filter(s => s.id !== slipId) }))
  }

  const handleUpdatePOSSlip = <K extends keyof POSSlipEntry>(
    pumperName: string,
    slipId: string,
    field: K,
    value: POSSlipEntry[K]
  ) => {
    setPosSlips(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).map(s => s.id === slipId ? { ...s, [field]: value } : s)
    }))
  }

  const handleSubmit = async () => {
    if (!selectedShift) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/shifts/${selectedShift}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime,
          assignments,
          shopAssignment,
          pumperBreakdowns,
          shopClosingStocks
        })
      })

      if (res.ok) {
        setSuccess('Shift closed successfully!')
        localStorage.removeItem('shift-cash') // Clear drafts on success
        setTimeout(() => router.push('/shifts'), 2000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to close shift')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedStation) {
    return (
      <div className="p-12 text-center bg-muted/20 rounded-2xl border-2 border-dashed">
        <h3 className="text-xl font-bold text-foreground">Station Required</h3>
        <p className="text-muted-foreground mt-2">Please select a station from the header to begin shift closure.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <PrintHeader title="Shift Closure Report" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Close Shift</h1>
          <p className="text-muted-foreground mt-2 text-lg">Finalize meter readings and pumper settlements.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="space-y-1.5 w-full sm:w-64">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Active Shift</Label>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select shift..." />
              </SelectTrigger>
              <SelectContent>
                {shifts.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    Shift {s.shiftNumber} - {s.pumperName || 'Draft'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-full sm:w-48">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Closing Time</Label>
            <DateTimePicker value={endTime} onChange={(d) => d && setEndTime(d)} />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-2">
          <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-500/10 text-green-600 border-2">
          <CheckCircle2 className="h-5 w-5" />
          <AlertDescription className="text-sm font-bold">{success}</AlertDescription>
        </Alert>
      )}

      {!selectedShift ? (
        <div className="p-20 text-center bg-muted/10 rounded-3xl border border-dashed border-border flex flex-col items-center">
          <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground">Select a shift to load assignment data</h3>
        </div>
      ) : dataLoading ? (
        <ShiftClosingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <MeterReadingSection assignments={assignments} onUpdateReading={handleUpdateAssignment} />

            {shopAssignment && (
              <ShopSalesSection
                shopAssignment={shopAssignment}
                closingStocks={shopClosingStocks}
                onUpdateClosingStock={handleUpdateShopStock}
              />
            )}

            <div className="hidden lg:block pt-4">
              <Button
                onClick={handleSubmit}
                className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Complete Shift Closure'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <div className="h-8 w-1.5 bg-orange-600 rounded-full" />
              Pumper Settlement
            </h2>
            {pumperBreakdowns.map(breakdown => (
              <PumperBreakdownCard
                key={breakdown.pumperName}
                breakdown={breakdown}
                posSlips={posSlips[breakdown.pumperName] || []}
                posVerificationOpen={posVerificationOpen[breakdown.pumperName] || false}
                minimizedPOSSlips={minimizedPOSSlips}
                duplicateCardErrors={{}}
                onUpdateCash={(val) => handleUpdateCash(breakdown.pumperName, val)}
                onTogglePOS={() => setPosVerificationOpen(prev => ({ ...prev, [breakdown.pumperName]: !prev[breakdown.pumperName] }))}
                onAddPOSSlip={() => handleAddPOSSlip(breakdown.pumperName)}
                onRemovePOSSlip={(id) => handleRemovePOSSlip(breakdown.pumperName, id)}
                onUpdatePOSSlip={(id, field, val) => handleUpdatePOSSlip(breakdown.pumperName, id, field, val)}
                onMinimizePOSSlip={(id) => setMinimizedPOSSlips(prev => ({ ...prev, [id]: true }))}
                onExpandPOSSlip={(id) => setMinimizedPOSSlips(prev => ({ ...prev, [id]: false }))}
                isPOSSlipComplete={(slip) => !!(slip.amount > 0 && slip.terminalId)}
              />
            ))}

            <div className="lg:hidden pt-4">
              <Button
                onClick={handleSubmit}
                className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Complete Shift Closure'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
