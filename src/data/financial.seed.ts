export interface Expense {
  id: string
  stationId: string
  category: string
  description: string
  amount: number
  fromSafe: boolean
  paidBy: string
  proof?: string
  expenseDate: string
  createdAt: string
  updatedAt: string
}

export interface LoanExternal {
  id: string
  stationId: string
  borrowerName: string
  borrowerPhone: string
  amount: number
  interestRate?: number
  dueDate: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface LoanPumper {
  id: string
  stationId: string
  pumperName: string
  amount: number
  reason: string
  dueDate: string
  status: 'ACTIVE' | 'PAID' | 'OVERDUE'
  createdAt: string
  updatedAt: string
}

export interface Deposit {
  id: string
  stationId: string
  amount: number
  bankId: string
  accountId: string
  depositSlip?: string
  depositedBy: string
  depositDate: string
  createdAt: string
  updatedAt: string
}

export interface Cheque {
  id: string
  stationId: string
  chequeNumber: string
  amount: number
  bankId: string
  accountId: string
  drawerName: string
  receivedDate: string
  encashmentDate?: string
  status: 'PENDING' | 'ENCASHED' | 'BOUNCED'
  notes?: string
  createdAt: string
  updatedAt: string
}

export const expenses: Expense[] = [
  {
    id: '1',
    stationId: '1',
    category: 'MAINTENANCE',
    description: 'Pump maintenance and repair',
    amount: 15000,
    fromSafe: true,
    paidBy: 'Manager John',
    proof: 'receipt_1.pdf',
    expenseDate: '2024-10-01T10:00:00Z',
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    category: 'UTILITIES',
    description: 'Electricity bill',
    amount: 25000,
    fromSafe: false,
    paidBy: 'Manager John',
    proof: 'bill_1.pdf',
    expenseDate: '2024-10-01T11:00:00Z',
    createdAt: '2024-10-01T11:00:00Z',
    updatedAt: '2024-10-01T11:00:00Z'
  },
  {
    id: '3',
    stationId: '1',
    category: 'SUPPLIES',
    description: 'Cleaning supplies and equipment',
    amount: 5000,
    fromSafe: true,
    paidBy: 'Manager Jane',
    expenseDate: '2024-10-01T14:00:00Z',
    createdAt: '2024-10-01T14:00:00Z',
    updatedAt: '2024-10-01T14:00:00Z'
  },
  {
    id: '4',
    stationId: '2',
    category: 'MAINTENANCE',
    description: 'Generator service',
    amount: 12000,
    fromSafe: true,
    paidBy: 'Manager Mike',
    proof: 'receipt_2.pdf',
    expenseDate: '2024-10-01T09:00:00Z',
    createdAt: '2024-10-01T09:00:00Z',
    updatedAt: '2024-10-01T09:00:00Z'
  }
]

export const loansExternal: LoanExternal[] = [
  {
    id: '1',
    stationId: '1',
    borrowerName: 'Rajesh Kumar',
    borrowerPhone: '+94 77 123 4567',
    amount: 50000,
    interestRate: 12,
    dueDate: '2024-12-01T00:00:00Z',
    status: 'ACTIVE',
    notes: 'Emergency loan for business',
    createdAt: '2024-09-01T00:00:00Z',
    updatedAt: '2024-09-01T00:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    borrowerName: 'Priya Silva',
    borrowerPhone: '+94 71 234 5678',
    amount: 25000,
    dueDate: '2024-10-15T00:00:00Z',
    status: 'OVERDUE',
    notes: 'Personal loan',
    createdAt: '2024-08-15T00:00:00Z',
    updatedAt: '2024-08-15T00:00:00Z'
  },
  {
    id: '3',
    stationId: '2',
    borrowerName: 'Suresh Fernando',
    borrowerPhone: '+94 76 345 6789',
    amount: 75000,
    interestRate: 10,
    dueDate: '2024-11-30T00:00:00Z',
    status: 'ACTIVE',
    notes: 'Business expansion loan',
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2024-09-15T00:00:00Z'
  }
]

export const loansPumper: LoanPumper[] = [
  {
    id: '1',
    stationId: '1',
    pumperName: 'Kamal Perera',
    amount: 10000,
    reason: 'Medical emergency',
    dueDate: '2024-10-15T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2024-09-15T00:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    pumperName: 'Nimal Silva',
    amount: 5000,
    reason: 'Family emergency',
    dueDate: '2024-10-10T00:00:00Z',
    status: 'PAID',
    createdAt: '2024-09-10T00:00:00Z',
    updatedAt: '2024-10-10T00:00:00Z'
  },
  {
    id: '3',
    stationId: '2',
    pumperName: 'Sunil Fernando',
    amount: 15000,
    reason: 'Vehicle repair',
    dueDate: '2024-11-01T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  }
]

export const deposits: Deposit[] = [
  {
    id: '1',
    stationId: '1',
    amount: 100000,
    bankId: '1',
    accountId: '1',
    depositSlip: 'deposit_1.jpg',
    depositedBy: 'Manager John',
    depositDate: '2024-10-01T16:00:00Z',
    createdAt: '2024-10-01T16:00:00Z',
    updatedAt: '2024-10-01T16:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    amount: 75000,
    bankId: '2',
    accountId: '3',
    depositSlip: 'deposit_2.jpg',
    depositedBy: 'Manager Jane',
    depositDate: '2024-09-30T15:30:00Z',
    createdAt: '2024-09-30T15:30:00Z',
    updatedAt: '2024-09-30T15:30:00Z'
  },
  {
    id: '3',
    stationId: '2',
    amount: 125000,
    bankId: '1',
    accountId: '1',
    depositSlip: 'deposit_3.jpg',
    depositedBy: 'Manager Mike',
    depositDate: '2024-10-01T17:00:00Z',
    createdAt: '2024-10-01T17:00:00Z',
    updatedAt: '2024-10-01T17:00:00Z'
  }
]

export const cheques: Cheque[] = [
  {
    id: '1',
    stationId: '1',
    chequeNumber: 'CHQ001234',
    amount: 50000,
    bankId: '1',
    accountId: '1',
    drawerName: 'ABC Company Ltd',
    receivedDate: '2024-09-30T10:00:00Z',
    encashmentDate: '2024-10-01T14:00:00Z',
    status: 'ENCASHED',
    notes: 'Payment for credit sales',
    createdAt: '2024-09-30T10:00:00Z',
    updatedAt: '2024-10-01T14:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    chequeNumber: 'CHQ001235',
    amount: 25000,
    bankId: '2',
    accountId: '3',
    drawerName: 'XYZ Transport',
    receivedDate: '2024-10-01T11:00:00Z',
    status: 'PENDING',
    notes: 'Credit payment',
    createdAt: '2024-10-01T11:00:00Z',
    updatedAt: '2024-10-01T11:00:00Z'
  },
  {
    id: '3',
    stationId: '2',
    chequeNumber: 'CHQ001236',
    amount: 30000,
    bankId: '3',
    accountId: '4',
    drawerName: 'DEF Logistics',
    receivedDate: '2024-09-29T15:00:00Z',
    status: 'BOUNCED',
    notes: 'Insufficient funds',
    createdAt: '2024-09-29T15:00:00Z',
    updatedAt: '2024-10-01T09:00:00Z'
  }
]

export function getExpenses(): Expense[] {
  return expenses
}

export function getExpensesByStationId(stationId: string): Expense[] {
  return expenses.filter(expense => expense.stationId === stationId)
}

export function getExpenseById(id: string): Expense | undefined {
  return expenses.find(expense => expense.id === id)
}

export function getLoansExternal(): LoanExternal[] {
  return loansExternal
}

export function getLoansExternalByStationId(stationId: string): LoanExternal[] {
  return loansExternal.filter(loan => loan.stationId === stationId)
}

export function getLoanExternalById(id: string): LoanExternal | undefined {
  return loansExternal.find(loan => loan.id === id)
}

export function getLoansPumper(): LoanPumper[] {
  return loansPumper
}

export function getLoansPumperByStationId(stationId: string): LoanPumper[] {
  return loansPumper.filter(loan => loan.stationId === stationId)
}

export function getLoanPumperById(id: string): LoanPumper | undefined {
  return loansPumper.find(loan => loan.id === id)
}

export function getDeposits(): Deposit[] {
  return deposits
}

export function getDepositsByStationId(stationId: string): Deposit[] {
  return deposits.filter(deposit => deposit.stationId === stationId)
}

export function getDepositById(id: string): Deposit | undefined {
  return deposits.find(deposit => deposit.id === id)
}

export function getCheques(): Cheque[] {
  return cheques
}

export function getChequesByStationId(stationId: string): Cheque[] {
  return cheques.filter(cheque => cheque.stationId === stationId)
}

export function getChequeById(id: string): Cheque | undefined {
  return cheques.find(cheque => cheque.id === id)
}
