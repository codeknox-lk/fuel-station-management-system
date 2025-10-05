'use client'

import { useState, useEffect } from 'react'
import { useStation } from '@/contexts/StationContext'
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
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/inputs/DateTimePicker'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileUploadStub } from '@/components/FileUploadStub'
import { 
  Building2, 
  DollarSign, 
  Calendar, 
  FileText, 
  Camera,
  AlertCircle, 
  CheckCircle, 
  Plus,
  Clock,
  Shield,
  User,
  Tag
} from 'lucide-react'

interface Station {
  id: string
  name: string
  city: string
}

interface Expense {
  id: string
  stationId: string
  stationName?: string
  category: string
  amount: number
  fromSafe: boolean
  approvedBy: string
  proofUrl?: string
  expenseDate: string
  description?: string
  recordedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

const expenseCategories = [
  'Fuel Transport',
  'Equipment Maintenance',
  'Utilities (Electricity/Water)',
  'Staff Salaries',
  'Office Supplies',
  'Marketing/Advertising',
  'Insurance',
  'Licenses & Permits',
  'Cleaning Supplies',
  'Security Services',
  'Vehicle Maintenance',
  'Repairs & Renovations',
  'Professional Services',
  'Miscellaneous'
]

export default function ExpensesPage() {
  const router = useRouter()
  const [stations, setStations] = useState<Station[]>([])
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const { selectedStation } = useStation()
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [fromSafe, setFromSafe] = useState(false)
  const [approvedBy, setApprovedBy] = useState('')
  const [expenseDate, setExpenseDate] = useState<Date>(new Date())
  const [description, setDescription] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stationsRes, expensesRes] = await Promise.all([
          fetch('/api/stations?active=true'),
          fetch('/api/expenses?limit=10')
        ])

        const stationsData = await stationsRes.json()
        const expensesData = await expensesRes.json()

        setStations(stationsData)
        setRecentExpenses(expensesData)
      } catch (err) {
        setError('Failed to load initial data')
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStation || !category || !amount || !approvedBy) {
      setError('Please fill in all required fields')
      return
    }

    const amountValue = parseFloat(amount)
    if (amountValue <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: selectedStation,
          category,
          amount: amountValue,
          fromSafe,
          approvedBy,
          expenseDate: expenseDate.toISOString(),
          description: description || undefined,
          proofUrl: proofFile ? `uploads/expenses/${proofFile.name}` : undefined,
          recordedBy: 'Current User' // In real app, get from auth context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to record expense')
      }

      const newExpense = await response.json()
      
      // Add to recent expenses list
      setRecentExpenses(prev => [newExpense, ...prev.slice(0, 9)])
      
      // Reset form
      setSelectedStation('')
      setCategory('')
      setAmount('')
      setFromSafe(false)
      setApprovedBy('')
      setExpenseDate(new Date())
      setDescription('')
      setProofFile(null)
      
      setSuccess('Expense recorded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      setError('Failed to record expense')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ]
    const index = category.length % colors.length
    return colors[index]
  }

  const expenseColumns: Column<Expense>[] = [
    {
      key: 'expenseDate' as keyof Expense,
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
      key: 'stationName' as keyof Expense,
      title: 'Station',
      render: (value: unknown, row: Expense) => {
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
      key: 'category' as keyof Expense,
      title: 'Category',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <Badge className={getCategoryColor(value as string)}>
            {value as string}
          </Badge>
        </div>
      )
    },
    {
      key: 'amount' as keyof Expense,
      title: 'Amount',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-red-500" />
          <span className="font-mono font-semibold text-red-700">
            Rs. {(value as number)?.toLocaleString() || 0}
          </span>
        </div>
      )
    },
    {
      key: 'fromSafe' as keyof Expense,
      title: 'From Safe',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500" />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    },
    {
      key: 'approvedBy' as keyof Expense,
      title: 'Approved By',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{value as string}</span>
        </div>
      )
    },
    {
      key: 'proofUrl' as keyof Expense,
      title: 'Proof',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Camera className="h-4 w-4 text-gray-500" />
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Yes' : 'No'}
          </Badge>
        </div>
      )
    },
    {
      key: 'status' as keyof Expense,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'description' as keyof Expense,
      title: 'Description',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600 max-w-xs truncate">
          {value as string || '-'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>

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

      <FormCard title="Record New Expense">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Station and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station">Station *</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation} disabled={loading}>
                <SelectTrigger id="station">
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
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory} disabled={loading}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {cat}
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
              <Label htmlFor="amount">Amount (Rs.) *</Label>
              <MoneyInput
                id="amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
                disabled={loading}
                required
              />
            </div>

            <div>
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <DateTimePicker
                value={expenseDate}
                onChange={setExpenseDate}
                disabled={loading}
              />
            </div>
          </div>

          {/* From Safe and Approved By */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="fromSafe"
                checked={fromSafe}
                onCheckedChange={(checked) => setFromSafe(checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="fromSafe" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Paid from Safe
              </Label>
            </div>

            <div>
              <Label htmlFor="approvedBy">Approved By *</Label>
              <Input
                id="approvedBy"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Manager/Owner name"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about the expense..."
              disabled={loading}
            />
          </div>

          {/* Proof Upload */}
          <div>
            <Label>Proof/Receipt</Label>
            <FileUploadStub
              onFileSelect={setProofFile}
              accept="image/*,.pdf"
              placeholder="Upload receipt or proof of expense"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload receipt, invoice, or other proof of expense (Image or PDF)
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/safe')} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Expense
                </>
              )}
            </Button>
          </div>
        </form>
      </FormCard>

      <FormCard title="Recent Expenses" className="p-6">
        <DataTable
          data={recentExpenses}
          columns={expenseColumns}
          searchPlaceholder="Search expenses..."
          emptyMessage="No expenses recorded yet."
        />
      </FormCard>
    </div>
  )
}

