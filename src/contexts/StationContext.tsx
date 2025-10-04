'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Station {
  id: string
  name: string
  address: string
  city: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface StationContextType {
  selectedStation: string
  stations: Station[]
  setSelectedStation: (stationId: string) => void
  getSelectedStation: () => Station | null
  isAllStations: boolean
}

const StationContext = createContext<StationContextType | undefined>(undefined)

export function StationProvider({ children }: { children: ReactNode }) {
  const [selectedStation, setSelectedStationState] = useState<string>('all')
  const [stations, setStations] = useState<Station[]>([])

  // Load stations on mount
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/stations')
        const data = await response.json()
        // Transform the data to match our interface (is_active -> isActive)
        const transformedData = data.map((station: any) => ({
          ...station,
          isActive: station.is_active,
          createdAt: station.created_at,
          updatedAt: station.updated_at
        }))
        setStations(transformedData)
      } catch (error) {
        console.error('Failed to fetch stations:', error)
        // Fallback to mock data if backend is not available
        const mockStations = [
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
          }
        ]
        setStations(mockStations)
      }
    }
    fetchStations()
  }, [])

  // Load selected station from localStorage on mount
  useEffect(() => {
    const savedStation = localStorage.getItem('selectedStation')
    if (savedStation) {
      setSelectedStationState(savedStation)
    }
  }, [])

  const setSelectedStation = (stationId: string) => {
    setSelectedStationState(stationId)
    localStorage.setItem('selectedStation', stationId)
    
    // Emit custom event for backward compatibility
    window.dispatchEvent(new CustomEvent('stationChanged', { detail: { stationId } }))
  }

  const getSelectedStation = () => {
    if (selectedStation === 'all') return null
    return stations.find(s => s.id === selectedStation) || null
  }

  const isAllStations = selectedStation === 'all'

  return (
    <StationContext.Provider
      value={{
        selectedStation,
        stations,
        setSelectedStation,
        getSelectedStation,
        isAllStations
      }}
    >
      {children}
    </StationContext.Provider>
  )
}

export function useStation() {
  const context = useContext(StationContext)
  if (context === undefined) {
    throw new Error('useStation must be used within a StationProvider')
  }
  return context
}
