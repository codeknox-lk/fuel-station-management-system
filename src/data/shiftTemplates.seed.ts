export interface ShiftTemplate {
  id: string
  name: string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  duration: number // in hours
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const shiftTemplates: ShiftTemplate[] = [
  {
    id: '1',
    name: 'Day Shift',
    startTime: '06:00',
    endTime: '18:00',
    duration: 12,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Night Shift',
    startTime: '18:00',
    endTime: '06:00',
    duration: 12,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Morning Shift',
    startTime: '06:00',
    endTime: '14:00',
    duration: 8,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Evening Shift',
    startTime: '14:00',
    endTime: '22:00',
    duration: 8,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'Split Shift',
    startTime: '10:00',
    endTime: '14:00',
    duration: 4,
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export function getShiftTemplates(): ShiftTemplate[] {
  return shiftTemplates
}

export function getActiveShiftTemplates(): ShiftTemplate[] {
  return shiftTemplates.filter(template => template.isActive)
}

export function getShiftTemplateById(id: string): ShiftTemplate | undefined {
  return shiftTemplates.find(template => template.id === id)
}
