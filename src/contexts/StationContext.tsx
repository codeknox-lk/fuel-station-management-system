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
  isLoading: boolean
}

const StationContext = createContext<StationContextType | undefined>(undefined)

export function StationProvider({ children }: { children: ReactNode }) {
  const [selectedStation, setSelectedStationState] = useState<string>('all')
  const [stations, setStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load stations and hydration
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)

        // 1. Fetch Stations
        const response = await fetch('/api/stations?active=true')
        let fetchedStations: Station[] = []
        if (response.ok) {
          const data = await response.json()
          fetchedStations = Array.isArray(data) ? data : []
          setStations(fetchedStations)
        }

        // 2. Check User Role & Station Restriction
        const userRole = localStorage.getItem('userRole')
        const assignedStationId = localStorage.getItem('stationId')

        if (userRole === 'MANAGER' && assignedStationId) {
          // MANAGER RESTRICTION:
          // 1. Filter stations to only the assigned one
          const managerStations = fetchedStations.filter(s => s.id === assignedStationId)
          setStations(managerStations)

          // 2. Force select the assigned station
          setSelectedStationState(assignedStationId)
          localStorage.setItem('selectedStation', assignedStationId)
        } else {
          // DEVELOPER / OWNER / ACCOUNTS:
          // Hydrate Selection from LocalStorage normally
          const savedStation = localStorage.getItem('selectedStation')
          if (savedStation) {
            // Verify valid station or 'all'
            if (savedStation === 'all' || fetchedStations.some(s => s.id === savedStation)) {
              setSelectedStationState(savedStation)
            } else {
              // Fallback if saved station no longer exists
              setSelectedStationState('all')
              localStorage.setItem('selectedStation', 'all')
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize stations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  const setSelectedStation = (stationId: string) => {
    setSelectedStationState(stationId)
    localStorage.setItem('selectedStation', stationId)

    // Emit custom event for backward compatibility (can likely be removed later)
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
        isAllStations,
        isLoading // Export loading state
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

