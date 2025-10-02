// Mock data for pumpers/employees
export interface Pumper {
  id: string
  name: string
  employeeId: string
  stationId: string
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
  shift: 'MORNING' | 'EVENING' | 'NIGHT' | 'ANY'
  phoneNumber: string
  hireDate: string
  experience: number // years
  rating: number // 1-5 stars
  specializations: string[] // e.g., ['PETROL', 'DIESEL', 'MAINTENANCE']
  createdAt: string
  updatedAt: string
}

// Mock pumpers data
const pumpers: Pumper[] = [
  {
    id: '1',
    name: 'John Silva',
    employeeId: 'EMP001',
    stationId: '1',
    status: 'ACTIVE',
    shift: 'MORNING',
    phoneNumber: '+94771234567',
    hireDate: '2022-01-15',
    experience: 3,
    rating: 4.5,
    specializations: ['PETROL', 'DIESEL'],
    createdAt: '2022-01-15T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Kamal Perera',
    employeeId: 'EMP002',
    stationId: '1',
    status: 'ACTIVE',
    shift: 'MORNING',
    phoneNumber: '+94771234568',
    hireDate: '2021-06-10',
    experience: 4,
    rating: 4.8,
    specializations: ['DIESEL', 'MAINTENANCE'],
    createdAt: '2021-06-10T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Sunil Fernando',
    employeeId: 'EMP003',
    stationId: '1',
    status: 'ACTIVE',
    shift: 'EVENING',
    phoneNumber: '+94771234569',
    hireDate: '2023-03-20',
    experience: 2,
    rating: 4.2,
    specializations: ['PETROL'],
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Ravi Kumar',
    employeeId: 'EMP004',
    stationId: '1',
    status: 'ACTIVE',
    shift: 'ANY',
    phoneNumber: '+94771234570',
    hireDate: '2020-11-05',
    experience: 5,
    rating: 4.9,
    specializations: ['PETROL', 'DIESEL', 'MAINTENANCE'],
    createdAt: '2020-11-05T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'Nimal Jayasinghe',
    employeeId: 'EMP005',
    stationId: '1',
    status: 'ACTIVE',
    shift: 'NIGHT',
    phoneNumber: '+94771234571',
    hireDate: '2022-08-12',
    experience: 3,
    rating: 4.3,
    specializations: ['PETROL', 'DIESEL'],
    createdAt: '2022-08-12T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '6',
    name: 'Chaminda Rathnayake',
    employeeId: 'EMP006',
    stationId: '1',
    status: 'ON_LEAVE',
    shift: 'MORNING',
    phoneNumber: '+94771234572',
    hireDate: '2021-12-01',
    experience: 3,
    rating: 4.1,
    specializations: ['DIESEL'],
    createdAt: '2021-12-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '7',
    name: 'Pradeep Wickramasinghe',
    employeeId: 'EMP007',
    stationId: '2',
    status: 'ACTIVE',
    shift: 'MORNING',
    phoneNumber: '+94771234573',
    hireDate: '2023-01-10',
    experience: 2,
    rating: 4.0,
    specializations: ['PETROL'],
    createdAt: '2023-01-10T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '8',
    name: 'Lakmal Gunasekara',
    employeeId: 'EMP008',
    stationId: '2',
    status: 'ACTIVE',
    shift: 'EVENING',
    phoneNumber: '+94771234574',
    hireDate: '2022-05-15',
    experience: 3,
    rating: 4.4,
    specializations: ['PETROL', 'DIESEL'],
    createdAt: '2022-05-15T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  }
]

// Helper functions
export function getAllPumpers(): Pumper[] {
  return pumpers
}

export function getPumpersByStation(stationId: string): Pumper[] {
  return pumpers.filter(pumper => pumper.stationId === stationId)
}

export function getActivePumpersByStation(stationId: string): Pumper[] {
  return pumpers.filter(pumper => 
    pumper.stationId === stationId && pumper.status === 'ACTIVE'
  )
}

export function getPumperById(id: string): Pumper | null {
  return pumpers.find(pumper => pumper.id === id) || null
}

export function getPumpersByShift(stationId: string, shift: string): Pumper[] {
  return pumpers.filter(pumper => 
    pumper.stationId === stationId && 
    pumper.status === 'ACTIVE' &&
    (pumper.shift === shift || pumper.shift === 'ANY')
  )
}

export function addPumper(pumper: Omit<Pumper, 'id' | 'createdAt' | 'updatedAt'>): Pumper {
  const newPumper: Pumper = {
    ...pumper,
    id: (pumpers.length + 1).toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  pumpers.push(newPumper)
  return newPumper
}

export function updatePumper(id: string, updates: Partial<Pumper>): Pumper | null {
  const pumperIndex = pumpers.findIndex(p => p.id === id)
  if (pumperIndex === -1) return null
  
  pumpers[pumperIndex] = {
    ...pumpers[pumperIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  
  return pumpers[pumperIndex]
}
