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
import { Clock, Fuel, DollarSign, CreditCard, FileText, Plus, Trash2, Printer, Wallet, ExternalLink, Building2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getCurrentUserName } from '@/lib/auth'
import { getNozzleDisplayWithBadge } from '@/lib/nozzleUtils'

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
  assignments?: Array<{
    pumperName: string
  }>
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

interface PosTerminal {
  id: string
  name: string
  terminalNumber: string
  bank?: {
    id: string
    name: string
  }
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

interface PumperCheque {
  id: string
  chequeNumber: string
  amount: number
  bankId?: string
  bankName?: string
  status?: 'PENDING' | 'CLEARED' | 'BOUNCED' // Cheque status
  receivedFrom: string // Person/company who gave the cheque
}

interface POSSlipEntry {
  id: string
  terminalId: string
  amount: number
  lastFourDigits: string
  cardType: 'VISA' | 'MASTER' | 'AMEX' | 'QR' | 'DIALOG_TOUCH'
  timestamp: Date
  notes?: string
}

interface MissingSlipEntry {
  id: string
  terminalId: string
  amount: number
  lastFourDigits: string
  timestamp: Date
  notes?: string
}

interface PumperExpense {
  id: string
  type: 'BANK_DEPOSIT' | 'LOAN_GIVEN' | 'OTHER'
  amount: number
  description?: string // For "OTHER" type
  // For BANK_DEPOSIT
  bankId?: string
  bankName?: string
  accountNumber?: string // Can be from bank or manually entered
  depositedBy?: string
  // For LOAN_GIVEN
  loanGivenTo?: string // Pumper ID who received the loan
  loanGivenToName?: string // Pumper name (for display)
  loanGivenBy?: string // Person who authorized/gave the loan
  monthlyRental?: number // Monthly rental amount to deduct from salary
}

interface PumperTestPour {
  id: string
  nozzleId: string
  nozzleNumber?: string
  pumpNumber?: string
  fuelType?: string
  amount: number // in liters
  reason: string // reason for test pour
  returned: boolean
  notes?: string
  timestamp?: Date
}

interface PumperBreakdown {
  pumperName: string
  calculatedSales: number
  declaredAmount: number
  declaredCash: number
  declaredCardAmounts: Record<string, number> // terminalId -> amount
  declaredCreditAmounts: Record<string, number> // customerId -> amount
  declaredCheque: number
  cheques: PumperCheque[]
  advanceTaken: number
  expenses: PumperExpense[]
  totalExpenses: number
  variance: number
  varianceStatus: 'NORMAL' | 'ADD_TO_SALARY' | 'DEDUCT_FROM_SALARY'
  assignments: Assignment[]
}

export default function CloseShiftPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [posTerminals, setPosTerminals] = useState<PosTerminal[]>([])
  const [creditCustomers, setCreditCustomers] = useState<Array<{ id: string; name: string; creditLimit: number; currentBalance: number }>>([])
  const [banks, setBanks] = useState<Array<{ id: string; name: string; branch?: string; accountNumber?: string }>>([])
  const [pumpers, setPumpers] = useState<Array<{ id: string; name: string; employeeId?: string; isActive?: boolean }>>([])
  const [nozzles, setNozzles] = useState<Array<{ id: string; nozzleNumber: string; pumpNumber?: string; fuelType?: string; pumpId?: string; tankId?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [selectedShift, setSelectedShift] = useState('')
  const [endTime, setEndTime] = useState<Date>(new Date())
  
  // Tender summary (calculated from pumper-wise data)
  const [tenderSummary, setTenderSummary] = useState<TenderSummary | null>(null)
  
  // Pumper-wise breakdown
  const [pumperDeclaredCash, setPumperDeclaredCash] = useState<Record<string, number>>({}) // pumperName -> cash amount
  const [pumperDeclaredCardAmounts, setPumperDeclaredCardAmounts] = useState<Record<string, Record<string, number>>>({}) // pumperName -> {terminalId -> amount}
  const [pumperDeclaredCreditAmounts, setPumperDeclaredCreditAmounts] = useState<Record<string, Record<string, number>>>({}) // pumperName -> {customerId -> amount}
  const [pumperDeclaredCheques, setPumperDeclaredCheques] = useState<Record<string, PumperCheque[]>>({}) // pumperName -> cheques array
  const [pumperAdvances, setPumperAdvances] = useState<Record<string, number>>({}) // pumperName -> advance amount
  const [otherPumperAdvances, setOtherPumperAdvances] = useState<Record<string, Array<{ pumperId: string; pumperName: string; amount: number }>>>({}) // pumperName -> array of advances given to other pumpers
  const [pumperExpenses, setPumperExpenses] = useState<Record<string, PumperExpense[]>>({}) // pumperName -> expenses array
  const [pumperTestPours, setPumperTestPours] = useState<Record<string, PumperTestPour[]>>({}) // pumperName -> test pours array
  const [pumperBreakdowns, setPumperBreakdowns] = useState<PumperBreakdown[]>([])
  
  // POS Terminal Verification (individual slips per pumper)
  const [posSlips, setPosSlips] = useState<Record<string, POSSlipEntry[]>>({}) // pumperName -> array of slips
  const [posVerificationOpen, setPosVerificationOpen] = useState<Record<string, boolean>>({}) // pumperName -> is open
  const [missingSlips, setMissingSlips] = useState<Record<string, MissingSlipEntry[]>>({}) // pumperName-terminalId -> missing slips array
  // Track duplicate card errors per slip
  const [duplicateCardErrors, setDuplicateCardErrors] = useState<Record<string, { cardNumber: string; duplicateSlip: POSSlipEntry }>>({}) // slipId -> error details
  // Track minimized slips
  const [minimizedPOSSlips, setMinimizedPOSSlips] = useState<Record<string, boolean>>({}) // slipId -> is minimized
  const [minimizedMissingSlips, setMinimizedMissingSlips] = useState<Record<string, boolean>>({}) // slipId -> is minimized
  
  // Add Bank Dialog State
  const [addBankDialogOpen, setAddBankDialogOpen] = useState(false)
  const [newBank, setNewBank] = useState({ name: '', branch: '', accountNumber: '' })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, customersRes, banksRes, pumpersRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/credit/customers?active=true'),
          fetch('/api/banks?active=true'),
          fetch('/api/pumpers?active=true&status=ACTIVE')
        ])
        
        if (!stationsRes.ok) {
          console.error('Failed to load stations:', stationsRes.status)
          setStations([])
        } else {
          const stationsData = await stationsRes.json()
          setStations(Array.isArray(stationsData) ? stationsData : [])
        }

        if (!customersRes.ok) {
          console.error('Failed to load credit customers:', customersRes.status)
          setCreditCustomers([])
        } else {
          const customersData = await customersRes.json()
          setCreditCustomers(Array.isArray(customersData) ? customersData : [])
        }
        
        if (!banksRes.ok) {
          console.error('Failed to load banks:', banksRes.status)
          setBanks([])
        } else {
          const banksData = await banksRes.json()
          setBanks(Array.isArray(banksData) ? banksData : [])
        }

        if (!pumpersRes.ok) {
          console.error('Failed to load pumpers:', pumpersRes.status)
          setPumpers([])
        } else {
          const pumpersData = await pumpersRes.json()
          setPumpers(Array.isArray(pumpersData) ? pumpersData : [])
        }
      } catch (err) {
        setError('Failed to load data')
      }
    }
    
    loadData()
  }, [])

  // Load POS terminals when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadPosTerminals = async () => {
        try {
          const res = await fetch(`/api/pos/terminals?stationId=${selectedStation}`)
          if (res.ok) {
            const terminalsData = await res.json()
            // Debug: Log to check if bank data is included
            if (Array.isArray(terminalsData) && terminalsData.length > 0) {
              console.log('POS Terminals loaded:', terminalsData.map((t: any) => ({ 
                id: t.id, 
                name: t.name, 
                terminalNumber: t.terminalNumber,
                bank: t.bank 
              })))
            }
            setPosTerminals(Array.isArray(terminalsData) ? terminalsData : [])
          } else {
            setPosTerminals([])
          }
        } catch (err) {
          console.error('Failed to load POS terminals:', err)
          setPosTerminals([])
        }
      }
      
      loadPosTerminals()
    } else {
      setPosTerminals([])
    }
  }, [selectedStation])

  // Load shifts when station changes
  useEffect(() => {
    if (selectedStation) {
      const loadShifts = async () => {
        try {
          const res = await fetch(`/api/shifts?stationId=${selectedStation}&active=true`)
          const shiftsData = await res.json()
          
          // Handle both old format (array) and new format (object with shifts property)
          let shiftsArray: any[] = []
          if (Array.isArray(shiftsData)) {
            shiftsArray = shiftsData
          } else if (shiftsData.shifts && Array.isArray(shiftsData.shifts)) {
            shiftsArray = shiftsData.shifts
          } else {
            shiftsArray = []
          }
          
          // Fetch assignments for each shift since they're not included in the initial response
          const shiftsWithAssignments = await Promise.all(
            shiftsArray.map(async (shift) => {
              try {
                const assignmentsRes = await fetch(`/api/shifts/${shift.id}/assignments`)
                if (assignmentsRes.ok) {
                  const assignments = await assignmentsRes.json()
                  return {
                    ...shift,
                    assignments: Array.isArray(assignments) ? assignments : []
                  }
                }
                return { ...shift, assignments: [] }
              } catch (err) {
                console.error(`Error fetching assignments for shift ${shift.id}:`, err)
                return { ...shift, assignments: [] }
              }
            })
          )
          
          setShifts(shiftsWithAssignments)
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
          setError('')
          const res = await fetch(`/api/shifts/${selectedShift}/assignments`)
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('Failed to load assignments:', res.status, errorData)
            setAssignments([])
            return
          }
          
          const assignmentsData = await res.json()
          console.log('Assignments API response:', assignmentsData)
          
          // Ensure assignmentsData is an array
          if (Array.isArray(assignmentsData)) {
            // Transform assignments to include nozzle info if not present
            const transformedAssignments = assignmentsData.map((assignment: any) => ({
              ...assignment,
              // Extract nozzle info from API response structure
              nozzle: assignment.nozzle || null
            }))
            setAssignments(transformedAssignments)
            
            // Also update the shift in the shifts array with assignments so dropdown shows pumper names
            setShifts(prevShifts => 
              prevShifts.map(shift => 
                shift.id === selectedShift 
                  ? { ...shift, assignments: transformedAssignments }
                  : shift
              )
            )
          } else {
            console.error('Assignments data is not an array:', assignmentsData)
            setAssignments([])
          }
        } catch (err) {
          console.error('Error loading assignments:', err)
          setError('Failed to load assignments')
          setAssignments([])
        }
      }
      
      loadAssignments()
    } else {
      setAssignments([])
    }
  }, [selectedShift])

  // Calculate pumper-wise breakdown
  useEffect(() => {
    if (selectedShift && assignments.length > 0 && selectedStation) {
      const calculatePumperBreakdown = async () => {
        try {
          // Get prices for fuel types
          const fuelTypes = [...new Set(assignments.map(a => a.nozzle?.tank?.fuelType).filter(Boolean))]
          const prices = await Promise.all(
            fuelTypes.map(async (fuelType) => {
              try {
                const res = await fetch(`/api/prices?stationId=${selectedStation}&fuelType=${fuelType}`)
                if (res.ok) {
                  const priceData = await res.json()
                  // API returns single price object when fuelType is specified
                  if (priceData && !Array.isArray(priceData) && priceData.price) {
                    return { fuelType, price: priceData.price }
                  }
                  // If array, get most recent active price
                  if (Array.isArray(priceData) && priceData.length > 0) {
                    const activePrices = priceData.filter((p: any) => p.isActive)
                      .sort((a: any, b: any) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                    return { fuelType, price: activePrices[0]?.price || 470 }
                  }
                }
              } catch (err) {
                console.error(`Error fetching price for ${fuelType}:`, err)
              }
              return { fuelType, price: 470 }
            })
          )
          const priceMap = Object.fromEntries(prices.map(p => [p.fuelType, p.price]))
          
          // Group assignments by pumper
          const pumperMap = new Map<string, Assignment[]>()
          assignments.forEach(assignment => {
            if (assignment.endMeterReading && assignment.pumperName) {
              if (!pumperMap.has(assignment.pumperName)) {
                pumperMap.set(assignment.pumperName, [])
              }
              pumperMap.get(assignment.pumperName)!.push(assignment)
            }
          })
          
          // Calculate sales per pumper
          const breakdowns: PumperBreakdown[] = []
          pumperMap.forEach((pumperAssignments, pumperName) => {
            let calculatedSales = 0
            
            pumperAssignments.forEach(assignment => {
              if (assignment.endMeterReading && assignment.startMeterReading) {
                const delta = Math.max(0, assignment.endMeterReading - assignment.startMeterReading)
                const canSales = assignment.canSales || 0
                const pumpSales = assignment.pumpSales || Math.max(0, delta - canSales)
                const fuelType = assignment.nozzle?.tank?.fuelType
                const price = fuelType ? (priceMap[fuelType] || 470) : 470
                calculatedSales += pumpSales * price
              }
            })
            
            const cash = pumperDeclaredCash[pumperName] || 0
            const creditAmounts = pumperDeclaredCreditAmounts[pumperName] || {}
            const cheques = pumperDeclaredCheques[pumperName] || []
            const cheque = cheques.reduce((sum, chq) => sum + chq.amount, 0)
            const advance = pumperAdvances[pumperName] || 0
            const expenses = pumperExpenses[pumperName] || []
            
            // Separate bank deposits from other expenses
            const bankDeposits = expenses.filter(exp => exp.type === 'BANK_DEPOSIT')
            const otherExpenses = expenses.filter(exp => exp.type !== 'BANK_DEPOSIT')
            const totalBankDeposits = bankDeposits.reduce((sum, exp) => sum + exp.amount, 0)
            const totalOtherExpenses = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0)
            
            // Calculate card total from POS slips instead of manual entry
            const pumperSlips = posSlips[pumperName] || []
            const totalCardFromSlips = pumperSlips.reduce((sum, slip) => {
              if (slip.terminalId && slip.amount > 0) {
                return sum + slip.amount
              }
              return sum
            }, 0)
            
            // Include missing slips in card total (they represent transactions that happened but slip wasn't provided)
            const key = `${pumperName}-unified`
            const pumperMissingSlips = missingSlips[key] || []
            const totalCardFromMissing = pumperMissingSlips.reduce((sum, slip) => {
              if (slip.terminalId && slip.amount > 0 && slip.lastFourDigits.length === 4) {
                return sum + slip.amount
              }
              return sum
            }, 0)
            
            // Total card amount = regular slips + missing slips
            const totalCard = totalCardFromSlips + totalCardFromMissing
            
            // Build card amounts map from slips for compatibility (include missing slips)
            const cardAmounts: Record<string, number> = {}
            pumperSlips.forEach(slip => {
              if (slip.terminalId && slip.amount > 0) {
                cardAmounts[slip.terminalId] = (cardAmounts[slip.terminalId] || 0) + slip.amount
              }
            })
            // Add missing slips to card amounts map
            pumperMissingSlips.forEach(slip => {
              if (slip.terminalId && slip.amount > 0 && slip.lastFourDigits.length === 4) {
                cardAmounts[slip.terminalId] = (cardAmounts[slip.terminalId] || 0) + slip.amount
              }
            })
            const totalCredit = Object.values(creditAmounts).reduce((sum, amount) => sum + amount, 0)
            
            // CORRECT LOGIC:
            // - Cash declared = FULL cash amount they received from sales (NOT already deducted)
            // - Advance is money taken FROM the cash declared (will be deducted from salary later, NOT from variance)
            // - Advance can ONLY come from cash, not from card/credit/cheque
            // - Bank deposits are cash that was deposited to bank (included in declared amount)
            // 
            // MATHEMATICAL LOGIC:
            // Cash Declared = Full cash received from sales (e.g., Rs. 20,100)
            // Advance Taken = Amount taken from cash (e.g., Rs. 10,000) - NOT part of variance!
            // Bank Deposits = Amount deposited from cash (e.g., Rs. 0) - included in declared
            // 
            // Example: 
            //   - Cash declared = Rs. 20,100 (FULL amount received)
            //   - Advance taken = Rs. 10,000 (taken from cash, will be deducted from salary)
            //   - Bank deposits = Rs. 0 (cash that was deposited, included in declared)
            //   - Cash actually handed over = 20,100 - 10,000 - 0 = Rs. 10,100
            // 
            // Total Declared Amount = Cash Declared + Card + Credit + Cheque + Bank Deposits
            //                       = Cash + Card + Credit + Cheque + Bank Deposits
            // 
            // IMPORTANT: Advance is NOT deducted from variance calculation!
            // Variance = Calculated Sales - (Total Declared - Other Expenses)
            //          = Calculated Sales - (Cash + Card + Credit + Cheque + Bank Deposits - Other Expenses)
            // 
            // Why? Advance is not a variance - it's money the pumper took and will be deducted from salary.
            // Variance only measures if they're declaring the correct amount vs calculated sales.
            // 
            // Effective Declared (for variance) = Total Declared - Other Expenses (loans, etc.)
            //                                    = Cash + Card + Credit + Cheque + Bank Deposits - Other Expenses
            //                                    (Advance is NOT included - it's handled separately in salary)
            const declaredAmount = cash + totalCard + totalCredit + cheque + totalBankDeposits
            
            // Effective declared for variance calculation - does NOT include advance
            // Advance will be deducted from salary separately, not from variance
            // Other expenses (loans, etc.) reduce the effective declared amount
            // Bank deposits are already included in declared amount (they're cash that was deposited)
            const effectiveDeclaredAmount = declaredAmount - totalOtherExpenses
            const variance = calculatedSales - effectiveDeclaredAmount
            
            // Variance logic: If |variance| > 20, add/deduct FULL variance amount
            // If |variance| <= 20, ignore (NORMAL - no adjustment)
            // If variance > 20: sales > effective declared (SHORTAGE) → DEDUCT FULL variance from salary
            // If variance < -20: effective declared > sales (SURPLUS) → ADD FULL variance to salary
            const varianceStatus = Math.abs(variance) > 20 
              ? (variance > 20 ? 'DEDUCT_FROM_SALARY' : 'ADD_TO_SALARY')
                : 'NORMAL'
            
            breakdowns.push({
              pumperName,
              calculatedSales,
              declaredAmount,
              declaredCash: cash,
              declaredCardAmounts: cardAmounts,
              declaredCreditAmounts: creditAmounts,
              declaredCheque: cheque,
              cheques: cheques,
              advanceTaken: advance,
              expenses: expenses,
              totalExpenses: totalBankDeposits + totalOtherExpenses, // Total for display
              variance,
              varianceStatus,
              assignments: pumperAssignments
            })
          })
          
          setPumperBreakdowns(breakdowns.sort((a, b) => a.pumperName.localeCompare(b.pumperName)))
        } catch (err) {
          console.error('Failed to calculate pumper breakdown:', err)
        }
      }
      
      calculatePumperBreakdown()
    } else {
      setPumperBreakdowns([])
    }
  }, [selectedShift, assignments, selectedStation, pumperDeclaredCash, pumperDeclaredCardAmounts, pumperDeclaredCreditAmounts, pumperDeclaredCheques, pumperAdvances, otherPumperAdvances, pumperExpenses, posSlips, missingSlips])

  // Calculate tender summary from pumper-wise data
  useEffect(() => {
    if (selectedShift && assignments.length > 0 && pumperBreakdowns.length > 0) {
      const calculateSummary = async () => {
        try {
          // Aggregate totals from pumper-wise breakdown
          const totalCash = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCash, 0)
          const totalCard = pumperBreakdowns.reduce((sum, b) => 
            sum + Object.values(b.declaredCardAmounts).reduce((cardSum, amount) => cardSum + amount, 0), 0
          )
          const totalCredit = pumperBreakdowns.reduce((sum, b) => 
            sum + Object.values(b.declaredCreditAmounts).reduce((creditSum, amount) => creditSum + amount, 0), 0
          )
          const totalCheque = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCheque, 0)
          const totalDeclared = totalCash + totalCard + totalCredit + totalCheque
          
          // Prepare assignments with all required data for API calculation
          const assignmentsForApi = assignments.map((assignment) => ({
            id: assignment.id,
            nozzleId: assignment.nozzleId,
            startMeterReading: assignment.startMeterReading,
            endMeterReading: assignment.endMeterReading,
            canSales: assignment.canSales || 0,
            pumpSales: assignment.pumpSales || 0,
            fuelType: assignment.nozzle?.tank?.fuelType || null
          }))
          
          const assignmentsParam = encodeURIComponent(JSON.stringify(assignmentsForApi))
          const res = await fetch(
            `/api/tenders/shift/${selectedShift}?cashAmount=${totalCash}&cardAmount=${totalCard}&creditAmount=${totalCredit}&chequeAmount=${totalCheque}&assignments=${assignmentsParam}`
          )
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Failed to fetch summary:', res.status, errorData)
            return
          }
          
          const summary = await res.json()
          setTenderSummary(summary)
        } catch (err) {
          console.error('Failed to calculate summary:', err)
        }
      }
      
      const timeoutId = setTimeout(calculateSummary, 100)
      return () => clearTimeout(timeoutId)
    } else {
      setTenderSummary(null)
    }
  }, [selectedShift, assignments, pumperBreakdowns])

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
    // Trigger summary recalculation immediately when assignments change
    // This ensures the sales amount is updated as soon as meter readings change
  }


  const handleUpdatePumperCash = (pumperName: string, amount: number) => {
    setPumperDeclaredCash(prev => ({ ...prev, [pumperName]: amount }))
  }

  const handleAddPumperCardRow = (pumperName: string, terminalId: string) => {
    setPumperDeclaredCardAmounts(prev => ({
      ...prev,
      [pumperName]: {
        ...(prev[pumperName] || {}),
        [terminalId]: 0
      }
    }))
  }

  const handleRemovePumperCardRow = (pumperName: string, terminalId: string) => {
    setPumperDeclaredCardAmounts(prev => {
      const newAmounts = { ...prev }
      if (newAmounts[pumperName]) {
        const updated = { ...newAmounts[pumperName] }
        delete updated[terminalId]
        newAmounts[pumperName] = updated
      }
      return newAmounts
    })
  }

  const handleUpdatePumperCardAmount = (pumperName: string, terminalId: string, amount: number) => {
    setPumperDeclaredCardAmounts(prev => ({
      ...prev,
      [pumperName]: {
        ...(prev[pumperName] || {}),
        [terminalId]: amount
      }
    }))
  }

  const handleAddPumperCreditRow = (pumperName: string, customerId: string) => {
    setPumperDeclaredCreditAmounts(prev => ({
      ...prev,
      [pumperName]: {
        ...(prev[pumperName] || {}),
        [customerId]: 0
      }
    }))
  }

  const handleRemovePumperCreditRow = (pumperName: string, customerId: string) => {
    setPumperDeclaredCreditAmounts(prev => {
      const newAmounts = { ...prev }
      if (newAmounts[pumperName]) {
        const updated = { ...newAmounts[pumperName] }
        delete updated[customerId]
        newAmounts[pumperName] = updated
      }
      return newAmounts
    })
  }

  const handleUpdatePumperCreditAmount = (pumperName: string, customerId: string, amount: number) => {
    setPumperDeclaredCreditAmounts(prev => ({
      ...prev,
      [pumperName]: {
        ...(prev[pumperName] || {}),
        [customerId]: amount
      }
    }))
  }

  const handleAddPumperCheque = (pumperName: string) => {
    const newCheque: PumperCheque = {
      id: `cheque-${Date.now()}-${Math.random()}`,
      chequeNumber: '',
      amount: 0,
      receivedFrom: ''
    }
    setPumperDeclaredCheques(prev => ({
      ...prev,
      [pumperName]: [...(prev[pumperName] || []), newCheque]
    }))
  }

  const handleRemovePumperCheque = (pumperName: string, chequeId: string) => {
    setPumperDeclaredCheques(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).filter(chq => chq.id !== chequeId)
    }))
  }

  const handleUpdatePumperCheque = (pumperName: string, chequeId: string, field: keyof PumperCheque, value: any) => {
    setPumperDeclaredCheques(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).map(chq => 
        chq.id === chequeId ? { ...chq, [field]: value } : chq
      )
    }))
  }

  const handleUpdatePumperAdvance = (pumperName: string, amount: number) => {
    // Validate: Total advances (taken + given) cannot exceed cash declared
    const currentCash = pumperDeclaredCash[pumperName] || 0
    const otherAdvances = otherPumperAdvances[pumperName] || []
    const otherAdvancesTotal = otherAdvances.reduce((sum, a) => sum + a.amount, 0)
    const totalAdvances = amount + otherAdvancesTotal
    
    if (totalAdvances > currentCash && currentCash > 0) {
      setError(`Total advances (taken: Rs. ${amount.toLocaleString()} + given: Rs. ${otherAdvancesTotal.toLocaleString()}) cannot exceed cash declared (Rs. ${currentCash.toLocaleString()}). Advances can only come from cash.`)
      setTimeout(() => setError(''), 5000)
      return
    }
    setPumperAdvances(prev => ({ ...prev, [pumperName]: amount }))
  }

  // Handle adding/updating advance for other pumpers (not assigned to shift) - per pumper
  const handleAddOtherPumperAdvance = (pumperName: string) => {
    setOtherPumperAdvances(prev => ({
      ...prev,
      [pumperName]: [...(prev[pumperName] || []), { pumperId: '', pumperName: '', amount: 0 }]
    }))
  }

  const handleUpdateOtherPumperAdvance = (pumperName: string, index: number, field: 'pumperId' | 'pumperName' | 'amount', value: string | number) => {
    setOtherPumperAdvances(prev => {
      const advances = [...(prev[pumperName] || [])]
      if (field === 'pumperId') {
        // When pumper is selected, update both id and name
        // value is the pumper name (from pumperBreakdowns)
        const selectedPumperName = value as string
        advances[index] = { ...advances[index], pumperId: selectedPumperName, pumperName: selectedPumperName }
      } else if (field === 'amount') {
        // Validate: Total advances (taken + given) cannot exceed cash declared
        const currentCash = pumperDeclaredCash[pumperName] || 0
        const advanceTaken = pumperAdvances[pumperName] || 0
        const otherAdvancesTotal = advances.reduce((sum, a, i) => i !== index ? sum + a.amount : sum, 0)
        const newAmount = value as number
        const totalAdvances = advanceTaken + otherAdvancesTotal + newAmount
        
        if (totalAdvances > currentCash && currentCash > 0) {
          setError(`Total advances (taken: Rs. ${advanceTaken.toLocaleString()} + given: Rs. ${(otherAdvancesTotal + newAmount).toLocaleString()}) cannot exceed cash declared (Rs. ${currentCash.toLocaleString()}). Advances can only come from cash.`)
          setTimeout(() => setError(''), 5000)
          return prev // Don't update if validation fails
        }
        
        advances[index] = { ...advances[index], [field]: newAmount }
      } else {
        advances[index] = { ...advances[index], [field]: value as string }
      }
      
      return {
        ...prev,
        [pumperName]: advances
      }
    })
  }

  const handleRemoveOtherPumperAdvance = (pumperName: string, index: number) => {
    setOtherPumperAdvances(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).filter((_, i) => i !== index)
    }))
  }

  // POS Terminal Verification Handlers
  // Check if a card was already used on the same day with SAME card type AND terminal
  const checkDuplicateCard = (pumperName: string, lastFourDigits: string, cardType: string, terminalId: string, slipIdToExclude?: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const slips = posSlips[pumperName] || []
    return slips.some(slip => {
      if (slip.id === slipIdToExclude) return false
      const slipDate = new Date(slip.timestamp)
      slipDate.setHours(0, 0, 0, 0)
      
      // Check for duplicate: same last 4 digits + same card type + same terminal + same day
      return slip.lastFourDigits === lastFourDigits 
        && slip.cardType === cardType
        && slip.terminalId === terminalId
        && slipDate.getTime() === today.getTime()
    })
  }

  // Get duplicate card details (returns the existing slip if duplicate found)
  const getDuplicateCardDetails = (pumperName: string, lastFourDigits: string, cardType: string, terminalId: string, slipIdToExclude?: string): POSSlipEntry | null => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const slips = posSlips[pumperName] || []
    const duplicate = slips.find(slip => {
      if (slip.id === slipIdToExclude) return false
      const slipDate = new Date(slip.timestamp)
      slipDate.setHours(0, 0, 0, 0)
      
      // Check for duplicate: same last 4 digits + same card type + same terminal + same day
      return slip.lastFourDigits === lastFourDigits 
        && slip.cardType === cardType
        && slip.terminalId === terminalId
        && slipDate.getTime() === today.getTime()
    })
    
    return duplicate || null
  }

  // Check if POS slip has all required fields filled
  const isPOSSlipComplete = (slip: POSSlipEntry): boolean => {
    return !!(
      slip.terminalId &&
      slip.lastFourDigits &&
      slip.lastFourDigits.length === 4 &&
      slip.cardType &&
      slip.amount > 0 &&
      slip.timestamp
    )
  }

  // Check if Missing slip has all required fields filled
  const isMissingSlipComplete = (slip: MissingSlipEntry): boolean => {
    return !!(
      slip.terminalId &&
      slip.lastFourDigits &&
      slip.lastFourDigits.length === 4 &&
      slip.amount > 0 &&
      slip.timestamp
    )
  }

  const handleMinimizePOSSlip = (slipId: string) => {
    setMinimizedPOSSlips(prev => ({
      ...prev,
      [slipId]: true
    }))
  }

  const handleExpandPOSSlip = (slipId: string) => {
    setMinimizedPOSSlips(prev => ({
      ...prev,
      [slipId]: false
    }))
  }

  const handleMinimizeMissingSlip = (slipId: string) => {
    setMinimizedMissingSlips(prev => ({
      ...prev,
      [slipId]: true
    }))
  }

  const handleExpandMissingSlip = (slipId: string) => {
    setMinimizedMissingSlips(prev => ({
      ...prev,
      [slipId]: false
    }))
  }

  const handleAddPOSSlip = (pumperName: string) => {
    const newSlip: POSSlipEntry = {
      id: `slip-${Date.now()}-${Math.random()}`,
      terminalId: '',
      amount: 0,
      lastFourDigits: '',
      cardType: 'VISA',
      timestamp: new Date(),
      notes: ''
    }
    setPosSlips(prev => ({
      ...prev,
      [pumperName]: [...(prev[pumperName] || []), newSlip]
    }))
    // New slips start expanded (not minimized)
    setMinimizedPOSSlips(prev => ({
      ...prev,
      [newSlip.id]: false
    }))
  }

  const handleUpdatePOSSlip = (pumperName: string, slipId: string, field: keyof POSSlipEntry, value: any) => {
    // Get current slip to check against
    const currentSlips = posSlips[pumperName] || []
    const currentSlip = currentSlips.find(s => s.id === slipId)
    
    // Update the slip first to get the new values
    const updatedSlips = currentSlips.map(slip => 
      slip.id === slipId ? { ...slip, [field]: value } : slip
    )
    const updatedSlip = updatedSlips.find(s => s.id === slipId)!
    
    // Check for duplicate card if updating lastFourDigits, cardType, or terminalId
    // Only check if we have all required fields (last4, cardType, terminalId)
    if ((field === 'lastFourDigits' || field === 'cardType' || field === 'terminalId') 
        && updatedSlip.lastFourDigits 
        && updatedSlip.lastFourDigits.length === 4
        && updatedSlip.cardType
        && updatedSlip.terminalId) {
      
      const duplicateSlip = getDuplicateCardDetails(
        pumperName, 
        updatedSlip.lastFourDigits, 
        updatedSlip.cardType,
        updatedSlip.terminalId,
        slipId
      )
      
      if (duplicateSlip) {
        // Show error with details about the duplicate slip
        setDuplicateCardErrors(prev => ({
          ...prev,
          [slipId]: {
            cardNumber: updatedSlip.lastFourDigits,
            duplicateSlip
      }
        }))
        
        // Also show a global error message
        const terminal = posTerminals.find(t => t.id === duplicateSlip.terminalId)
        const duplicateTime = new Date(duplicateSlip.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        setError(`⚠️ FRAUD ALERT: Card ending in ${updatedSlip.lastFourDigits} (${updatedSlip.cardType}) was already added today at ${duplicateTime} for Rs. ${duplicateSlip.amount.toLocaleString()} on ${terminal?.name || 'same terminal'}. The same card with same type cannot be used twice on the same terminal in the same day!`)
        setTimeout(() => setError(''), 8000)
      } else {
        // Clear error if card number is valid
        setDuplicateCardErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[slipId]
          return newErrors
        })
      }
    } else if (field === 'lastFourDigits' || field === 'cardType' || field === 'terminalId') {
      // Clear error if required fields are not complete yet
      setDuplicateCardErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[slipId]
        return newErrors
      })
    }

    // Apply the update
    setPosSlips(prev => ({
      ...prev,
      [pumperName]: updatedSlips
    }))
  }

  const handleRemovePOSSlip = (pumperName: string, slipId: string) => {
    setPosSlips(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).filter(slip => slip.id !== slipId)
    }))
    // Clear any duplicate card errors for this slip
    setDuplicateCardErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[slipId]
      return newErrors
    })
    // Clear minimized state
    setMinimizedPOSSlips(prev => {
      const newState = { ...prev }
      delete newState[slipId]
      return newState
    })
    // Re-check all remaining slips for duplicates after removing this one
    const remainingSlips = posSlips[pumperName]?.filter(slip => slip.id !== slipId) || []
    remainingSlips.forEach(slip => {
      if (slip.lastFourDigits && slip.lastFourDigits.length === 4 && slip.cardType && slip.terminalId) {
        const duplicateSlip = getDuplicateCardDetails(pumperName, slip.lastFourDigits, slip.cardType, slip.terminalId, slip.id)
        if (duplicateSlip) {
          setDuplicateCardErrors(prev => ({
            ...prev,
            [slip.id]: {
              cardNumber: slip.lastFourDigits,
              duplicateSlip
            }
          }))
        } else {
          setDuplicateCardErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[slip.id]
            return newErrors
          })
        }
      }
    })
  }

  const togglePOSVerification = (pumperName: string) => {
    setPosVerificationOpen(prev => ({
      ...prev,
      [pumperName]: !prev[pumperName]
    }))
  }

  const handleAddMissingSlip = (pumperName: string, defaultTerminalId: string = '') => {
    // Use a unified key for all missing slips per pumper (not per terminal)
    const key = `${pumperName}-unified`
    const newSlip: MissingSlipEntry = {
      id: `missing-slip-${Date.now()}-${Math.random()}`,
      terminalId: defaultTerminalId,
      amount: 0,
      lastFourDigits: '',
      timestamp: new Date(),
      notes: ''
    }
    setMissingSlips(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newSlip]
    }))
    // New slips start expanded
    setMinimizedMissingSlips(prev => ({
      ...prev,
      [newSlip.id]: false
    }))
  }

  const handleRemoveMissingSlip = (pumperName: string, terminalId: string, slipId: string) => {
    // Use unified key for all missing slips per pumper
    const key = `${pumperName}-unified`
    setMissingSlips(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(slip => slip.id !== slipId)
    }))
    // Clear minimized state
    setMinimizedMissingSlips(prev => {
      const newState = { ...prev }
      delete newState[slipId]
      return newState
    })
  }

  const handleUpdateMissingSlip = (pumperName: string, terminalId: string, slipId: string, field: keyof MissingSlipEntry, value: any) => {
    // Use unified key for all missing slips per pumper
    const key = `${pumperName}-unified`
    setMissingSlips(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(slip => 
        slip.id === slipId ? { ...slip, [field]: value } : slip
      )
    }))
  }

  const handleAddPumperExpense = async (pumperName: string, type: 'BANK_DEPOSIT' | 'LOAN_GIVEN' | 'OTHER') => {
    // Auto-fill loan given by with current user
    let loanGivenBy = ''
    if (type === 'LOAN_GIVEN') {
      try {
        loanGivenBy = await getCurrentUserName()
      } catch (err) {
        loanGivenBy = 'Manager'
      }
    }

    const newExpense: PumperExpense = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      amount: 0,
      description: type === 'OTHER' ? '' : undefined,
      bankId: type === 'BANK_DEPOSIT' ? '' : undefined,
      bankName: type === 'BANK_DEPOSIT' ? '' : undefined,
      accountNumber: type === 'BANK_DEPOSIT' ? '' : undefined,
      depositedBy: type === 'BANK_DEPOSIT' ? '' : undefined,
      loanGivenTo: type === 'LOAN_GIVEN' ? '' : undefined,
      loanGivenBy: type === 'LOAN_GIVEN' ? loanGivenBy : undefined
    }
    setPumperExpenses(prev => ({
      ...prev,
      [pumperName]: [...(prev[pumperName] || []), newExpense]
    }))
  }

  const handleRemovePumperExpense = (pumperName: string, expenseId: string) => {
    setPumperExpenses(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).filter(exp => exp.id !== expenseId)
    }))
  }

  const handleUpdatePumperExpense = (pumperName: string, expenseId: string, field: keyof PumperExpense, value: number | string) => {
    setPumperExpenses(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).map(exp => 
        exp.id === expenseId 
          ? { ...exp, [field]: value }
          : exp
      )
    }))
  }

  // Add Bank Handler
  const handleAddBank = async () => {
    if (!newBank.name.trim()) {
      setError('Bank name is required')
      return
    }

    try {
      const response = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBank.name.trim(),
          branch: newBank.branch?.trim() || null,
          accountNumber: newBank.accountNumber?.trim() || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add bank')
      }

      const addedBank = await response.json()
      setBanks([...banks, addedBank])
      setNewBank({ name: '', branch: '', accountNumber: '' })
      setAddBankDialogOpen(false)
      setSuccess(`Bank "${addedBank.name}" added successfully! You can now select it from the dropdown.`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('Error adding bank:', err)
      setError(err instanceof Error ? err.message : 'Failed to add bank. Please try again.')
      setTimeout(() => setError(''), 5000)
    }
  }

  // Test Pour Handlers
  const handleAddPumperTestPour = (pumperName: string) => {
    const newTestPour: PumperTestPour = {
      id: `testpour-${Date.now()}-${Math.random()}`,
      nozzleId: '',
      amount: 0,
      reason: '',
      returned: true
    }
    setPumperTestPours(prev => ({
      ...prev,
      [pumperName]: [...(prev[pumperName] || []), newTestPour]
    }))
  }

  const handleRemovePumperTestPour = (pumperName: string, testPourId: string) => {
    setPumperTestPours(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).filter(tp => tp.id !== testPourId)
    }))
  }

  const handleUpdatePumperTestPour = (pumperName: string, testPourId: string, field: keyof PumperTestPour, value: any) => {
    setPumperTestPours(prev => ({
      ...prev,
      [pumperName]: (prev[pumperName] || []).map(tp => {
        if (tp.id === testPourId) {
          const updated = { ...tp, [field]: value }
          // If nozzle changed, update nozzle info
          if (field === 'nozzleId' && value) {
            const selectedNozzle = nozzles.find(n => n.id === value)
            if (selectedNozzle) {
              updated.nozzleNumber = selectedNozzle.nozzleNumber
              updated.pumpNumber = selectedNozzle.pumpNumber
              updated.fuelType = selectedNozzle.fuelType
            }
          }
          return updated
        }
        return tp
      })
    }))
  }

  const handleCloseShiftAndPrint = async () => {
    if (!selectedShift) {
      setError('Please select a shift to close')
      return
    }
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      setError('No assignments found. Cannot close shift without assignments.')
      return
    }
    
    // Validate all assignments have end meter readings
    const incompleteAssignments = assignments.filter(a => !a.endMeterReading || a.endMeterReading === null)
    if (incompleteAssignments.length > 0) {
      setError(`Please fill in all end meter readings. ${incompleteAssignments.length} assignment(s) missing end readings.`)
      return
    }
    
    // Validate end meter readings are >= start readings
    const invalidReadings = assignments.filter(a => 
      a.endMeterReading !== null && 
      a.endMeterReading !== undefined &&
      a.startMeterReading !== null && 
      a.startMeterReading !== undefined &&
      a.endMeterReading < a.startMeterReading
    )
    if (invalidReadings.length > 0) {
      setError(`Invalid meter readings detected. End reading must be greater than or equal to start reading.`)
      return
    }
    
          // Validate end time is after start time
      if (!endTime) {
        setError('Please select an end time')
        return
      }

      // Validate pumper-wise data exists
      if (pumperBreakdowns.length === 0) {
        setError('Please enter declared amounts for at least one pumper.')
        return
      }

      // Aggregate totals from pumper-wise breakdown
      const totalCash = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCash, 0)
      const totalCard = pumperBreakdowns.reduce((sum, b) => 
        sum + Object.values(b.declaredCardAmounts).reduce((cardSum, amount) => cardSum + amount, 0), 0
      )
      const totalCredit = pumperBreakdowns.reduce((sum, b) => 
        sum + Object.values(b.declaredCreditAmounts).reduce((creditSum, amount) => creditSum + amount, 0), 0
      )
      const totalCheque = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCheque, 0)

      // Validate credit limits for all customers across all pumpers
      if (totalCredit > 0) {
        for (const breakdown of pumperBreakdowns) {
          for (const [customerId, amount] of Object.entries(breakdown.declaredCreditAmounts)) {
          if (amount > 0) {
            const customer = creditCustomers.find(c => c.id === customerId)
            if (customer) {
              const availableCredit = customer.creditLimit - customer.currentBalance
              if (amount > availableCredit) {
                setError(`Credit amount for ${customer.name} (Rs. ${amount.toLocaleString()}) exceeds available credit (Rs. ${availableCredit.toLocaleString()})`)
                return
                }
              }
            }
          }
        }
      }

      // Validate POS terminal verification for all terminals with card amounts
      if (totalCard > 0) {
        const terminalsWithAmounts = new Set<string>()
        pumperBreakdowns.forEach(breakdown => {
          Object.keys(breakdown.declaredCardAmounts).forEach(terminalId => {
            if (breakdown.declaredCardAmounts[terminalId] > 0) {
              terminalsWithAmounts.add(terminalId)
            }
          })
        })

        // Validate that slips are added for terminals with card amounts
        // We'll check if the totals match - this is done per pumper now
        // The validation will be done when we calculate totals
      }
      
      setLoading(true)
      setError('')
      setSuccess('')

    try {
      // Use the selected end time, or current time if not set
      const finalEndTime = endTime || new Date()
      
      // Aggregate totals from pumper-wise breakdown
      const totalCash = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCash, 0)
      const totalCard = pumperBreakdowns.reduce((sum, b) => 
        sum + Object.values(b.declaredCardAmounts).reduce((cardSum, amount) => cardSum + amount, 0), 0
      )
      const totalCredit = pumperBreakdowns.reduce((sum, b) => 
        sum + Object.values(b.declaredCreditAmounts).reduce((creditSum, amount) => creditSum + amount, 0), 0
      )
      const totalCheque = pumperBreakdowns.reduce((sum, b) => sum + b.declaredCheque, 0)
      
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
      
      // Prepare pumper-wise breakdown data to save
      // Map terminal IDs to names and customer IDs to names for better display
      const terminalIdToName = new Map(posTerminals.map(t => [t.id, `${t.name} (${t.terminalNumber})`]))
      const customerIdToName = new Map(creditCustomers.map(c => [c.id, c.name]))
      
      const pumperBreakdownData = pumperBreakdowns.map(breakdown => {
        // Convert terminal IDs to terminal names in card amounts
        const cardAmountsWithNames: Record<string, { amount: number; terminalName: string }> = {}
        Object.entries(breakdown.declaredCardAmounts).forEach(([terminalId, amount]) => {
          cardAmountsWithNames[terminalId] = {
            amount,
            terminalName: terminalIdToName.get(terminalId) || `Terminal ${terminalId}`
          }
        })
        
        // Convert customer IDs to customer names in credit amounts
        const creditAmountsWithNames: Record<string, { amount: number; customerName: string }> = {}
        Object.entries(breakdown.declaredCreditAmounts).forEach(([customerId, amount]) => {
          creditAmountsWithNames[customerId] = {
            amount,
            customerName: customerIdToName.get(customerId) || `Customer ${customerId}`
          }
        })
        
        return {
          pumperName: breakdown.pumperName,
          calculatedSales: breakdown.calculatedSales,
          declaredAmount: breakdown.declaredAmount,
          declaredCash: breakdown.declaredCash,
          declaredCardAmounts: breakdown.declaredCardAmounts, // Keep original for calculations
          declaredCardAmountsWithNames: cardAmountsWithNames, // Add names for display
          declaredCreditAmounts: breakdown.declaredCreditAmounts, // Keep original for calculations
          declaredCreditAmountsWithNames: creditAmountsWithNames, // Add names for display
          declaredCheque: breakdown.declaredCheque,
          cheques: breakdown.cheques,
          advanceTaken: breakdown.advanceTaken,
          otherPumperAdvances: otherPumperAdvances[breakdown.pumperName] || [], // Include other pumper advances for this pumper
          expenses: breakdown.expenses,
          variance: breakdown.variance,
          varianceStatus: breakdown.varianceStatus
        }
      })
      
      const shiftRes = await fetch(`/api/shifts/${selectedShift}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: validatedEndTime.toISOString(),
          closedBy: getCurrentUserName(),
          cashAmount: totalCash,
          cardAmount: totalCard,
          creditAmount: totalCredit,
          chequeAmount: totalCheque,
          pumperBreakdown: pumperBreakdownData, // Send pumper-wise breakdown
          otherPumperAdvances: Object.entries(otherPumperAdvances).reduce((acc, [pumperName, advances]) => {
            const validAdvances = advances.filter(a => a.pumperId && a.amount > 0)
            if (validAdvances.length > 0) {
              acc[pumperName] = validAdvances
            }
            return acc
          }, {} as Record<string, Array<{ pumperId: string; pumperName: string; amount: number }>>) // Send other pumper advances per pumper
        })
      })
      
      if (!shiftRes.ok) {
        const errorData = await shiftRes.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Failed to close shift (${shiftRes.status})`
        
        // Provide specific error messages
        if (errorMessage.includes('open assignments')) {
          throw new Error('Cannot close shift with open assignments. Please close all assignments first.')
        } else if (errorMessage.includes('already closed')) {
          throw new Error('This shift has already been closed.')
        } else if (errorMessage.includes('not found')) {
          throw new Error('Shift not found. It may have been deleted.')
        }
        
        throw new Error(errorMessage)
      }
      
      const shiftResult = await shiftRes.json()
      console.log('Shift closed successfully:', shiftResult)

      // Create credit sales for all customers with credit entries (from pumper-wise data)
      if (totalCredit > 0) {
        try {
          // Get the first assignment's nozzleId for credit sales
          if (assignments.length === 0 || !assignments[0].nozzleId) {
            throw new Error('No assignments found. Cannot create credit sale without a nozzle.')
          }

          const firstAssignment = assignments[0]
          const nozzleId = firstAssignment.nozzleId

          // Get fuel type from assignment's nozzle data
          const fuelType = firstAssignment.nozzle?.tank?.fuelType
          if (!fuelType) {
            throw new Error('Cannot determine fuel type for credit sale')
          }

          // Get shift data to get stationId and startTime
          const shiftData = shiftResult || await (await fetch(`/api/shifts/${selectedShift}`)).json()
          const stationId = shiftData.station?.id || shiftData.stationId
          const shiftStartTime = new Date(shiftData.startTime || validatedEndTime)

          // Fetch current price for the fuel type
          const priceRes = await fetch(`/api/prices?stationId=${stationId}&fuelType=${fuelType}&isActive=true`)
          let pricePerLiter = 470 // Default fallback price
          if (priceRes.ok) {
            const prices = await priceRes.json()
            if (Array.isArray(prices) && prices.length > 0) {
              // Get the most recent active price that's effective before or on shift start
              const activePrices = prices.filter((p: any) => 
                p.isActive && new Date(p.effectiveDate) <= shiftStartTime
              ).sort((a: any, b: any) => 
                new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
              )
              if (activePrices.length > 0) {
                pricePerLiter = activePrices[0].price
              }
            }
          }

          // Collect all credit entries from all pumpers
          const allCreditEntries: Record<string, number> = {}
          for (const breakdown of pumperBreakdowns) {
            for (const [customerId, amount] of Object.entries(breakdown.declaredCreditAmounts)) {
              if (amount > 0) {
                allCreditEntries[customerId] = (allCreditEntries[customerId] || 0) + amount
              }
            }
          }

          // Create credit sale for each customer with amount > 0
          const creditSalePromises = Object.entries(allCreditEntries)
            .filter(([_, amount]) => amount > 0)
            .map(async ([customerId, amount]) => {
              // Calculate liters from amount and price
              const liters = pricePerLiter > 0 ? amount / pricePerLiter : 0

              // Create credit sale
              const creditSaleRes = await fetch('/api/credit/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customerId: customerId,
                  shiftId: selectedShift,
                  nozzleId: nozzleId,
                  amount: amount,
                  liters: liters,
                  price: pricePerLiter,
                  signedBy: getCurrentUserName(),
                  timestamp: validatedEndTime.toISOString()
                })
              })

              if (!creditSaleRes.ok) {
                const errorData = await creditSaleRes.json().catch(() => ({}))
                throw new Error(errorData.error || `Failed to create credit sale for customer ${customerId}`)
              }

              return creditSaleRes.json()
            })

          const creditSaleResults = await Promise.all(creditSalePromises)
          console.log('Credit sales created successfully:', creditSaleResults)
        } catch (creditErr) {
          console.error('Error creating credit sales:', creditErr)
          const errorMessage = creditErr instanceof Error ? creditErr.message : 'Failed to create credit sales'
          console.warn('Credit sale creation failed:', errorMessage)
        }
      }

      // Create POS batches and add to safe
      if (totalCard > 0) {
        try {
          // Get terminals with amounts from POS slips and missing slips
          const terminalsWithAmounts = new Set<string>()
          Object.values(posSlips).forEach(pumperSlips => {
            pumperSlips.forEach(slip => {
              if (slip.terminalId && slip.amount > 0) {
                terminalsWithAmounts.add(slip.terminalId)
              }
            })
          })
          // Also include terminals from missing slips
          Object.values(missingSlips).forEach(pumperMissingSlips => {
            pumperMissingSlips.forEach(slip => {
              if (slip.terminalId && slip.amount > 0 && slip.lastFourDigits.length === 4) {
                terminalsWithAmounts.add(slip.terminalId)
              }
            })
          })

          // Get shift data for stationId
          const shiftData = shiftResult || await (await fetch(`/api/shifts/${selectedShift}`)).json()
          const stationId = shiftData.station?.id || shiftData.stationId

          // Collect all POS slips from all pumpers (including missing slips for batch totals)
          const allSlips: POSSlipEntry[] = []
          pumperBreakdowns.forEach(breakdown => {
            const pumperSlips = posSlips[breakdown.pumperName] || []
            allSlips.push(...pumperSlips.filter(slip => slip.terminalId && slip.amount > 0))
            
            // Also include missing slips in the batch totals calculation
            const key = `${breakdown.pumperName}-unified`
            const pumperMissingSlips = missingSlips[key] || []
            pumperMissingSlips.forEach(missingSlip => {
              if (missingSlip.terminalId && missingSlip.amount > 0 && missingSlip.lastFourDigits.length === 4) {
                // Convert missing slip to POS slip format for batch calculation
                // Use a default card type (VISA) since missing slips don't have card type
                allSlips.push({
                  id: missingSlip.id,
                  terminalId: missingSlip.terminalId,
                  amount: missingSlip.amount,
                  lastFourDigits: missingSlip.lastFourDigits,
                  cardType: 'VISA', // Default card type for missing slips
                  timestamp: missingSlip.timestamp,
                  notes: missingSlip.notes
                })
              }
            })
          })

          // Calculate totals by terminal for batch creation
          const terminalTotals: Record<string, { visaAmount: number; masterAmount: number; amexAmount: number; qrAmount: number; dialogTouchAmount: number; count: number }> = {}
          allSlips.forEach(slip => {
            if (!terminalTotals[slip.terminalId]) {
              terminalTotals[slip.terminalId] = { visaAmount: 0, masterAmount: 0, amexAmount: 0, qrAmount: 0, dialogTouchAmount: 0, count: 0 }
            }
            terminalTotals[slip.terminalId].count++
            switch (slip.cardType) {
              case 'VISA':
                terminalTotals[slip.terminalId].visaAmount += slip.amount
                break
              case 'MASTER':
                terminalTotals[slip.terminalId].masterAmount += slip.amount
                break
              case 'AMEX':
                terminalTotals[slip.terminalId].amexAmount += slip.amount
                break
              case 'QR':
                terminalTotals[slip.terminalId].qrAmount += slip.amount
                break
              case 'DIALOG_TOUCH':
                terminalTotals[slip.terminalId].dialogTouchAmount += slip.amount
                break
            }
          })

          // Create terminal entries array for batch creation
          const terminalEntries = Array.from(terminalsWithAmounts).map(terminalId => {
            const totals = terminalTotals[terminalId] || { visaAmount: 0, masterAmount: 0, amexAmount: 0, qrAmount: 0, dialogTouchAmount: 0, count: 0 }
            return {
              terminalId,
              startNumber: '', // Not used in slip-based system
              endNumber: '', // Not used in slip-based system
              transactionCount: totals.count,
              visaAmount: totals.visaAmount,
              masterAmount: totals.masterAmount,
              amexAmount: totals.amexAmount,
              qrAmount: totals.qrAmount,
              dialogTouchAmount: totals.dialogTouchAmount
            }
          })

          // Calculate total amount
          const batchTotalAmount = terminalEntries.reduce((sum, entry) => 
            sum + entry.visaAmount + entry.masterAmount + entry.amexAmount + entry.qrAmount + (entry.dialogTouchAmount || 0), 0
          )

          // Create POS batch
          const batchRes = await fetch('/api/pos/batches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stationId,
              shiftId: selectedShift,
              terminalEntries,
              totalAmount: batchTotalAmount,
              notes: `POS batch created during shift close`
            })
          })

          if (!batchRes.ok) {
            const errorData = await batchRes.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to create POS batch')
          }

          const batchResult = await batchRes.json()
          const createdBatchId = batchResult.id

          // Report missing slips if any (collect from all pumpers)
          for (const terminalId of terminalsWithAmounts) {
            // Get missing slips for this terminal from all pumpers
            const terminalMissingSlips: MissingSlipEntry[] = []
            pumperBreakdowns.forEach(breakdown => {
              // Use unified key for missing slips per pumper
              const key = `${breakdown.pumperName}-unified`
              const slips = missingSlips[key] || []
              terminalMissingSlips.push(...slips.filter(slip => slip.terminalId === terminalId))
            })
            
            for (const slip of terminalMissingSlips) {
              if (slip.amount > 0 && slip.lastFourDigits.length === 4) {
                try {
                  const username = getCurrentUserName()
                  await fetch('/api/pos/missing-slip', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      batchId: createdBatchId,
                      terminalId: slip.terminalId,
                      shiftId: selectedShift,
                      amount: slip.amount,
                      lastFourDigits: slip.lastFourDigits,
                      timestamp: slip.timestamp.toISOString(),
                      notes: slip.notes,
                      reportedBy: username
                    })
                  })
                } catch (slipErr) {
                  console.warn(`Failed to report missing slip for terminal ${slip.terminalId}:`, slipErr)
                  // Don't fail the entire operation if missing slip reporting fails
                }
              }
            }
          }

          console.log('POS batch created successfully with missing slips')
        } catch (posErr) {
          console.error('Error creating POS batch:', posErr)
          const errorMessage = posErr instanceof Error ? posErr.message : 'Failed to create POS batch'
          console.warn('POS batch creation failed:', errorMessage)
          // Don't fail the entire shift close if POS batch fails
        }
      }

      // Cash will be added to safe manually by pumpers after shift end
      // Cheques are still automatically tracked for record-keeping
      
      // Add cheques to safe (for tracking purposes - pumpers handle physical cheques)
      if (totalCheque > 0) {
        try {
          const shiftData = shiftResult || await (await fetch(`/api/shifts/${selectedShift}`)).json()
          const stationId = shiftData.station?.id || shiftData.stationId

          // Get all cheques from all pumpers
          const allCheques: PumperCheque[] = []
          pumperBreakdowns.forEach(breakdown => {
            allCheques.push(...breakdown.cheques)
          })

          // Add each cheque to safe ONLY if it's cleared
          // Cheques should not be counted as cash until they clear the bank
          for (const cheque of allCheques) {
            // Only add cleared cheques to safe - pending/bounced cheques should not be counted as cash
            // Default to CLEARED if status is not specified (for backward compatibility)
            const chequeStatus = cheque.status || 'CLEARED'
            if (cheque.amount > 0 && chequeStatus === 'CLEARED') {
              const safeRes = await fetch('/api/safe/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  stationId,
                  type: 'CHEQUE_RECEIVED',
                  amount: cheque.amount,
                  description: `Cleared Cheque #${cheque.chequeNumber} from ${cheque.receivedFrom}${cheque.bankName ? ` (${cheque.bankName})` : ''}`,
                  timestamp: validatedEndTime.toISOString(),
                  shiftId: selectedShift,
                  chequeId: cheque.id, // Store reference if needed
                  performedBy: getCurrentUserName()
                })
              })

              if (!safeRes.ok) {
                console.warn(`Failed to add cleared cheque ${cheque.chequeNumber} to safe`)
              }
            } else {
              const chequeStatus = cheque.status || 'CLEARED'
              if (chequeStatus !== 'CLEARED') {
                console.log(`Skipping cheque ${cheque.chequeNumber} - status is ${chequeStatus}, not CLEARED`)
              }
            }
          }

          console.log('Cleared cheques added to safe successfully')
        } catch (chequeErr) {
          console.error('Error adding cheques to safe:', chequeErr)
          // Don't fail the entire shift close if cheque addition fails
        }
      }

      // Create test pours
      try {
        // Get all test pours with their pumper names
        const allTestPoursWithPumper: Array<{ testPour: PumperTestPour; pumperName: string }> = []
        Object.entries(pumperTestPours).forEach(([pumperName, testPours]) => {
          testPours.forEach(testPour => {
            allTestPoursWithPumper.push({ testPour, pumperName })
          })
        })

        if (allTestPoursWithPumper.length > 0) {
          for (const { testPour, pumperName } of allTestPoursWithPumper) {
            if (testPour.nozzleId && testPour.amount > 0) {
              // Validate reason is provided
              if (!testPour.reason || testPour.reason.trim() === '') {
                console.warn(`Skipping test pour - reason is required for test pour with amount ${testPour.amount}L`)
                continue
              }
              
              // Get tank ID from assignment's nozzle data (assignments already have nozzle with tank info)
              const assignment = assignments.find(a => a.nozzleId === testPour.nozzleId)
              // Try to get tankId from nozzles state first, then fallback to API
              let tankId: string | undefined = undefined
              
              if (assignment?.nozzle?.id) {
                const nozzleFromState = nozzles.find(n => n.id === assignment.nozzle?.id)
                if (nozzleFromState?.tankId) {
                  tankId = nozzleFromState.tankId
                }
              }
              
              if (!tankId) {
                console.warn(`Skipping test pour - nozzle ${testPour.nozzleId} not found in assignments or has no tank. Available assignments:`, assignments.map(a => ({ nozzleId: a.nozzleId, hasNozzle: !!a.nozzle, hasTank: !!a.nozzle?.tank })))
                // Try to fetch tankId from API as fallback
                try {
                  const nozzleRes = await fetch(`/api/nozzles/${testPour.nozzleId}`)
                  if (nozzleRes.ok) {
                    const nozzleData = await nozzleRes.json()
                    const fallbackTankId = nozzleData.tankId || nozzleData.tank?.id
                    if (fallbackTankId) {
                      console.log(`Found tankId via API fallback: ${fallbackTankId}`)
                      const testPourPayload = {
                        shiftId: selectedShift,
                        nozzleId: testPour.nozzleId,
                        tankId: fallbackTankId,
                        litres: testPour.amount.toString(),
                        reason: testPour.reason || undefined,
                        testTime: validatedEndTime.toISOString(),
                        testedBy: pumperName,
                        returned: testPour.returned,
                        notes: testPour.notes || undefined
                      }
                      
                      console.log(`Creating test pour:`, testPourPayload)
                      
                      const testPourRes = await fetch('/api/tests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(testPourPayload)
                      })

                      if (!testPourRes.ok) {
                        const errorData = await testPourRes.json().catch(() => ({}))
                        console.error(`Failed to create test pour for nozzle ${testPour.nozzleId}:`, errorData)
                        setError(prev => prev ? `${prev}\nFailed to create test pour: ${errorData.error || 'Unknown error'}` : `Failed to create test pour: ${errorData.error || 'Unknown error'}`)
                      } else {
                        const createdTestPour = await testPourRes.json()
                        console.log(`✅ Test pour created successfully:`, createdTestPour)
                      }
                      continue
                    }
                  }
                } catch (apiErr) {
                  console.error(`Failed to fetch nozzle data:`, apiErr)
                }
                continue
              }

              const testPourPayload = {
                shiftId: selectedShift,
                nozzleId: testPour.nozzleId,
                tankId: tankId,
                litres: testPour.amount.toString(),
                reason: testPour.reason || undefined,
                testTime: validatedEndTime.toISOString(),
                testedBy: pumperName,
                returned: testPour.returned,
                notes: testPour.notes || undefined
              }
              
              console.log(`Creating test pour:`, testPourPayload)

              const testPourRes = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testPourPayload)
              })

              if (!testPourRes.ok) {
                const errorData = await testPourRes.json().catch(() => ({}))
                console.error(`Failed to create test pour for nozzle ${testPour.nozzleId}:`, errorData)
                // Show error to user but don't fail the entire shift close
                setError(prev => prev ? `${prev}\nFailed to create test pour: ${errorData.error || 'Unknown error'}` : `Failed to create test pour: ${errorData.error || 'Unknown error'}`)
              } else {
                const createdTestPour = await testPourRes.json()
                console.log(`✅ Test pour created successfully:`, createdTestPour)
              }
            }
          }
          console.log('Test pours created successfully')
        }
      } catch (testPourErr) {
        console.error('Error creating test pours:', testPourErr)
        // Don't fail the entire shift close if test pour creation fails
      }

      // Create LoanPumper records for any LOAN_GIVEN expenses
      try {
        const shiftData = shiftResult || await (await fetch(`/api/shifts/${selectedShift}`)).json()
        const stationId = shiftData.station?.id || shiftData.stationId

        // Collect all loan expenses from all pumpers
        const allLoanExpenses: Array<{ expense: PumperExpense; pumperName: string }> = []
        pumperBreakdowns.forEach(breakdown => {
          const loanExpenses = breakdown.expenses.filter(exp => exp.type === 'LOAN_GIVEN' && exp.loanGivenTo && exp.amount > 0)
          loanExpenses.forEach(expense => {
            allLoanExpenses.push({ expense, pumperName: breakdown.pumperName })
          })
        })

        // Create LoanPumper records for each loan expense
        if (allLoanExpenses.length > 0) {
          for (const { expense, pumperName } of allLoanExpenses) {
            try {
              // Get the pumper who received the loan
              const receivingPumper = pumpers.find(p => p.id === expense.loanGivenTo)
              if (!receivingPumper) {
                console.warn(`Skipping loan - pumper with ID ${expense.loanGivenTo} not found`)
                continue
              }

              // Create LoanPumper record
              const loanRes = await fetch('/api/loans/pumper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  stationId,
                  pumperName: receivingPumper.name,
                  amount: expense.amount,
                  monthlyRental: expense.monthlyRental || 0,
                  reason: expense.description || 'Loan given during shift close',
                  givenBy: expense.loanGivenBy || pumperName,
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                  fromSafe: false // This is not from safe, it's from shift expenses
                })
              })

              if (!loanRes.ok) {
                const errorData = await loanRes.json().catch(() => ({}))
                console.warn(`Failed to create loan record for ${receivingPumper.name}:`, errorData)
              } else {
                console.log(`✅ Loan record created for ${receivingPumper.name}`)
              }
            } catch (loanErr) {
              console.error(`Error creating loan record:`, loanErr)
              // Don't fail the entire shift close if loan creation fails
            }
          }
          console.log('Loan records created successfully')
        }
      } catch (loanErr) {
        console.error('Error creating loan records:', loanErr)
        // Don't fail the entire shift close if loan creation fails
      }

      setSuccess('Shift closed successfully! Redirecting...')
      
      // Redirect to shifts page after successful closure
      setTimeout(() => {
        router.push('/shifts')
      }, 2000)
    } catch (err) {
      console.error('Error closing shift:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to close shift. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const assignmentColumns = [
    {
      key: 'nozzleId' as keyof Assignment,
      title: 'Nozzle',
      render: (_value: unknown, row: Assignment) => {
        if (row.nozzle) {
          const display = getNozzleDisplayWithBadge({
            id: row.nozzle.id,
            pumpNumber: row.nozzle.pump?.pumpNumber || '?',
            nozzleNumber: row.nozzle.nozzleNumber,
            fuelType: row.nozzle.tank?.fuelType || 'Unknown'
          })
          return (
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{display.label}</span>
              <Badge variant="outline">{display.badge}</Badge>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Nozzle {row.nozzleId.slice(0, 8)}</span>
          </div>
        )
      }
    },
    {
      key: 'pumperName' as keyof Assignment,
      title: 'Pumper',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-muted-foreground" />
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
          <span className="font-mono text-blue-600 dark:text-blue-400">
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
          <span className={`font-mono ${delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {delta.toLocaleString()}
          </span>
        )
      }
    }
  ]


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        <h1 className="text-2xl font-bold">Close Shift</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500/20 dark:border-green-500/30 bg-green-500/10 dark:bg-green-500/20">
          <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      <FormCard title="Shift Selection" description="Select the station and shift to close">
        {/* Display current station */}
        <div className="mb-4 p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
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
                  shifts.map((shift) => {
                    // Extract unique pumper names from assignments
                    let pumperDisplay = 'No pumpers'
                    
                    // Check if assignments exist and are an array
                    const assignments = shift.assignments
                    if (assignments && Array.isArray(assignments) && assignments.length > 0) {
                      // Extract pumper names, handling both direct field access and nested structures
                      const pumperNames = Array.from(new Set(
                        assignments
                          .map((a: any) => {
                            // Try different possible field paths
                            return a.pumperName || a.pumper?.name || a.pumperName || ''
                          })
                          .filter((name: any) => name && typeof name === 'string' && name.trim() !== '')
                      ))
                      
                      if (pumperNames.length > 0) {
                        pumperDisplay = pumperNames.join(', ')
                      }
                    }
                    
                    return (
                    <SelectItem key={shift.id} value={shift.id}>
                        {new Date(shift.startTime).toLocaleString()} - {pumperDisplay}
                    </SelectItem>
                    )
                  })
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

      {selectedShift && (
        <FormCard title="Meter Readings" description="Enter end meter readings for each assignment">
          {assignments.length > 0 ? (
            <DataTable
              data={assignments}
              columns={assignmentColumns}
              searchable={false}
              pagination={false}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-4">No assignments found for this shift. Assignments will appear here once added.</p>
          )}
        </FormCard>
      )}

      {/* Pumper-wise Sales Breakdown */}
      {selectedShift && pumperBreakdowns.length > 0 && (
        <FormCard 
          title="Pumper-wise Sales & Variance" 
          description="Enter declared amounts per pumper to calculate variance and salary adjustments"
        >
          <div className="space-y-4">
            <Alert className="border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20">
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>Salary Adjustment Rules:</strong> If variance is more than Rs. 20, add to pumper's salary. 
                If variance is less than -Rs. 20, deduct from pumper's salary. Variance within ±Rs. 20 is normal.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {pumperBreakdowns.map((breakdown) => (
                <div 
                  key={breakdown.pumperName} 
                  className={`border rounded-lg p-4 ${
                    breakdown.varianceStatus === 'ADD_TO_SALARY' 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{breakdown.pumperName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {breakdown.assignments.length} assignment{breakdown.assignments.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        breakdown.varianceStatus === 'ADD_TO_SALARY' 
                          ? 'default' 
                          : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                            ? 'destructive'
                            : 'outline'
                      }
                      className={
                        breakdown.varianceStatus === 'ADD_TO_SALARY' 
                          ? 'bg-green-600 text-white' 
                          : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                            ? 'bg-red-600 text-white'
                            : ''
                      }
                    >
                      {breakdown.varianceStatus === 'ADD_TO_SALARY' 
                        ? 'Add to Salary' 
                        : breakdown.varianceStatus === 'DEDUCT_FROM_SALARY'
                          ? 'Deduct from Salary'
                          : 'Normal'}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {/* Calculated Sales */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1 block">
                        Calculated Sales (from meter)
                      </Label>
                      <div className="font-mono font-semibold text-lg">
                        Rs. {breakdown.calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* Declared Amount Breakdown */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium mb-3 block">Declared Amount Breakdown:</Label>
                      
                      {/* Cash Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cash Amount
              </Label>
              <MoneyInput
                          value={breakdown.declaredCash}
                          onChange={(value) => handleUpdatePumperCash(breakdown.pumperName, value)}
                placeholder="0.00"
                className="w-full"
              />
            </div>

                      {/* POS Terminal Verification & Slip Entry (for this pumper) */}
                      {(() => {
                        const pumperSlips = posSlips[breakdown.pumperName] || []
                        const isOpen = posVerificationOpen[breakdown.pumperName] || false

                        // Calculate totals by terminal and card type from slips
                        const totalsByTerminal: Record<string, number> = {}
                        const totalsByCardType: Record<string, number> = { VISA: 0, MASTER: 0, AMEX: 0, QR: 0, DIALOG_TOUCH: 0 }
                        let grandTotal = 0

                        pumperSlips.forEach(slip => {
                          if (slip.terminalId && slip.amount > 0) {
                            totalsByTerminal[slip.terminalId] = (totalsByTerminal[slip.terminalId] || 0) + slip.amount
                            totalsByCardType[slip.cardType] = (totalsByCardType[slip.cardType] || 0) + slip.amount
                            grandTotal += slip.amount
                          }
                        })

                        // Get all unique terminals used in slips
                        const usedTerminalIds = Array.from(new Set(pumperSlips.filter(s => s.terminalId).map(s => s.terminalId)))
                        
                        // Get all available terminals (show all, not just ones with amounts)
                        const allTerminalIds = posTerminals.map(t => t.id)

                        return (
                          <div className="space-y-4 pt-4 border-t mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4" />
                                POS Terminal Verification & Slip Entry
                </Label>
                              <Button
                                type="button"
                                variant={isOpen ? "default" : "outline"}
                                size="sm"
                                onClick={() => togglePOSVerification(breakdown.pumperName)}
                              >
                                {isOpen ? 'Hide Details' : 'Show Verification'}
                              </Button>
                            </div>
                            <Alert className="mb-4 border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 dark:bg-blue-500/20">
                              <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
                                <strong>Required:</strong> Add individual POS slips one by one. System will automatically calculate totals by terminal and card type. Prevent duplicate card payments on the same day.
                              </AlertDescription>
                            </Alert>

                            {isOpen && (
                              <>
                                {/* Add Slip Button */}
                                <div className="flex justify-end mb-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddPOSSlip(breakdown.pumperName)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add POS Slip
                                  </Button>
                                </div>

                                {/* POS Slips List */}
                                <div className="space-y-3">
                                  {pumperSlips.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
                                      No POS slips added yet. Click "Add POS Slip" to start.
                                    </p>
                                  ) : (
                                    pumperSlips.map((slip) => {
                                      const isMinimized = minimizedPOSSlips[slip.id] || false
                                      const isComplete = isPOSSlipComplete(slip)
                                      const terminal = posTerminals.find(t => t.id === slip.terminalId)
                                      
                                      return (
                                      <div key={slip.id} className={`border rounded-lg p-3 space-y-3 bg-blue-500/5 dark:bg-blue-500/10 ${isMinimized ? 'cursor-pointer hover:bg-blue-500/10 dark:hover:bg-blue-500/15' : ''}`}>
                                        <div className="flex items-center justify-between">
                                          {isMinimized ? (
                                            <div 
                                              className="flex-1 cursor-pointer"
                                              onClick={() => handleExpandPOSSlip(slip.id)}
                                            >
                <div className="flex items-center gap-2">
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                <Label className="text-sm font-medium">POS Slip - {slip.lastFourDigits || 'Incomplete'}</Label>
                                                {terminal && <span className="text-xs text-muted-foreground">({terminal.name})</span>}
                                                <span className="text-xs text-green-600 dark:text-green-400">Rs. {slip.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                              </div>
                                            </div>
                                          ) : (
                                            <Label className="text-sm font-medium">POS Slip</Label>
                                          )}
                                          <div className="flex items-center gap-2">
                                            {!isMinimized && isComplete && (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleMinimizePOSSlip(slip.id)
                                                }}
                                                title="Minimize slip"
                                              >
                                                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                              </Button>
                                            )}
                                            {isMinimized && (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  handleExpandPOSSlip(slip.id)
                                                }}
                                                title="Expand slip"
                                              >
                                                <ChevronUp className="h-4 w-4" />
                                              </Button>
                                            )}
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemovePOSSlip(breakdown.pumperName, slip.id)
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>

                                        {!isMinimized && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">POS Machine *</Label>
                                            <Select
                                              value={slip.terminalId}
                                              onValueChange={(value) => handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'terminalId', value)}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select POS machine" />
                    </SelectTrigger>
                    <SelectContent>
                                                {posTerminals.map(terminal => (
                                    <SelectItem key={terminal.id} value={terminal.id}>
                                                    {terminal.name} ({terminal.terminalNumber})
                                      {terminal.bank && (
                                                      <span className="ml-2 text-xs text-muted-foreground">- {terminal.bank.name}</span>
                                      )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                                          </div>

                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Card Sale Time *</Label>
                                            <DateTimePicker
                                              value={slip.timestamp}
                                              onChange={(date) => handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'timestamp', date || new Date())}
                                            />
                                          </div>

                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Card Number (Last 4 Digits) *</Label>
                                            <Input
                                              value={slip.lastFourDigits}
                                              onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                                handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'lastFourDigits', value)
                                              }}
                                              placeholder="1234"
                                              maxLength={4}
                                              className={`w-full ${duplicateCardErrors[slip.id] ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500' : ''}`}
                                            />
                                            {duplicateCardErrors[slip.id] && (() => {
                                              const error = duplicateCardErrors[slip.id]
                                              const duplicateSlip = error.duplicateSlip
                                              const terminal = posTerminals.find(t => t.id === duplicateSlip.terminalId)
                                              const duplicateTime = new Date(duplicateSlip.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                              return (
                                                <Alert className="mt-2 border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-950/50">
                                                  <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                                                    <div className="font-semibold mb-1">⚠️ DUPLICATE CARD DETECTED - FRAUD ALERT!</div>
                                                    <div>This card (ending in {error.cardNumber}, {slip.cardType}) was already added today:</div>
                                                    <div className="mt-1 ml-2">
                                                      • Time: {duplicateTime}<br />
                                                      • Amount: Rs. {duplicateSlip.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br />
                                                      • Card Type: {duplicateSlip.cardType}<br />
                                                      {terminal && <span>• Terminal: {terminal.name} ({terminal.terminalNumber})</span>}
                                                    </div>
                                                    <div className="mt-2 font-semibold">⚠️ The same card with the same type cannot be used twice on the same terminal in the same day!</div>
                                                    <div className="mt-1 text-xs">
                                                      <strong>Note:</strong> Different cards can have the same last 4 digits. If this is a different card, 
                                                      change the card type (VISA/MASTER/AMEX) or use a different terminal.
                                                    </div>
                                                  </AlertDescription>
                                                </Alert>
                                              )
                                            })()}
                                          </div>

                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Card Type *</Label>
                                            <Select
                                              value={slip.cardType}
                                              onValueChange={(value) => handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'cardType', value)}
                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="VISA">Visa</SelectItem>
                                                <SelectItem value="MASTER">Master</SelectItem>
                                                <SelectItem value="AMEX">Amex</SelectItem>
                                                <SelectItem value="QR">QR</SelectItem>
                                                <SelectItem value="DIALOG_TOUCH">Dialog Touch ID Card</SelectItem>
                                              </SelectContent>
                                            </Select>
                </div>

                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
                                            <MoneyInput
                                              value={slip.amount}
                                              onChange={(value) => handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'amount', value)}
                                              placeholder="0.00"
                                              className="w-full"
                                            />
              </div>

                                          <div>
                                            <Label className="text-xs text-muted-foreground mb-1 block">Notes (Optional)</Label>
                                            <Input
                                              value={slip.notes || ''}
                                              onChange={(e) => handleUpdatePOSSlip(breakdown.pumperName, slip.id, 'notes', e.target.value)}
                                              placeholder="Additional notes"
                                              className="w-full"
                                            />
                                          </div>
                                        </div>
                                        )}
                                      </div>
                                      )
                                    })
                                  )}
                                </div>

                                {/* Totals Summary */}
                                {pumperSlips.length > 0 && (
                                  <div className="mt-6 pt-4 border-t space-y-4">
                                    <div className="p-4 bg-muted/30 dark:bg-muted/20 rounded-lg">
                                      <h5 className="font-semibold text-sm mb-3">Totals Summary</h5>
                                      
                                      {/* Totals by Terminal */}
                                      <div className="mb-4">
                                        <Label className="text-xs font-medium mb-2 block">By POS Terminal:</Label>
                                        <div className="space-y-1">
                                          {usedTerminalIds.map(terminalId => {
                          const terminal = posTerminals.find(t => t.id === terminalId)
                                            const terminalTotal = totalsByTerminal[terminalId] || 0
                return (
                                              <div key={terminalId} className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                  {terminal?.name || 'Unknown'}: 
                                                </span>
                                                <span className="font-mono text-green-600 dark:text-green-400">
                                                  Rs. {terminalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      {/* Totals by Card Type */}
                                      <div className="mb-4">
                                        <Label className="text-xs font-medium mb-2 block">By Card Type:</Label>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {Object.entries(totalsByCardType).map(([type, amount]) => (
                                            <div key={type} className="flex justify-between">
                                              <span className="text-muted-foreground">{type}:</span>
                                              <span className="font-mono">Rs. {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Grand Total */}
                                      {grandTotal > 0 && (
                                        <div className="pt-2 border-t">
                                          <div className="flex justify-between items-center">
                                            <Label className="text-sm font-semibold">Total Card Sales (from slips):</Label>
                                            <div className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                                              Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                          </div>
                                        </div>
                                  )}
                                    </div>
                                  </div>
                                )}

                                {/* Missing Slips Section */}
                                {isOpen && (
                                  <div className="mt-6 pt-4 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="flex items-center gap-2 text-sm font-semibold">
                                        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        Missing Slips (Optional)
                                </Label>
                    </div>
                                    <Alert className="mb-4 border-orange-500/20 dark:border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/20">
                                      <AlertDescription className="text-orange-700 dark:text-orange-300 text-xs">
                                        <strong>Optional:</strong> Report missing POS slips that were not provided by customers. This helps track discrepancies in card transactions.
                                      </AlertDescription>
                                    </Alert>

                                    {/* Add Missing Slip Button */}
                                    <div className="flex justify-end mb-4">
                    <Button
                                        type="button"
                      variant="outline"
                      size="sm"
                                        onClick={() => handleAddMissingSlip(breakdown.pumperName)}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Missing Slip
                                      </Button>
                                    </div>

                                    {/* Missing Slips List */}
                                    {(() => {
                                      // Get all missing slips for this pumper using unified key
                                      const key = `${breakdown.pumperName}-unified`
                                      const pumperMissingSlips = missingSlips[key] || []
                                      const allMissingSlips: Array<{ slip: MissingSlipEntry; terminalId: string }> = pumperMissingSlips.map(slip => ({
                                        slip,
                                        terminalId: slip.terminalId
                                      }))

                                      return (
                                        <div className="space-y-3">
                                          {allMissingSlips.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
                                              No missing slips reported yet. Click "Add Missing Slip" to start.
                                            </p>
                                          ) : (
                                            allMissingSlips.map(({ slip, terminalId }) => {
                                              const isMinimized = minimizedMissingSlips[slip.id] || false
                                              const isComplete = isMissingSlipComplete(slip)
                                              const terminal = posTerminals.find(t => t.id === slip.terminalId)
                                              
                                              return (
                                              <div key={slip.id} className={`border rounded-lg p-3 space-y-3 bg-orange-500/5 dark:bg-orange-500/10 ${isMinimized ? 'cursor-pointer hover:bg-orange-500/10 dark:hover:bg-orange-500/15' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                  {isMinimized ? (
                                                    <div 
                                                      className="flex-1 cursor-pointer"
                                                      onClick={() => handleExpandMissingSlip(slip.id)}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        <Label className="text-sm font-medium">Missing Slip - {slip.lastFourDigits || 'Incomplete'}</Label>
                                                        {terminal && <span className="text-xs text-muted-foreground">({terminal.name})</span>}
                                                        <span className="text-xs text-orange-600 dark:text-orange-400">Rs. {slip.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <Label className="text-sm font-medium">Missing Slip</Label>
                                                  )}
                                                  <div className="flex items-center gap-2">
                                                    {!isMinimized && isComplete && (
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleMinimizeMissingSlip(slip.id)
                                                        }}
                                                        title="Minimize slip"
                                                      >
                                                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                      </Button>
                                                    )}
                                                    {isMinimized && (
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          handleExpandMissingSlip(slip.id)
                                                        }}
                                                        title="Expand slip"
                                                      >
                                                        <ChevronUp className="h-4 w-4" />
                                                      </Button>
                                                    )}
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRemoveMissingSlip(breakdown.pumperName, terminalId, slip.id)
                                                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                                                  </div>
                                                </div>

                                                {!isMinimized && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">POS Machine *</Label>
                                                    <Select
                                                      value={slip.terminalId}
                                                      onValueChange={(value) => handleUpdateMissingSlip(breakdown.pumperName, terminalId, slip.id, 'terminalId', value)}
                                                    >
                                                      <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select POS machine" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {posTerminals.map(terminal => (
                                                          <SelectItem key={terminal.id} value={terminal.id}>
                                                            {terminal.name} ({terminal.terminalNumber})
                                                            {terminal.bank && (
                                                              <span className="ml-2 text-xs text-muted-foreground">- {terminal.bank.name}</span>
                                                            )}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>

                                                  <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Transaction Time *</Label>
                                                    <DateTimePicker
                                                      value={slip.timestamp}
                                                      onChange={(date) => handleUpdateMissingSlip(breakdown.pumperName, terminalId, slip.id, 'timestamp', date || new Date())}
                                                    />
                                                  </div>

                                                  <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Card Number (Last 4 Digits) *</Label>
                                                    <Input
                                                      value={slip.lastFourDigits}
                                                      onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                                        handleUpdateMissingSlip(breakdown.pumperName, terminalId, slip.id, 'lastFourDigits', value)
                                                      }}
                                                      placeholder="1234"
                                                      maxLength={4}
                                                      className="w-full"
                                                    />
                                                  </div>

                                                  <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
                                                    <MoneyInput
                                                      value={slip.amount}
                                                      onChange={(value) => handleUpdateMissingSlip(breakdown.pumperName, terminalId, slip.id, 'amount', value)}
                                                      placeholder="0.00"
                                                      className="w-full"
                                                    />
                                                  </div>

                                                  <div>
                                                    <Label className="text-xs text-muted-foreground mb-1 block">Notes (Optional)</Label>
                                                    <Input
                                                      value={slip.notes || ''}
                                                      onChange={(e) => handleUpdateMissingSlip(breakdown.pumperName, terminalId, slip.id, 'notes', e.target.value)}
                                                      placeholder="Additional notes"
                                                      className="w-full"
                                                    />
                                                  </div>
                                                </div>
                                                )}
                  </div>
                )
                                            })
                                          )}
            </div>
                                      )
                                    })()}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })()}

                      {/* Credit Amounts by Customer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Credit Amounts by Customer
                </Label>
                <div className="flex items-center gap-2">
                            <Select onValueChange={(customerId) => handleAddPumperCreditRow(breakdown.pumperName, customerId)}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Add customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCustomers
                                  .filter(customer => !breakdown.declaredCreditAmounts.hasOwnProperty(customer.id))
                                  .map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                            </SelectItem>
                                  ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                              disabled={creditCustomers.filter(c => !breakdown.declaredCreditAmounts.hasOwnProperty(c.id)).length === 0}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

                        {Object.entries(breakdown.declaredCreditAmounts).map(([customerId, amount]) => {
                const customer = creditCustomers.find(c => c.id === customerId)
                          const availableCredit = customer ? (customer.creditLimit - customer.currentBalance) : 0
                return (
                            <div key={customerId} className="flex items-center gap-2">
                      <div className="flex-1">
                                <Label className="text-sm text-muted-foreground">
                                  {customer?.name}
                                </Label>
                          <MoneyInput
                            value={amount}
                                  onChange={(value) => handleUpdatePumperCreditAmount(breakdown.pumperName, customerId, value)}
                            placeholder="0.00"
                            className="w-full"
                          />
                    {amount > 0 && amount > availableCredit && (
                      <p className="text-xs text-red-600 dark:text-red-400 ml-1">
                        Warning: Amount exceeds available credit by Rs. {(amount - availableCredit).toLocaleString()}
                      </p>
                    )}
                    {amount > 0 && amount <= availableCredit && (
                      <p className="text-xs text-muted-foreground ml-1">
                        Available credit: Rs. {availableCredit.toLocaleString()}
                      </p>
                    )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemovePumperCreditRow(breakdown.pumperName, customerId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                  </div>
                )
              })}
            </div>

                      {/* Cheque Details */}
            <div className="space-y-2">
                        <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                            Cheques Received
              </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPumperCheque(breakdown.pumperName)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Cheque
                          </Button>
                        </div>
                        
                        {breakdown.cheques.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
                            No cheques received
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {breakdown.cheques.map((cheque) => (
                              <div key={cheque.id} className="border rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Cheque Details</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemovePumperCheque(breakdown.pumperName, cheque.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Cheque Number *</Label>
                                  <Input
                                    value={cheque.chequeNumber}
                                    onChange={(e) => handleUpdatePumperCheque(breakdown.pumperName, cheque.id, 'chequeNumber', e.target.value)}
                                    placeholder="Enter cheque number"
                                    className="w-full"
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Received From (Who Gave the Cheque) *</Label>
                                  <Input
                                    value={cheque.receivedFrom}
                                    onChange={(e) => handleUpdatePumperCheque(breakdown.pumperName, cheque.id, 'receivedFrom', e.target.value)}
                                    placeholder="Enter name of person/company who gave the cheque"
                                    className="w-full"
                                  />
                                </div>
                                
                                <div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-xs text-muted-foreground">Bank</Label>
                                      <Dialog open={addBankDialogOpen} onOpenChange={setAddBankDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setAddBankDialogOpen(true)
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Bank
                                          </Button>
                                        </DialogTrigger>
                                      </Dialog>
                                    </div>
                                    <Select 
                                      value={cheque.bankId || ''} 
                                      onValueChange={(value) => {
                                        const selectedBank = banks.find(b => b.id === value)
                                        handleUpdatePumperCheque(breakdown.pumperName, cheque.id, 'bankId', value)
                                        if (selectedBank) {
                                          handleUpdatePumperCheque(breakdown.pumperName, cheque.id, 'bankName', selectedBank.name)
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select bank" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {banks.length === 0 ? (
                                          <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                                            No banks available. Click "Add Bank" above to create one.
                                          </div>
                                        ) : (
                                          banks.map((bank) => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                              <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                <span className="font-medium">{bank.name}</span>
                                                {bank.branch && (
                                                  <span className="text-xs text-muted-foreground">- {bank.branch}</span>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))
                                        )}
                                        <div className="border-t mt-1 pt-1">
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-start text-xs"
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setAddBankDialogOpen(true)
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-2" />
                                            Add New Bank
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-start text-xs text-blue-600 dark:text-blue-400"
                                            type="button"
                                            onClick={() => router.push('/settings/banks')}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Manage All Banks
                                          </Button>
                                        </div>
                                      </SelectContent>
                                    </Select>
                                    {banks.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Don't see your bank? Click "Add Bank" or{' '}
                                        <Button variant="link" className="h-auto p-0 text-xs" onClick={() => router.push('/settings/banks')}>
                                          manage all banks
                                        </Button>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
              <MoneyInput
                                    value={cheque.amount}
                                    onChange={(value) => handleUpdatePumperCheque(breakdown.pumperName, cheque.id, 'amount', value)}
                placeholder="0.00"
                className="w-full"
              />
            </div>
          </div>
                            ))}
                            
                            <div className="flex justify-between items-center pt-2 border-t">
                              <Label className="text-sm font-medium">Total Cheque Amount:</Label>
                              <div className="font-mono font-semibold">
                                Rs. {breakdown.declaredCheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Test Pours */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Fuel className="h-4 w-4" />
                            Test Pours
                            {breakdown.assignments.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({breakdown.assignments.length} nozzle{breakdown.assignments.length > 1 ? 's' : ''} assigned)
                              </span>
                            )}
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPumperTestPour(breakdown.pumperName)}
                            disabled={breakdown.assignments.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Test Pour
                          </Button>
                  </div>
                        
                        {breakdown.assignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
                            No nozzles assigned to this pumper
                          </p>
                        ) : (!pumperTestPours[breakdown.pumperName] || pumperTestPours[breakdown.pumperName].length === 0) ? (
                          <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg">
                            No test pours recorded. Click "Add Test Pour" to record test pours for assigned nozzles.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {pumperTestPours[breakdown.pumperName].map((testPour) => {
                              // Get assigned nozzles for this pumper
                              const assignedNozzles = breakdown.assignments
                                .filter(a => a.nozzle)
                                .map(a => a.nozzle!)
                                .filter((nozzle, index, self) => 
                                  index === self.findIndex(n => n.id === nozzle.id)
                                ) // Remove duplicates
                              
                              return (
                              <div key={testPour.id} className="border rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Test Pour</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemovePumperTestPour(breakdown.pumperName, testPour.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Nozzle *</Label>
                                  <Select 
                                    value={testPour.nozzleId || ''} 
                                    onValueChange={(value) => handleUpdatePumperTestPour(breakdown.pumperName, testPour.id, 'nozzleId', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select assigned nozzle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {assignedNozzles.length === 0 ? (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No nozzles assigned</div>
                                      ) : (
                                        assignedNozzles.map((nozzle) => {
                                          const fuelType = nozzle.tank?.fuelType || 'Unknown'
                                          const pumpNumber = nozzle.pump?.pumpNumber || '?'
                                          return (
                                            <SelectItem key={nozzle.id} value={nozzle.id}>
                                              P-{pumpNumber} N-{nozzle.nozzleNumber} ({fuelType.replace(/_/g, ' ')})
                                            </SelectItem>
                                          )
                                        })
                                      )}
                                    </SelectContent>
                                  </Select>
                  </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Amount (L) *</Label>
                                  <Input
                                    type="number"
                                    value={testPour.amount}
                                    onChange={(e) => handleUpdatePumperTestPour(breakdown.pumperName, testPour.id, 'amount', parseFloat(e.target.value) || 0)}
                                    placeholder="Enter amount in liters"
                                    min="0"
                                    step="0.1"
                                    className="w-full"
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Reason *</Label>
                                  <Select 
                                    value={testPour.reason || ''} 
                                    onValueChange={(value) => handleUpdatePumperTestPour(breakdown.pumperName, testPour.id, 'reason', value)}
                                  >
                                    <SelectTrigger className="w-full">
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
                                
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={testPour.returned}
                                    onCheckedChange={(checked) => handleUpdatePumperTestPour(breakdown.pumperName, testPour.id, 'returned', checked === true)}
                                  />
                                  <Label className="text-xs text-muted-foreground cursor-pointer">
                                    Fuel returned to tank
                                  </Label>
                  </div>
                                
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Notes (Optional)</Label>
                                  <Input
                                    value={testPour.notes || ''}
                                    onChange={(e) => handleUpdatePumperTestPour(breakdown.pumperName, testPour.id, 'notes', e.target.value)}
                                    placeholder="Additional notes"
                                    className="w-full"
                                  />
                </div>
              </div>
                              )
                            })}
            </div>
          )}
                      </div>

                      {/* Advance Taken */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Advance Taken from Sales
                        </Label>
                        <MoneyInput
                          value={breakdown.advanceTaken}
                          onChange={(value) => handleUpdatePumperAdvance(breakdown.pumperName, value)}
                          placeholder="0.00"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Money taken as advance FROM CASH SALES (will be deducted from cash declared above). 
                          Advance can only be taken from cash, not from card/credit/cheque.
                          {breakdown.advanceTaken > 0 && breakdown.declaredCash >= 0 && (
                            <span className="block mt-1 text-orange-600 dark:text-orange-400">
                              Cash after advance: Rs. {(breakdown.declaredCash - breakdown.advanceTaken).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                              (Rs. {breakdown.declaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} declared - Rs. {breakdown.advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} advance)
                            </span>
                          )}
                          {breakdown.advanceTaken > (breakdown.declaredCash || 0) && (
                            <span className="block mt-1 text-red-600 dark:text-red-400 font-medium">
                              ⚠️ Warning: Advance exceeds cash declared. Advance can only be taken from cash sales.
                            </span>
                          )}
                        </p>
                  </div>

                      {/* Other Pumper Advances (Given from this pumper's cash) */}
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 text-sm font-medium">
                            <Wallet className="h-4 w-4" />
                            Advances Given to Other Pumpers
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddOtherPumperAdvance(breakdown.pumperName)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                        
                        {(() => {
                          const otherAdvances = otherPumperAdvances[breakdown.pumperName] || []
                          const advanceTaken = breakdown.advanceTaken || 0
                          const otherAdvancesTotal = otherAdvances.reduce((sum, a) => sum + a.amount, 0)
                          const totalAdvances = advanceTaken + otherAdvancesTotal
                          const availableCash = breakdown.declaredCash || 0
                          const cashAfterAllAdvances = availableCash - totalAdvances
                          
                          // Get all pumpers who worked the same shift, EXCEPT the current pumper
                          // Show all other pumpers from this shift (breakdown.pumperName is excluded)
                          const availablePumpers = pumperBreakdowns
                            .filter(b => b.pumperName !== breakdown.pumperName)
                            .map(b => ({
                              id: b.pumperName, // Use pumperName as both ID and value
                              name: b.pumperName
                            }))
                          
                          return (
                            <div className="space-y-3">
                              {otherAdvances.map((advance, index) => (
                                <div key={index} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-medium">Advance #{index + 1}</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveOtherPumperAdvance(breakdown.pumperName, index)}
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Pumper *</Label>
                                      <Select 
                                        value={advance.pumperId} 
                                        onValueChange={(value) => handleUpdateOtherPumperAdvance(breakdown.pumperName, index, 'pumperId', value)}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Select pumper" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availablePumpers.length === 0 ? (
                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                              No other pumpers on this shift
                                            </div>
                                          ) : (
                                            availablePumpers.map((pumper) => (
                                              <SelectItem key={pumper.id} value={pumper.id} className="text-xs">
                                                {pumper.name}
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs">Amount *</Label>
                                      <MoneyInput
                                        value={advance.amount}
                                        onChange={(value) => handleUpdateOtherPumperAdvance(breakdown.pumperName, index, 'amount', value)}
                                        placeholder="0.00"
                                        className="w-full h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  {advance.pumperName && (
                                    <p className="text-xs text-muted-foreground">
                                      Given to <strong>{advance.pumperName}</strong>
                                    </p>
                                  )}
                                </div>
                              ))}

                              {otherAdvances.length > 0 && (
                                <div className="pt-2 border-t space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Advance Taken:</span>
                                    <span className="font-mono">Rs. {advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Advances Given:</span>
                                    <span className="font-mono">Rs. {otherAdvancesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-medium">
                                    <span>Total Advances:</span>
                                    <span className="font-mono">Rs. {totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-medium">
                                    <span>Cash After All Advances:</span>
                                    <span className={`font-mono ${cashAfterAllAdvances < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                      Rs. {cashAfterAllAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {totalAdvances > availableCash && (
                                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                                      ⚠️ Warning: Total advances exceed cash declared. Advances can only come from cash.
                                    </p>
                                  )}
                                </div>
                              )}

                              {otherAdvances.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  No advances given to other pumpers
                                </p>
                              )}
                            </div>
                          )
                        })()}
                  </div>

                      {/* Expenses */}
            <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Expenses (Money Used by Manager)
                          </Label>
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(type) => handleAddPumperExpense(breakdown.pumperName, type as 'BANK_DEPOSIT' | 'LOAN_GIVEN' | 'OTHER')}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Add expense" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BANK_DEPOSIT">Bank Deposit (Owner's Account)</SelectItem>
                                <SelectItem value="LOAN_GIVEN">Loan to Pumper</SelectItem>
                                <SelectItem value="OTHER">Other Expense</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                </div>
                  </div>

                        {breakdown.expenses.map((expense) => (
                          <div key={expense.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                {expense.type === 'BANK_DEPOSIT' ? 'Bank Deposit (Owner\'s Account)' :
                                 expense.type === 'LOAN_GIVEN' ? 'Loan to Pumper' :
                                 'Other Expense'}
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemovePumperExpense(breakdown.pumperName, expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                </div>

                            {/* Bank Deposit Fields */}
                            {expense.type === 'BANK_DEPOSIT' && (
                              <>
                                <div className="mb-2 p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded border border-blue-500/20">
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <strong>Note:</strong> Money taken from this pumper's sales and deposited to owner's bank account
                                  </p>
                  </div>
                                <div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-xs text-muted-foreground">Owner's Bank Account *</Label>
                                      <Dialog open={addBankDialogOpen} onOpenChange={setAddBankDialogOpen}>
                                        <DialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs"
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setAddBankDialogOpen(true)
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Bank
                                          </Button>
                                        </DialogTrigger>
                                      </Dialog>
                                    </div>
                                    <Select 
                                      value={expense.bankId || ''} 
                                      onValueChange={(value) => {
                                        const selectedBank = banks.find(b => b.id === value)
                                        handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'bankId', value)
                                        if (selectedBank) {
                                          handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'bankName', selectedBank.name)
                                          // Automatically set account number from selected bank
                                          handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'accountNumber', selectedBank.accountNumber || '')
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select owner's bank account" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {banks.length === 0 ? (
                                          <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                                            No banks available. Click "Add Bank" above to create one.
                                          </div>
                                        ) : (
                                          banks.map((bank) => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <Building2 className="h-4 w-4" />
                                                  <span className="font-medium">{bank.name}{bank.branch && ` - ${bank.branch}`}</span>
                                                </div>
                                                {bank.accountNumber && (
                                                  <span className="text-xs text-muted-foreground ml-6">Account: {bank.accountNumber}</span>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))
                                        )}
                                        <div className="border-t mt-1 pt-1">
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-start text-xs"
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setAddBankDialogOpen(true)
                                            }}
                                          >
                                            <Plus className="h-3 w-3 mr-2" />
                                            Add New Bank
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-start text-xs text-blue-600 dark:text-blue-400"
                                            type="button"
                                            onClick={() => router.push('/settings/banks')}
                                          >
                                            <ExternalLink className="h-3 w-3 mr-2" />
                                            Manage All Banks
                                          </Button>
                                        </div>
                                      </SelectContent>
                                    </Select>
                                    {banks.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Don't see your bank? Click "Add Bank" or{' '}
                                        <Button variant="link" className="h-auto p-0 text-xs" onClick={() => router.push('/settings/banks')}>
                                          manage all banks
                                        </Button>
                                      </p>
                                    )}
                                  </div>
                                  {expense.bankId && banks.find(b => b.id === expense.bankId)?.accountNumber && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Account: {banks.find(b => b.id === expense.bankId)?.accountNumber}
                                    </p>
                                  )}
                  </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Deposited By (Manager/Owner)</Label>
                                  <Input
                                    value={expense.depositedBy || ''}
                                    onChange={(e) => handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'depositedBy', e.target.value)}
                                    placeholder="Enter manager/owner name who deposited"
                                    className="w-full"
                                  />
                </div>
                              </>
                            )}

                            {/* Loan Given Fields */}
                            {expense.type === 'LOAN_GIVEN' && (
                              <>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Loan Given To (Pumper) *</Label>
                                  <Select 
                                    value={expense.loanGivenTo || ''} 
                                    onValueChange={(value) => {
                                      const selectedPumper = pumpers.find(p => p.id === value)
                                      handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'loanGivenTo', value)
                                      if (selectedPumper) {
                                        handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'loanGivenToName', selectedPumper.name)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select pumper" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {pumpers
                                        .filter(p => p.isActive !== false)
                                        .map((pumper) => (
                                          <SelectItem key={pumper.id} value={pumper.id}>
                                            {pumper.name}
                                            {pumper.employeeId && ` (${pumper.employeeId})`}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {expense.loanGivenTo && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {expense.loanGivenToName || pumpers.find(p => p.id === expense.loanGivenTo)?.name || 'Pumper selected'}
                                    </p>
                                  )}
              </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Loan Given By (Manager) *</Label>
                                  <Input
                                    value={expense.loanGivenBy || ''}
                                    onChange={(e) => handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'loanGivenBy', e.target.value)}
                                    placeholder="Manager name"
                                    className="w-full"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Manager who authorized the loan
                                  </p>
            </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">Monthly Rental (Rs.)</Label>
                                  <MoneyInput
                                    value={expense.monthlyRental || 0}
                                    onChange={(value) => handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'monthlyRental', value || 0)}
                                    placeholder="0.00"
                                    className="w-full"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Amount to deduct monthly from pumper's salary (default: 0)
                                  </p>
                                </div>
                              </>
          )}

                            {/* Other Expense Fields */}
                            {expense.type === 'OTHER' && (
                              <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Description *</Label>
                                <Input
                                  value={expense.description || ''}
                                  onChange={(e) => handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'description', e.target.value)}
                                  placeholder="Enter expense description"
                                  className="w-full"
                                />
                              </div>
                            )}

                            {/* Amount (for all types) */}
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Amount *</Label>
                              <MoneyInput
                                value={expense.amount}
                                onChange={(value) => handleUpdatePumperExpense(breakdown.pumperName, expense.id, 'amount', value)}
                                placeholder="0.00"
                                className="w-full"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Calculation Summary */}
                      <div className="pt-4 border-t space-y-2 bg-muted/30 dark:bg-muted/20 p-3 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium">Declared Amount Breakdown:</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="text-muted-foreground">Cash (full amount):</div>
                            <div className="font-mono text-right">Rs. {breakdown.declaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            
                            {(() => {
                              const otherAdvances = otherPumperAdvances[breakdown.pumperName] || []
                              const advanceTaken = breakdown.advanceTaken || 0
                              const otherAdvancesTotal = otherAdvances.reduce((sum, a) => sum + a.amount, 0)
                              const totalAdvances = advanceTaken + otherAdvancesTotal
                              
                              if (totalAdvances > 0) {
                                return (
                              <>
                                <div className="text-muted-foreground text-orange-600 dark:text-orange-400">Advance Taken (deducted from cash):</div>
                                <div className="font-mono text-right text-orange-600 dark:text-orange-400">
                                      - Rs. {advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                    {otherAdvancesTotal > 0 && (
                                      <>
                                        <div className="text-muted-foreground text-orange-600 dark:text-orange-400">Advances Given (deducted from cash):</div>
                                        <div className="font-mono text-right text-orange-600 dark:text-orange-400">
                                          - Rs. {otherAdvancesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </>
                            )}
                                    <div className="text-muted-foreground font-medium">Total Advances:</div>
                                    <div className="font-mono text-right font-medium text-orange-600 dark:text-orange-400">
                                      - Rs. {totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-muted-foreground font-medium">Cash After All Advances:</div>
                                    <div className="font-mono text-right font-medium">
                                      Rs. {(breakdown.declaredCash - totalAdvances).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </>
                                )
                              }
                              return null
                            })()}
                            
                            <div className="text-muted-foreground">Card:</div>
                            <div className="font-mono text-right">
                              Rs. {Object.values(breakdown.declaredCardAmounts).reduce((sum, amount) => sum + amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            
                            <div className="text-muted-foreground">Credit:</div>
                            <div className="font-mono text-right">
                              Rs. {Object.values(breakdown.declaredCreditAmounts).reduce((sum, amount) => sum + amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            
                            <div className="text-muted-foreground">Cheque:</div>
                            <div className="font-mono text-right">Rs. {breakdown.declaredCheque.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            
                            {(() => {
                              const bankDeposits = breakdown.expenses.filter(exp => exp.type === 'BANK_DEPOSIT')
                              const totalBankDeposits = bankDeposits.reduce((sum, exp) => sum + exp.amount, 0)
                              if (totalBankDeposits > 0) {
                                return (
                                  <>
                                    <div className="text-muted-foreground">Bank Deposits:</div>
                                    <div className="font-mono text-right text-blue-600 dark:text-blue-400">
                                      + Rs. {totalBankDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  </>
                                )
                              }
                              return null
                            })()}
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t mt-2">
                            <Label className="text-sm font-semibold">Total Declared:</Label>
                            <div className="font-mono font-bold text-base">
                              Rs. {breakdown.declaredAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              (Cash {breakdown.declaredCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Card + Credit + Cheque + Bank Deposits)
                            </div>
                          </div>
                        </div>
                        
                        {/* Advance (shown for info, but NOT included in variance) and Other Expenses */}
                        {(() => {
                          const otherExpenses = breakdown.expenses.filter(exp => exp.type !== 'BANK_DEPOSIT')
                          const totalOtherExpenses = otherExpenses.reduce((sum, exp) => sum + exp.amount, 0)
                          const hasDeductions = breakdown.advanceTaken > 0 || totalOtherExpenses > 0
                          
                          if (!hasDeductions) return null
                          
                          return (
                            <div className="space-y-2 pt-2 border-t mt-2">
                              {breakdown.advanceTaken > 0 && (
                                <div className="mb-2 p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded border border-blue-500/20">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-blue-700 dark:text-blue-300 font-medium">Advance Taken (from cash):</span>
                                    <span className="font-mono text-blue-700 dark:text-blue-300 font-semibold">
                                      Rs. {breakdown.advanceTaken.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    ℹ️ Note: Advance is tracked separately and will be deducted from salary. It does NOT affect variance calculation.
                                  </p>
                                </div>
                              )}
                              
                              {totalOtherExpenses > 0 && (
                                <>
                                  <div className="text-xs text-muted-foreground mb-1">Deductions (Other Expenses):</div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Other Expenses (Loans/Other):</span>
                                    <span className="font-mono text-orange-600 dark:text-orange-400">
                                      - Rs. {totalOtherExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </>
                              )}
                              
                              <div className="flex justify-between items-center pt-1 border-t mt-1">
                                <Label className="text-sm font-semibold">Effective Declared Amount (for variance):</Label>
                                <div className="font-mono font-bold text-base">
                                  Rs. {(breakdown.declaredAmount - totalOtherExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-muted-foreground ml-2">
                                  (Advance excluded)
                                </div>
                              </div>
                            </div>
                          )
                  })()}
              </div>
            </div>
            
                    {/* Variance */}
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1 block">
                        Variance
                      </Label>
                      <div className={`font-mono font-semibold text-lg ${
                        breakdown.variance > 20 
                          ? 'text-red-600 dark:text-red-400' 
                          : breakdown.variance < -20
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-foreground'
                      }`}>
                        {breakdown.variance >= 0 ? '+' : ''}Rs. {breakdown.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
                      {breakdown.varianceStatus !== 'NORMAL' && (
                        <p className="text-xs mt-1">
                          {breakdown.varianceStatus === 'ADD_TO_SALARY' 
                            ? `Add Rs. ${Math.abs(breakdown.variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to salary`
                            : `Deduct Rs. ${Math.abs(breakdown.variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from salary`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Assignment details */}
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium mb-2 block">Assignments:</Label>
                    <div className="space-y-2">
                      {breakdown.assignments.map((assignment) => {
                        const delta = assignment.endMeterReading && assignment.startMeterReading
                          ? assignment.endMeterReading - assignment.startMeterReading
                          : 0
                        const canSales = assignment.canSales || 0
                        const pumpSales = assignment.pumpSales || Math.max(0, delta - canSales)
                        const fuelType = assignment.nozzle?.tank?.fuelType || 'Unknown'
                        const nozzleDisplay = assignment.nozzle 
                          ? `P-${assignment.nozzle.pump?.pumpNumber || '?'} N-${assignment.nozzle.nozzleNumber}`
                          : 'Unknown Nozzle'
                        
                        return (
                          <div key={assignment.id} className="text-xs text-muted-foreground flex items-center justify-between">
                            <span>{nozzleDisplay} ({fuelType})</span>
                <span className="font-mono">
                              {pumpSales.toFixed(2)}L
                </span>
              </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Shift Summary */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-4">Overall Shift Summary</h4>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Calculated Sales</div>
                  <div className="font-mono font-bold text-lg text-blue-700 dark:text-blue-300">
                    Rs. {pumperBreakdowns.reduce((sum, b) => sum + b.calculatedSales, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Declared Amount</div>
                  <div className="font-mono font-bold text-lg text-green-700 dark:text-green-300">
                    Rs. {pumperBreakdowns.reduce((sum, b) => sum + b.declaredAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`text-center p-4 rounded-lg border ${
                  pumperBreakdowns.reduce((sum, b) => sum + b.variance, 0) >= 0 
                    ? 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20' 
                    : 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20'
                }`}>
                  <div className="text-sm text-muted-foreground mb-1">Total Variance</div>
                  <div className={`font-mono font-bold text-lg ${
                    pumperBreakdowns.reduce((sum, b) => sum + b.variance, 0) >= 0 
                      ? 'text-red-700 dark:text-red-300' 
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    {pumperBreakdowns.reduce((sum, b) => sum + b.variance, 0) >= 0 ? '+' : ''}
                    Rs. {pumperBreakdowns.reduce((sum, b) => sum + b.variance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              
              {/* Tender Type Breakdown */}
              <div className="pt-4 border-t">
                <h5 className="font-semibold mb-3 text-sm">Tender Type Breakdown (All Pumpers)</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Cash</div>
                    <div className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                      Rs. {pumperBreakdowns.reduce((sum, b) => sum + b.declaredCash, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Card</div>
                    <div className="font-mono font-semibold text-green-700 dark:text-green-300">
                      Rs. {pumperBreakdowns.reduce((sum, b) => 
                        sum + Object.values(b.declaredCardAmounts).reduce((cardSum, amount) => cardSum + amount, 0), 0
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg border border-orange-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Credit</div>
                    <div className="font-mono font-semibold text-orange-700 dark:text-orange-300">
                      Rs. {pumperBreakdowns.reduce((sum, b) => 
                        sum + Object.values(b.declaredCreditAmounts).reduce((creditSum, amount) => creditSum + amount, 0), 0
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg border border-purple-500/20">
                    <div className="text-xs text-muted-foreground mb-1">Cheque</div>
                    <div className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                      Rs. {pumperBreakdowns.reduce((sum, b) => sum + b.declaredCheque, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
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

      {/* Add Bank Dialog */}
      <Dialog open={addBankDialogOpen} onOpenChange={setAddBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bank</DialogTitle>
            <DialogDescription>
              Add a bank that's not in the list. It will be available immediately after adding and can be used for cheques and bank deposits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newBankName">Bank Name *</Label>
              <Input
                id="newBankName"
                value={newBank.name}
                onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                placeholder="e.g., Bank of Ceylon, Commercial Bank"
                required
              />
            </div>
            <div>
              <Label htmlFor="newBankBranch">Branch (Optional)</Label>
              <Input
                id="newBankBranch"
                value={newBank.branch}
                onChange={(e) => setNewBank({ ...newBank, branch: e.target.value })}
                placeholder="e.g., Colombo 07, Kandy"
              />
            </div>
            <div>
              <Label htmlFor="newBankAccount">Account Number (Optional)</Label>
              <Input
                id="newBankAccount"
                value={newBank.accountNumber}
                onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                placeholder="e.g., 1234567890"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddBankDialogOpen(false)
                  setNewBank({ name: '', branch: '', accountNumber: '' })
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleAddBank} disabled={!newBank.name.trim()}>
                Add Bank
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
