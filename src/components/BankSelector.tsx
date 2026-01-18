'use client'

import { useState, useEffect } from 'react'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Building2, CreditCard } from 'lucide-react'

interface Bank {
  id: string
  name: string
  branch?: string | null
  accountNumber?: string | null
  isActive: boolean
}

interface BankAccount {
  id: string
  bankId: string
  accountNumber: string
  accountName: string
  isActive: boolean
}

interface BankSelectorProps {
  selectedBankId?: string
  selectedAccountId?: string
  onBankChange?: (bankId: string) => void
  onAccountChange?: (accountId: string) => void
  showAddButton?: boolean
  className?: string
}

export function BankSelector({
  selectedBankId,
  selectedAccountId,
  onBankChange,
  onAccountChange,
  showAddButton = true,
  className
}: BankSelectorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newBank, setNewBank] = useState({ name: '', branch: '', accountNumber: '' })
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch banks from API
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/banks?active=true')
        if (response.ok) {
          const data = await response.json()
          setBanks(data)
        }
      } catch (error) {
        console.error('Error fetching banks:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBanks()
  }, [])

  const selectedBank = banks.find(bank => bank.id === selectedBankId)
  // Note: Bank accounts are not yet implemented in the API
  // This component uses bank.accountNumber as a placeholder
  const selectedAccount = selectedBank?.accountNumber ? {
    id: selectedBank.id,
    bankId: selectedBank.id,
    accountNumber: selectedBank.accountNumber,
    accountName: `${selectedBank.name} Account`,
    isActive: true
  } : undefined

  const handleAddBank = async () => {
    if (newBank.name) {
      try {
        const response = await fetch('/api/banks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newBank.name,
            branch: newBank.branch || null,
            accountNumber: newBank.accountNumber || null
          })
        })
        if (response.ok) {
          const newBankData = await response.json()
          setBanks([...banks, newBankData])
          setNewBank({ name: '', branch: '', accountNumber: '' })
          setIsAddDialogOpen(false)
          if (onBankChange) {
            onBankChange(newBankData.id)
          }
        } else {
          alert('Failed to add bank. Please try again.')
        }
      } catch (error) {
        console.error('Error adding bank:', error)
        alert('Error adding bank. Please try again.')
      }
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bank Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Bank</label>
        <div className="flex gap-2">
          <Select value={selectedBankId} onValueChange={onBankChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a bank">
                {selectedBank && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{selectedBank.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${selectedBank.color}`}>
                      {selectedBank.code}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <SelectItem value="loading" disabled>Loading banks...</SelectItem>
              ) : banks.length === 0 ? (
                <SelectItem value="none" disabled>No banks available</SelectItem>
              ) : (
                banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{bank.name}</span>
                      {bank.branch && (
                        <span className="text-xs text-muted-foreground">
                          ({bank.branch})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          
          {showAddButton && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bank</DialogTitle>
                  <DialogDescription>
                    Add a new bank to the system for POS and deposit tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Bank Name</label>
                    <Input
                      value={newBank.name}
                      onChange={(e) => setNewBank(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Branch (Optional)</label>
                    <Input
                      value={newBank.branch}
                      onChange={(e) => setNewBank(prev => ({ ...prev, branch: e.target.value }))}
                      placeholder="Enter branch name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Account Number (Optional)</label>
                    <Input
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Enter account number"
                    />
                  </div>
                  <Button onClick={handleAddBank} className="w-full">
                    Add Bank
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Account Selection */}
      {selectedBankId && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Account</label>
          <Select value={selectedAccountId} onValueChange={onAccountChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account">
                {selectedAccount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{selectedAccount.accountName}</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedAccount.accountNumber}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectedBank?.accountNumber ? (
                <SelectItem value={selectedBank.id}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{selectedBank.accountNumber}</span>
                    {selectedBank.branch && (
                      <span className="text-sm text-muted-foreground">
                        ({selectedBank.branch})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ) : (
                <SelectItem value="none" disabled>No account available for this bank</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Bank & Account Info */}
      {selectedBank && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm">
            <div className="font-medium text-foreground">
              {selectedBank.name}
              {selectedBank.branch && ` - ${selectedBank.branch}`}
            </div>
            {selectedBank.accountNumber && (
              <div className="text-muted-foreground">
                Account: {selectedBank.accountNumber}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

