'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  User,
  Users,
  AlertCircle, 
  CheckCircle, 
  Plus,
  Clock,
  FileText,
  Banknote
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Pumper {
  id: string
  name: string
  stationId: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface ExternalLoan {
  id: string
  stationId: string
  stationName?: string
  lenderName: string
  amount: number
  loanDate: string
  notes?: string
  approvedBy: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  recordedBy: string
  createdAt: string
}

interface PumperLoan {
  id: string
  pumperId: string
  pumperName?: string
  stationId: string
  stationName?: string
  amount: number
  loanDate: string
  notes?: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  recordedBy: string
  createdAt: string
}

export default function LoansPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [pumpers, setPumpers] = useState<Pumper[]>([])
  const [externalLoans, setExternalLoans] = useState<ExternalLoan[]>([])
  const [pumperLoans, setPumperLoans] = useState<PumperLoan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // External loan form state
  const [extSelectedStation, setExtSelectedStation] = useState('')
  const [lenderName, setLenderName] = useState('')
  const [extAmount, setExtAmount] = useState('')
  const [extLoanDate, setExtLoanDate] = useState<Date>(new Date())
  const [extNotes, setExtNotes] = useState('')
  const [extApprovedBy, setExtApprovedBy] = useState('')

  // Pumper loan form state
  const [pumpSelectedStation, setPumpSelectedStation] = useState('')
  const [selectedPumper, setSelectedPumper] = useState('')
  const [pumpAmount, setPumpAmount] = useState('')
  const [pumpLoanDate, setPumpLoanDate] = useState<Date>(new Date())
  const [pumpNotes, setPumpNotes] = useState('')

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, pumpersRes, extLoansRes, pumpLoansRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/pumpers'),
          fetch('/api/loans/external?limit=10'),
          fetch('/api/loans/pumper?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const pumpersData = await pumpersRes.json()
        const extLoansData = await extLoansRes.json()
        const pumpLoansData = await pumpLoansRes.json()

        setStations(stationsData)
        setPumpers(pumpersData)
        setExternalLoans(extLoansData)
        setPumperLoans(pumpLoansData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  // Filter pumpers by selected station
  const availablePumpers = pumpers.filter(pumper => 
    pumper.stationId === pumpSelectedStation && pumper.status === 'ACTIVE'
  )

  const handleExternalLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!extSelectedStation || !lenderName || !extAmount || !extApprovedBy) {
      setError('Please fill in all required fields for external loan')
      return
    }

    const amountValue = parseFloat(extAmount)
    if (amountValue <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/loans/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: extSelectedStation,
          lenderName,
          amount: amountValue,
          loanDate: extLoanDate.toISOString(),
          notes: extNotes || undefined,
          approvedBy: extApprovedBy,
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record external loan')
      }

      const newLoan = await response.json()
      
      // Add to external loans list
      setExternalLoans(prev => [newLoan, ...prev.slice(0, 9)])
      
      // Reset form
      setExtSelectedStation('')
      setLenderName('')
      setExtAmount('')
      setExtLoanDate(new Date())
      setExtNotes('')
      setExtApprovedBy('')
      
      setSuccess('External loan recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record external loan')
    } finally {
      setLoading(false)
    }
  }

  const handlePumperLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPumper || !pumpAmount) {
      setError('Please fill in all required fields for pumper loan')
      return
    }

    const amountValue = parseFloat(pumpAmount)
    if (amountValue <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/loans/pumper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pumperId: selectedPumper,
          amount: amountValue,
          loanDate: pumpLoanDate.toISOString(),
          notes: pumpNotes || undefined,
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record pumper loan')
      }

      const newLoan = await response.json()
      
      // Add to pumper loans list
      setPumperLoans(prev => [newLoan, ...prev.slice(0, 9)])
      
      // Reset form
      setPumpSelectedStation('')
      setSelectedPumper('')
      setPumpAmount('')
      setPumpLoanDate(new Date())
      setPumpNotes('')
      
      setSuccess('Pumper loan recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record pumper loan')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'ACTIVE': return 'bg-blue-100 text-blue-800'
      case 'OVERDUE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const externalLoanColumns: Column<ExternalLoan>[] = [
    {
      key: 'loanDate' as keyof ExternalLoan,
      title: 'Date',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'stationName' as keyof ExternalLoan,
      title: 'Station',
      render: (value: unknown, row: ExternalLoan) => {
        const station = stations.find(s => s.id === row.stationId)
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{station?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'lenderName' as keyof ExternalLoan,
      title: 'Lender',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'amount' as keyof ExternalLoan,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-500" />
          <span className="font-mono font-semibold text-blue-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'approvedBy' as keyof ExternalLoan,
      title: 'Approved By',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">{value as string}</span>
      )
    },
    {
      key: 'status' as keyof ExternalLoan,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'notes' as keyof ExternalLoan,
      title: 'Notes',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600 max-w-xs truncate">
          {value as string || '-'}
        </span>
      )
    }
  ]

  const pumperLoanColumns: Column<PumperLoan>[] = [
    {
      key: 'loanDate' as keyof PumperLoan,
      title: 'Date',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm">
            {new Date(value as string).toLocaleDateString()}
          </span>
        </div>
      )
    },
    {
      key: 'pumperName' as keyof PumperLoan,
      title: 'Pumper',
      render: (value: unknown, row: PumperLoan) => {
        const pumper = pumpers.find(p => p.id === row.pumperId)
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{pumper?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'stationName' as keyof PumperLoan,
      title: 'Station',
      render: (value: unknown, row: PumperLoan) => {
        const station = stations.find(s => s.id === row.stationId)
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{station?.name || (value as string)}</span>
          </div>
        )
      }
    },
    {
      key: 'amount' as keyof PumperLoan,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-orange-500" />
          <span className="font-mono font-semibold text-orange-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'status' as keyof PumperLoan,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'notes' as keyof PumperLoan,
      title: 'Notes',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600 max-w-xs truncate">
          {value as string || '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Loans Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="external" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            External Loans
          </TabsTrigger>
          <TabsTrigger value="pumper" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pumper Loans
          </TabsTrigger>
        </TabsList>

        {/* External Loans Tab */}
        <TabsContent value="external" className="space-y-6">
          <FormCard title="Record External Loan">
            <form onSubmit={handleExternalLoanSubmit} className="space-y-6">
              {/* Station and Lender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extStation">Station *</Label>
                  <Select value={extSelectedStation} onValueChange={setExtSelectedStation} disabled={loading}>
                    <SelectTrigger id="extStation">
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {station.name} ({station.city})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lenderName">Lender Name *</Label>
                  <Input
                    id="lenderName"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    placeholder="Bank/Individual/Company name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Amount and Approved By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extAmount">Loan Amount (Rs.) *</Label>
                  <MoneyInput
                    id="extAmount"
                    value={extAmount}
                    onChange={setExtAmount}
                    placeholder="0.00"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="extApprovedBy">Approved By *</Label>
                  <Input
                    id="extApprovedBy"
                    value={extApprovedBy}
                    onChange={(e) => setExtApprovedBy(e.target.value)}
                    placeholder="Owner/Manager name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Date and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="extLoanDate">Loan Date *</Label>
                  <DateTimePicker
                    value={extLoanDate}
                    onChange={setExtLoanDate}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="extNotes">Notes</Label>
                  <Input
                    id="extNotes"
                    value={extNotes}
                    onChange={(e) => setExtNotes(e.target.value)}
                    placeholder="Purpose, terms, or other details..."
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Recording...' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Record External Loan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </FormCard>

          <FormCard title="Recent External Loans" className="p-6">
            <DataTable
              data={externalLoans}
              columns={externalLoanColumns}
              searchPlaceholder="Search external loans..."
              emptyMessage="No external loans recorded yet."
            />
          </FormCard>
        </TabsContent>

        {/* Pumper Loans Tab */}
        <TabsContent value="pumper" className="space-y-6">
          <FormCard title="Record Pumper Loan">
            <form onSubmit={handlePumperLoanSubmit} className="space-y-6">
              {/* Station and Pumper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pumpStation">Station *</Label>
                  <Select value={pumpSelectedStation} onValueChange={setPumpSelectedStation} disabled={loading}>
                    <SelectTrigger id="pumpStation">
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {station.name} ({station.city})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pumper">Pumper *</Label>
                  <Select value={selectedPumper} onValueChange={setSelectedPumper} disabled={loading || !pumpSelectedStation}>
                    <SelectTrigger id="pumper">
                      <SelectValue placeholder="Select a pumper" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePumpers.map((pumper) => (
                        <SelectItem key={pumper.id} value={pumper.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {pumper.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pumpAmount">Loan Amount (Rs.) *</Label>
                  <MoneyInput
                    id="pumpAmount"
                    value={pumpAmount}
                    onChange={setPumpAmount}
                    placeholder="0.00"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pumpLoanDate">Loan Date *</Label>
                  <DateTimePicker
                    value={pumpLoanDate}
                    onChange={setPumpLoanDate}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="pumpNotes">Notes</Label>
                <Input
                  id="pumpNotes"
                  value={pumpNotes}
                  onChange={(e) => setPumpNotes(e.target.value)}
                  placeholder="Purpose, repayment terms, or other details..."
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Recording...' : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Record Pumper Loan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </FormCard>

          <FormCard title="Recent Pumper Loans" className="p-6">
            <DataTable
              data={pumperLoans}
              columns={pumperLoanColumns}
              searchPlaceholder="Search pumper loans..."
              emptyMessage="No pumper loans recorded yet."
            />
          </FormCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
