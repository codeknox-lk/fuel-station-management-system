export interface Bank {
  id: string
  name: string
  code: string
  color: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BankAccount {
  id: string
  bankId: string
  accountNumber: string
  accountName: string
  accountType: 'CURRENT' | 'SAVINGS' | 'BUSINESS'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const banks: Bank[] = [
  {
    id: '1',
    name: 'Commercial Bank of Ceylon',
    code: 'CBC',
    color: 'bg-blue-100 text-blue-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'People\'s Bank',
    code: 'PB',
    color: 'bg-green-100 text-green-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Sampath Bank',
    code: 'SB',
    color: 'bg-purple-100 text-purple-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Hatton National Bank',
    code: 'HNB',
    color: 'bg-orange-100 text-orange-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'DFCC Bank',
    code: 'DFCC',
    color: 'bg-red-100 text-red-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    name: 'Seylan Bank',
    code: 'SEY',
    color: 'bg-indigo-100 text-indigo-800',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const bankAccounts: BankAccount[] = [
  {
    id: '1',
    bankId: '1',
    accountNumber: '1234567890',
    accountName: 'Main Account',
    accountType: 'CURRENT',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    bankId: '1',
    accountNumber: '0987654321',
    accountName: 'Savings Account',
    accountType: 'SAVINGS',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    bankId: '2',
    accountNumber: '1122334455',
    accountName: 'Business Account',
    accountType: 'BUSINESS',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    bankId: '3',
    accountNumber: '5566778899',
    accountName: 'Operations Account',
    accountType: 'CURRENT',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    bankId: '4',
    accountNumber: '9988776655',
    accountName: 'Reserve Account',
    accountType: 'SAVINGS',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export function getBanks(): Bank[] {
  return banks
}

export function getBankById(id: string): Bank | undefined {
  return banks.find(bank => bank.id === id)
}

export function getActiveBanks(): Bank[] {
  return banks.filter(bank => bank.isActive)
}

export function getBankAccounts(): BankAccount[] {
  return bankAccounts
}

export function getBankAccountsByBankId(bankId: string): BankAccount[] {
  return bankAccounts.filter(account => account.bankId === bankId && account.isActive)
}

export function getBankAccountById(id: string): BankAccount | undefined {
  return bankAccounts.find(account => account.id === id)
}

