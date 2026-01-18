// Shared type definitions for the application

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




