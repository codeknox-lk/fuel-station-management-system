export interface SafeLedgerEntry {
  id: string
  stationId: string
  date: string
  openingBalance: number
  cashIn: number
  cashOut: number
  closingBalance: number
  deposits: number
  withdrawals: number
  expenses: number
  loansGiven: number
  loansRepaid: number
  creditSales: number
  creditRepayments: number
  chequeReceived: number
  chequeEncashed: number
  variance: number
  isBalanced: boolean
  reconciledBy?: string
  reconciledAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export const safeLedgerEntries: SafeLedgerEntry[] = [
  {
    id: '1',
    stationId: '1',
    date: '2024-10-01',
    openingBalance: 50000,
    cashIn: 1250000, // Sales from shift
    cashOut: 15000, // Expenses
    closingBalance: 1285000,
    deposits: 100000, // Bank deposit
    withdrawals: 0,
    expenses: 15000, // Maintenance
    loansGiven: 0,
    loansRepaid: 5000, // Pumper loan repayment
    creditSales: 50000, // Credit sales
    creditRepayments: 25000, // Credit repayments in cash
    chequeReceived: 50000, // Cheque received
    chequeEncashed: 50000, // Cheque encashed
    variance: 0,
    isBalanced: true,
    reconciledBy: 'Manager John',
    reconciledAt: '2024-10-01T18:30:00Z',
    notes: 'All transactions balanced',
    createdAt: '2024-10-01T18:30:00Z',
    updatedAt: '2024-10-01T18:30:00Z'
  },
  {
    id: '2',
    stationId: '1',
    date: '2024-09-30',
    openingBalance: 45000,
    cashIn: 1100000,
    cashOut: 25000,
    closingBalance: 1125000,
    deposits: 75000,
    withdrawals: 0,
    expenses: 25000, // Electricity bill
    loansGiven: 10000, // Pumper loan
    loansRepaid: 0,
    creditSales: 75000,
    creditRepayments: 100000, // Cheque payment
    chequeReceived: 100000,
    chequeEncashed: 0, // Pending encashment
    variance: 0,
    isBalanced: true,
    reconciledBy: 'Manager Jane',
    reconciledAt: '2024-09-30T18:30:00Z',
    notes: 'Cheque pending encashment',
    createdAt: '2024-09-30T18:30:00Z',
    updatedAt: '2024-09-30T18:30:00Z'
  },
  {
    id: '3',
    stationId: '2',
    date: '2024-10-01',
    openingBalance: 75000,
    cashIn: 1500000,
    cashOut: 12000,
    closingBalance: 1563000,
    deposits: 125000,
    withdrawals: 0,
    expenses: 12000, // Generator service
    loansGiven: 0,
    loansRepaid: 0,
    creditSales: 30000,
    creditRepayments: 15000,
    chequeReceived: 30000,
    chequeEncashed: 30000,
    variance: 0,
    isBalanced: true,
    reconciledBy: 'Manager Mike',
    reconciledAt: '2024-10-01T18:30:00Z',
    notes: 'All transactions balanced',
    createdAt: '2024-10-01T18:30:00Z',
    updatedAt: '2024-10-01T18:30:00Z'
  }
]

export function getSafeLedgerEntries(): SafeLedgerEntry[] {
  return safeLedgerEntries
}

export function getSafeLedgerEntriesByStationId(stationId: string): SafeLedgerEntry[] {
  return safeLedgerEntries.filter(entry => entry.stationId === stationId)
}

export function getSafeLedgerEntriesByDateRange(startDate: string, endDate: string): SafeLedgerEntry[] {
  return safeLedgerEntries.filter(entry => {
    const entryDate = new Date(entry.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return entryDate >= start && entryDate <= end
  })
}

export function getSafeLedgerEntryById(id: string): SafeLedgerEntry | undefined {
  return safeLedgerEntries.find(entry => entry.id === id)
}

export function getSafeLedgerEntryByDate(stationId: string, date: string): SafeLedgerEntry | undefined {
  return safeLedgerEntries.find(entry => 
    entry.stationId === stationId && entry.date === date
  )
}

export function getSafeSummary(stationId: string, date?: string): {
  currentBalance: number
  totalCashIn: number
  totalCashOut: number
  totalDeposits: number
  totalExpenses: number
  totalLoansGiven: number
  totalLoansRepaid: number
  totalCreditSales: number
  totalCreditRepayments: number
  totalChequeReceived: number
  totalChequeEncashed: number
  pendingCheques: number
  isBalanced: boolean
  lastReconciled?: string
} {
  const entries = date 
    ? safeLedgerEntries.filter(entry => entry.stationId === stationId && entry.date === date)
    : safeLedgerEntries.filter(entry => entry.stationId === stationId)

  if (entries.length === 0) {
    return {
      currentBalance: 0,
      totalCashIn: 0,
      totalCashOut: 0,
      totalDeposits: 0,
      totalExpenses: 0,
      totalLoansGiven: 0,
      totalLoansRepaid: 0,
      totalCreditSales: 0,
      totalCreditRepayments: 0,
      totalChequeReceived: 0,
      totalChequeEncashed: 0,
      pendingCheques: 0,
      isBalanced: true
    }
  }

  const latestEntry = entries.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0]

  const totalCashIn = entries.reduce((sum, entry) => sum + entry.cashIn, 0)
  const totalCashOut = entries.reduce((sum, entry) => sum + entry.cashOut, 0)
  const totalDeposits = entries.reduce((sum, entry) => sum + entry.deposits, 0)
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.expenses, 0)
  const totalLoansGiven = entries.reduce((sum, entry) => sum + entry.loansGiven, 0)
  const totalLoansRepaid = entries.reduce((sum, entry) => sum + entry.loansRepaid, 0)
  const totalCreditSales = entries.reduce((sum, entry) => sum + entry.creditSales, 0)
  const totalCreditRepayments = entries.reduce((sum, entry) => sum + entry.creditRepayments, 0)
  const totalChequeReceived = entries.reduce((sum, entry) => sum + entry.chequeReceived, 0)
  const totalChequeEncashed = entries.reduce((sum, entry) => sum + entry.chequeEncashed, 0)
  const pendingCheques = totalChequeReceived - totalChequeEncashed

  return {
    currentBalance: latestEntry.closingBalance,
    totalCashIn,
    totalCashOut,
    totalDeposits,
    totalExpenses,
    totalLoansGiven,
    totalLoansRepaid,
    totalCreditSales,
    totalCreditRepayments,
    totalChequeReceived,
    totalChequeEncashed,
    pendingCheques,
    isBalanced: latestEntry.isBalanced,
    lastReconciled: latestEntry.reconciledAt
  }
}

