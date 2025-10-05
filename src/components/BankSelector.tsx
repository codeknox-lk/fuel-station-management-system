'use client'

import { useState } from 'react'
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
  code: string
  color: string
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

// Mock data - in real app, this would come from API
const mockBanks: Bank[] = [
  { id: '1', name: 'Commercial Bank of Ceylon', code: 'CBC', color: 'bg-blue-100 text-blue-800' },
  { id: '2', name: 'People\'s Bank', code: 'PB', color: 'bg-green-100 text-green-800' },
  { id: '3', name: 'Sampath Bank', code: 'SB', color: 'bg-purple-100 text-purple-800' },
  { id: '4', name: 'Hatton National Bank', code: 'HNB', color: 'bg-orange-100 text-orange-800' },
  { id: '5', name: 'DFCC Bank', code: 'DFCC', color: 'bg-red-100 text-red-800' },
  { id: '6', name: 'Seylan Bank', code: 'SEY', color: 'bg-indigo-100 text-indigo-800' }
]

const mockAccounts: BankAccount[] = [
  { id: '1', bankId: '1', accountNumber: '1234567890', accountName: 'Main Account', isActive: true },
  { id: '2', bankId: '1', accountNumber: '0987654321', accountName: 'Savings Account', isActive: true },
  { id: '3', bankId: '2', accountNumber: '1122334455', accountName: 'Business Account', isActive: true },
  { id: '4', bankId: '3', accountNumber: '5566778899', accountName: 'Operations Account', isActive: true },
  { id: '5', bankId: '4', accountNumber: '9988776655', accountName: 'Reserve Account', isActive: false }
]

export function BankSelector({
  selectedBankId,
  selectedAccountId,
  onBankChange,
  onAccountChange,
  showAddButton = true,
  className
}: BankSelectorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newBank, setNewBank] = useState({ name: '', code: '' })

  const selectedBank = mockBanks.find(bank => bank.id === selectedBankId)
  const selectedAccount = mockAccounts.find(account => account.id === selectedAccountId)
  const filteredAccounts = mockAccounts.filter(account => 
    account.bankId === selectedBankId && account.isActive
  )

  const handleAddBank = () => {
    if (newBank.name && newBank.code) {
      // In real app, this would make an API call
      alert(`Bank "${newBank.name}" added successfully! (This is a mock)`)
      setNewBank({ name: '', code: '' })
      setIsAddDialogOpen(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Bank Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Bank</label>
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
              {mockBanks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{bank.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${bank.color}`}>
                      {bank.code}
                    </span>
                  </div>
                </SelectItem>
              ))}
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
                    <label className="text-sm font-medium">Bank Code</label>
                    <Input
                      value={newBank.code}
                      onChange={(e) => setNewBank(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="Enter bank code"
                      maxLength={10}
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
          <label className="text-sm font-medium text-gray-700">Account</label>
          <Select value={selectedAccountId} onValueChange={onAccountChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account">
                {selectedAccount && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{selectedAccount.accountName}</span>
                    <span className="text-sm text-gray-500">
                      {selectedAccount.accountNumber}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{account.accountName}</span>
                    <span className="text-sm text-gray-500">
                      {account.accountNumber}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Selected Bank & Account Info */}
      {selectedBank && selectedAccount && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {selectedBank.name} - {selectedAccount.accountName}
            </div>
            <div className="text-gray-500">
              Account: {selectedAccount.accountNumber}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

