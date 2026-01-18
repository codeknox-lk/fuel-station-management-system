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
        const response = await fetch('/api/stations?active=true')
        if (!response.ok) {
          console.error('Failed to fetch stations:', response.status)
          setStations([])
          return
        }
        const data = await response.json()
        setStations(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to fetch stations:', error)
        setStations([])
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

