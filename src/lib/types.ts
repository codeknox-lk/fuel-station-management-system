// Shared type definitions for the application

export interface Fuel {
  id: string
  code: string
  name: string
  category: string
  description?: string | null
  icon?: string | null
  isActive: boolean
  sortOrder: number
}

export interface Price {
  id: string
  fuelId: string
  fuel?: Fuel
  price: number // per liter in LKR
  effectiveFrom: string // ISO datetime
  effectiveTo?: string // ISO datetime, null for current price
  isActive: boolean
  createdAt: string
  updatedAt: string
}




