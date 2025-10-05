export interface Tank {
  id: string
  stationId: string
  fuelType: 'PETROL_92' | 'PETROL_95' | 'DIESEL' | 'SUPER_DIESEL' | 'OIL'
  capacity: number // in liters
  currentLevel: number // in liters
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Pump {
  id: string
  stationId: string
  pumpNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Nozzle {
  id: string
  pumpId: string
  tankId: string
  nozzleNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const tanks: Tank[] = [
  {
    id: '1',
    stationId: '1',
    fuelType: 'PETROL_92',
    capacity: 10000,
    currentLevel: 8500,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    fuelType: 'PETROL_95',
    capacity: 8000,
    currentLevel: 7200,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    stationId: '1',
    fuelType: 'DIESEL',
    capacity: 12000,
    currentLevel: 1800, // Low level for testing alerts
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    stationId: '1',
    fuelType: 'SUPER_DIESEL',
    capacity: 6000,
    currentLevel: 4800,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    stationId: '2',
    fuelType: 'PETROL_92',
    capacity: 10000,
    currentLevel: 9200,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    stationId: '2',
    fuelType: 'DIESEL',
    capacity: 12000,
    currentLevel: 10800,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  // Oil tanks (book stock only - no dipping)
  {
    id: '7',
    stationId: '1',
    fuelType: 'OIL',
    capacity: 2000,
    currentLevel: 1500, // Book stock only
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '8',
    stationId: '2',
    fuelType: 'OIL',
    capacity: 1500,
    currentLevel: 1200, // Book stock only
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const pumps: Pump[] = [
  {
    id: '1',
    stationId: '1',
    pumpNumber: 'P1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    stationId: '1',
    pumpNumber: 'P2',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    stationId: '1',
    pumpNumber: 'P3',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    stationId: '1',
    pumpNumber: 'P4',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    stationId: '2',
    pumpNumber: 'P1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    stationId: '2',
    pumpNumber: 'P2',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export const nozzles: Nozzle[] = [
  // Station 1 nozzles
  { id: '1', pumpId: '1', tankId: '1', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '2', pumpId: '1', tankId: '2', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '3', pumpId: '2', tankId: '3', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '4', pumpId: '2', tankId: '4', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '5', pumpId: '3', tankId: '1', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '6', pumpId: '3', tankId: '3', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '7', pumpId: '4', tankId: '2', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '8', pumpId: '4', tankId: '4', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  // Station 2 nozzles
  { id: '9', pumpId: '5', tankId: '5', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '10', pumpId: '5', tankId: '6', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '11', pumpId: '6', tankId: '5', nozzleNumber: 'N1', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '12', pumpId: '6', tankId: '6', nozzleNumber: 'N2', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
]

export function getTanks(): Tank[] {
  return tanks
}

export function getTanksByStationId(stationId: string): Tank[] {
  return tanks.filter(tank => tank.stationId === stationId && tank.isActive)
}

export function getTankById(id: string): Tank | undefined {
  return tanks.find(tank => tank.id === id)
}

export function getPumps(): Pump[] {
  return pumps
}

export function getPumpsByStationId(stationId: string): Pump[] {
  return pumps.filter(pump => pump.stationId === stationId && pump.isActive)
}

export function getPumpById(id: string): Pump | undefined {
  return pumps.find(pump => pump.id === id)
}

export function getNozzles(): Nozzle[] {
  return nozzles
}

export function getNozzlesByPumpId(pumpId: string): Nozzle[] {
  return nozzles.filter(nozzle => nozzle.pumpId === pumpId && nozzle.isActive)
}

export function getNozzlesByTankId(tankId: string): Nozzle[] {
  return nozzles.filter(nozzle => nozzle.tankId === tankId && nozzle.isActive)
}

export function getNozzleById(id: string): Nozzle | undefined {
  return nozzles.find(nozzle => nozzle.id === id)
}

// Enhanced nozzle functions that include fuel type and pump information
export function getNozzlesWithFuelType(): (Nozzle & { fuelType: string; pumpNumber: string })[] {
  return nozzles.map(nozzle => {
    const tank = tanks.find(t => t.id === nozzle.tankId)
    const pump = pumps.find(p => p.id === nozzle.pumpId)
    return {
      ...nozzle,
      fuelType: tank?.fuelType || 'UNKNOWN',
      pumpNumber: pump?.pumpNumber || 'UNKNOWN'
    }
  })
}

export function getNozzlesByStationIdWithFuelType(stationId: string): (Nozzle & { fuelType: string; pumpNumber: string })[] {
  const stationTanks = tanks.filter(tank => tank.stationId === stationId && tank.isActive)
  const stationTankIds = stationTanks.map(tank => tank.id)
  
  return nozzles
    .filter(nozzle => stationTankIds.includes(nozzle.tankId) && nozzle.isActive)
    .map(nozzle => {
      const tank = tanks.find(t => t.id === nozzle.tankId)
      const pump = pumps.find(p => p.id === nozzle.pumpId)
      return {
        ...nozzle,
        fuelType: tank?.fuelType || 'UNKNOWN',
        pumpNumber: pump?.pumpNumber || 'UNKNOWN'
      }
    })
}
