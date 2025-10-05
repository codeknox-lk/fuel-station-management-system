export interface OilSale {
  id: string
  stationId: string
  shiftId?: string
  oilType: string // e.g., "Engine Oil 20W-50", "Brake Oil", etc.
  quantity: number // in litres
  unitPrice: number // per litre
  totalAmount: number
  soldBy: string
  soldAt: string
  paymentMethod: 'CASH' | 'CARD' | 'CREDIT'
  customerName?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Mock oil sales data
export const oilSales: OilSale[] = [
  {
    id: '1',
    stationId: '1',
    shiftId: '1',
    oilType: 'Engine Oil 20W-50',
    quantity: 4,
    unitPrice: 2500,
    totalAmount: 10000,
    soldBy: 'Kamal Perera',
    soldAt: '2024-01-15T10:30:00Z',
    paymentMethod: 'CASH',
    customerName: 'Mr. Silva',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    stationId: '1',
    shiftId: '1',
    oilType: 'Brake Oil DOT 4',
    quantity: 1,
    unitPrice: 1800,
    totalAmount: 1800,
    soldBy: 'Nimal Fernando',
    soldAt: '2024-01-15T14:15:00Z',
    paymentMethod: 'CARD',
    customerName: 'Mrs. Perera',
    createdAt: '2024-01-15T14:15:00Z',
    updatedAt: '2024-01-15T14:15:00Z'
  },
  {
    id: '3',
    stationId: '2',
    shiftId: '2',
    oilType: 'Engine Oil 15W-40',
    quantity: 6,
    unitPrice: 2200,
    totalAmount: 13200,
    soldBy: 'Sunil Jayasinghe',
    soldAt: '2024-01-15T16:45:00Z',
    paymentMethod: 'CASH',
    customerName: 'Mr. Fernando',
    createdAt: '2024-01-15T16:45:00Z',
    updatedAt: '2024-01-15T16:45:00Z'
  },
  {
    id: '4',
    stationId: '1',
    oilType: 'Gear Oil 90',
    quantity: 2,
    unitPrice: 1500,
    totalAmount: 3000,
    soldBy: 'Kamal Perera',
    soldAt: '2024-01-16T09:20:00Z',
    paymentMethod: 'CREDIT',
    customerName: 'ABC Motors',
    createdAt: '2024-01-16T09:20:00Z',
    updatedAt: '2024-01-16T09:20:00Z'
  }
]

// Helper functions
export function getOilSales(): OilSale[] {
  return oilSales
}

export function getOilSalesByStationId(stationId: string): OilSale[] {
  return oilSales.filter(sale => sale.stationId === stationId)
}

export function getOilSalesByShiftId(shiftId: string): OilSale[] {
  return oilSales.filter(sale => sale.shiftId === shiftId)
}

export function getOilSalesByDateRange(startDate: string, endDate: string): OilSale[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return oilSales.filter(sale => {
    const saleDate = new Date(sale.soldAt)
    return saleDate >= start && saleDate <= end
  })
}

export function addOilSale(saleData: Omit<OilSale, 'id' | 'createdAt' | 'updatedAt'>): OilSale {
  const newSale: OilSale = {
    ...saleData,
    id: (oilSales.length + 1).toString(),
    totalAmount: saleData.quantity * saleData.unitPrice,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  oilSales.push(newSale)
  return newSale
}

export function updateOilSale(id: string, updates: Partial<OilSale>): OilSale | null {
  const index = oilSales.findIndex(sale => sale.id === id)
  if (index === -1) return null
  
  oilSales[index] = {
    ...oilSales[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  return oilSales[index]
}

export function deleteOilSale(id: string): boolean {
  const index = oilSales.findIndex(sale => sale.id === id)
  if (index === -1) return false
  
  oilSales.splice(index, 1)
  return true
}

// Get oil sales summary for a date range
export function getOilSalesSummary(stationId?: string, startDate?: string, endDate?: string) {
  let filteredSales = oilSales
  
  if (stationId) {
    filteredSales = filteredSales.filter(sale => sale.stationId === stationId)
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    filteredSales = filteredSales.filter(sale => {
      const saleDate = new Date(sale.soldAt)
      return saleDate >= start && saleDate <= end
    })
  }
  
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
  const totalQuantity = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)
  const salesCount = filteredSales.length
  
  const paymentBreakdown = filteredSales.reduce((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalSales,
    totalQuantity,
    salesCount,
    paymentBreakdown,
    averageSaleAmount: salesCount > 0 ? totalSales / salesCount : 0
  }
}

