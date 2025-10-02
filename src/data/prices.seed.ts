export interface Price {
  id: string
  fuelType: 'PETROL_92' | 'PETROL_95' | 'DIESEL' | 'SUPER_DIESEL' | 'OIL'
  price: number // per liter in LKR
  effectiveFrom: string // ISO datetime
  effectiveTo?: string // ISO datetime, null for current price
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const prices: Price[] = [
  {
    id: '1',
    fuelType: 'PETROL_92',
    price: 450.00,
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: '2024-01-15T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    fuelType: 'PETROL_92',
    price: 460.00,
    effectiveFrom: '2024-01-15T00:00:00Z',
    effectiveTo: '2024-02-01T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    fuelType: 'PETROL_92',
    price: 470.00,
    effectiveFrom: '2024-02-01T00:00:00Z',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '4',
    fuelType: 'PETROL_95',
    price: 480.00,
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: '2024-01-15T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    fuelType: 'PETROL_95',
    price: 490.00,
    effectiveFrom: '2024-01-15T00:00:00Z',
    effectiveTo: '2024-02-01T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '6',
    fuelType: 'PETROL_95',
    price: 500.00,
    effectiveFrom: '2024-02-01T00:00:00Z',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '7',
    fuelType: 'DIESEL',
    price: 420.00,
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: '2024-01-15T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '8',
    fuelType: 'DIESEL',
    price: 430.00,
    effectiveFrom: '2024-01-15T00:00:00Z',
    effectiveTo: '2024-02-01T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '9',
    fuelType: 'DIESEL',
    price: 440.00,
    effectiveFrom: '2024-02-01T00:00:00Z',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '10',
    fuelType: 'SUPER_DIESEL',
    price: 460.00,
    effectiveFrom: '2024-01-01T00:00:00Z',
    effectiveTo: '2024-01-15T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '11',
    fuelType: 'SUPER_DIESEL',
    price: 470.00,
    effectiveFrom: '2024-01-15T00:00:00Z',
    effectiveTo: '2024-02-01T00:00:00Z',
    isActive: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '12',
    fuelType: 'SUPER_DIESEL',
    price: 480.00,
    effectiveFrom: '2024-02-01T00:00:00Z',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  },
  {
    id: '13',
    fuelType: 'OIL',
    price: 1200.00,
    effectiveFrom: '2024-01-01T00:00:00Z',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export function getPrices(): Price[] {
  return prices
}

export function getCurrentPrices(): Price[] {
  return prices.filter(price => price.isActive)
}

export function getPriceByFuelType(fuelType: string): Price | undefined {
  return prices.find(price => price.fuelType === fuelType && price.isActive)
}

export function getPricesByFuelType(fuelType: string): Price[] {
  return prices.filter(price => price.fuelType === fuelType)
}

export function getPriceAtDateTime(fuelType: string, datetime: string): Price | undefined {
  const targetDate = new Date(datetime)
  
  return prices
    .filter(price => price.fuelType === fuelType)
    .find(price => {
      const effectiveFrom = new Date(price.effectiveFrom)
      const effectiveTo = price.effectiveTo ? new Date(price.effectiveTo) : new Date('2099-12-31T23:59:59Z')
      
      return targetDate >= effectiveFrom && targetDate <= effectiveTo
    })
}
