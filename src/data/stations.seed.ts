export interface Station {
  id: string
  name: string
  address: string
  city: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const stations: Station[] = [
  {
    id: '1',
    name: 'Station 1 - Colombo',
    address: '123 Galle Road, Colombo 03',
    city: 'Colombo',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Station 2 - Kandy',
    address: '456 Peradeniya Road, Kandy',
    city: 'Kandy',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: 'Station 3 - Galle',
    address: '789 Matara Road, Galle',
    city: 'Galle',
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]

export function getStations(): Station[] {
  return stations
}

export function getStationById(id: string): Station | undefined {
  return stations.find(station => station.id === id)
}

export function getActiveStations(): Station[] {
  return stations.filter(station => station.isActive)
}

