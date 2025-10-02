export interface CreditCustomer {
  id: string
  name: string
  company?: string
  address: string
  phone: string
  email?: string
  creditLimit: number
  currentBalance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreditSale {
  id: string
  customerId: string
  shiftId: string
  nozzleId: string
  amount: number
  liters: number
  price: number
  slipPhoto?: string
  signedBy: string
  timestamp: string
  createdAt: string
  updatedAt: string
}

export interface CreditPayment {
  id: string
  customerId: string
  amount: number
  paymentType: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
  chequeNumber?: string
  bankId?: string
  paymentDate: string
  receivedBy: string
  createdAt: string
  updatedAt: string
}

export const creditCustomers: CreditCustomer[] = [
  {
    id: '1',
    name: 'ABC Company Ltd',
    company: 'ABC Company Ltd',
    address: '123 Business Street, Colombo 03',
    phone: '+94 11 234 5678',
    email: 'accounts@abccompany.lk',
    creditLimit: 100000,
    currentBalance: 25000,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'XYZ Transport',
    company: 'XYZ Transport',
    address: '456 Transport Road, Colombo 05',
    phone: '+94 11 345 6789',
    email: 'finance@xyztransport.lk',
    creditLimit: 200000,
    currentBalance: 150000,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'John Silva',
    company: 'Silva & Sons',
    address: '789 Main Street, Kandy',
    phone: '+94 81 456 7890',
    email: 'john@silva.lk',
    creditLimit: 50000,
    currentBalance: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'DEF Logistics',
    company: 'DEF Logistics',
    address: '321 Logistics Lane, Galle',
    phone: '+94 91 567 8901',
    email: 'admin@deflogistics.lk',
    creditLimit: 150000,
    currentBalance: 75000,
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const creditSales: CreditSale[] = [
  {
    id: '1',
    customerId: '1',
    shiftId: '1',
    nozzleId: '1',
    amount: 50000,
    liters: 100,
    price: 500,
    slipPhoto: 'slip_1.jpg',
    signedBy: 'Manager John',
    timestamp: '2024-10-01T10:30:00Z',
    createdAt: '2024-10-01T10:30:00Z',
    updatedAt: '2024-10-01T10:30:00Z'
  },
  {
    id: '2',
    customerId: '2',
    shiftId: '1',
    nozzleId: '3',
    amount: 75000,
    liters: 150,
    price: 500,
    slipPhoto: 'slip_2.jpg',
    signedBy: 'Manager John',
    timestamp: '2024-10-01T14:15:00Z',
    createdAt: '2024-10-01T14:15:00Z',
    updatedAt: '2024-10-01T14:15:00Z'
  },
  {
    id: '3',
    customerId: '1',
    shiftId: '2',
    nozzleId: '2',
    amount: 30000,
    liters: 60,
    price: 500,
    slipPhoto: 'slip_3.jpg',
    signedBy: 'Manager Jane',
    timestamp: '2024-10-01T20:45:00Z',
    createdAt: '2024-10-01T20:45:00Z',
    updatedAt: '2024-10-01T20:45:00Z'
  }
]

export const creditPayments: CreditPayment[] = [
  {
    id: '1',
    customerId: '1',
    amount: 25000,
    paymentType: 'CASH',
    paymentDate: '2024-09-30T15:00:00Z',
    receivedBy: 'Manager John',
    createdAt: '2024-09-30T15:00:00Z',
    updatedAt: '2024-09-30T15:00:00Z'
  },
  {
    id: '2',
    customerId: '2',
    amount: 100000,
    paymentType: 'CHEQUE',
    chequeNumber: 'CHQ001234',
    bankId: '1',
    paymentDate: '2024-09-29T10:00:00Z',
    receivedBy: 'Manager Jane',
    createdAt: '2024-09-29T10:00:00Z',
    updatedAt: '2024-09-29T10:00:00Z'
  },
  {
    id: '3',
    customerId: '3',
    amount: 15000,
    paymentType: 'BANK_TRANSFER',
    bankId: '2',
    paymentDate: '2024-09-28T14:30:00Z',
    receivedBy: 'Manager John',
    createdAt: '2024-09-28T14:30:00Z',
    updatedAt: '2024-09-28T14:30:00Z'
  }
]

export function getCreditCustomers(): CreditCustomer[] {
  return creditCustomers
}

export function getActiveCreditCustomers(): CreditCustomer[] {
  return creditCustomers.filter(customer => customer.isActive)
}

export function getCreditCustomerById(id: string): CreditCustomer | undefined {
  return creditCustomers.find(customer => customer.id === id)
}

export function getCreditSales(): CreditSale[] {
  return creditSales
}

export function getCreditSalesByCustomerId(customerId: string): CreditSale[] {
  return creditSales.filter(sale => sale.customerId === customerId)
}

export function getCreditSalesByShiftId(shiftId: string): CreditSale[] {
  return creditSales.filter(sale => sale.shiftId === shiftId)
}

export function getCreditSaleById(id: string): CreditSale | undefined {
  return creditSales.find(sale => sale.id === id)
}

export function getCreditPayments(): CreditPayment[] {
  return creditPayments
}

export function getCreditPaymentsByCustomerId(customerId: string): CreditPayment[] {
  return creditPayments.filter(payment => payment.customerId === customerId)
}

export function getCreditPaymentById(id: string): CreditPayment | undefined {
  return creditPayments.find(payment => payment.id === id)
}

export function getCreditAging(): Array<{
  customerId: string
  customerName: string
  currentBalance: number
  creditLimit: number
  utilizationPercentage: number
  lastPaymentDate?: string
  daysSinceLastPayment?: number
}> {
  return creditCustomers.map(customer => {
    const payments = getCreditPaymentsByCustomerId(customer.id)
    const lastPayment = payments.sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    )[0]
    
    const daysSinceLastPayment = lastPayment 
      ? Math.floor((Date.now() - new Date(lastPayment.paymentDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined
    
    return {
      customerId: customer.id,
      customerName: customer.name,
      currentBalance: customer.currentBalance,
      creditLimit: customer.creditLimit,
      utilizationPercentage: (customer.currentBalance / customer.creditLimit) * 100,
      lastPaymentDate: lastPayment?.paymentDate,
      daysSinceLastPayment
    }
  })
}
