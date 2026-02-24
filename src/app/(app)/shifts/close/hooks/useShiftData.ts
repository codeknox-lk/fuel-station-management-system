'use client'

import { useState, useEffect } from 'react'
import { LocalStation, Shift, Assignment, PosTerminal, Pumper, ShopAssignment, FuelPrice } from '../types'

export function useShiftData(selectedStation: string | null, selectedShift: string) {
    const [stations, setStations] = useState<LocalStation[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [posTerminals, setPosTerminals] = useState<PosTerminal[]>([])
    const [pumpers, setPumpers] = useState<Pumper[]>([])
    const [shopAssignment, setShopAssignment] = useState<ShopAssignment | null>(null)
    const [loading, setLoading] = useState(false)
    const [pumperMonthlyRentals, setPumperMonthlyRentals] = useState<Record<string, number>>({})
    const [prices, setPrices] = useState<Record<string, number>>({})

    // Load basic data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [stRes, pumpRes] = await Promise.all([
                    fetch('/api/stations'),
                    fetch('/api/pumpers')
                ])
                if (stRes.ok) setStations(await stRes.json())
                if (pumpRes.ok) setPumpers(await pumpRes.json())
            } catch (err) {
                console.error('Failed to load initial data:', err)
            }
        }
        loadData()
    }, [])

    // Load station-specific data
    useEffect(() => {
        if (selectedStation) {
            const loadStationData = async () => {
                try {
                    const posRes = await fetch(`/api/pos/terminals?stationId=${selectedStation}`)
                    if (posRes.ok) setPosTerminals(await posRes.json())

                    const shiftRes = await fetch(`/api/shifts?stationId=${selectedStation}&active=true`)
                    const shiftsData = await shiftRes.json()
                    const shiftsArray: Shift[] = Array.isArray(shiftsData) ? shiftsData : shiftsData.shifts || []

                    // Fetch assignments for pumper display
                    const withAssignments = await Promise.all(
                        shiftsArray.map(async (s) => {
                            const res = await fetch(`/api/shifts/${s.id}/assignments`)
                            return { ...s, assignments: res.ok ? await res.json() : [] }
                        })
                    )
                    setShifts(withAssignments)

                    // Fetch prices
                    const priceRes = await fetch(`/api/prices?stationId=${selectedStation}`)
                    if (priceRes.ok) {
                        const priceData = await priceRes.json()
                        const map: Record<string, number> = {}
                        if (Array.isArray(priceData)) {
                            priceData.forEach((p: FuelPrice) => { if (p.isActive) map[p.fuelId] = p.price })
                        }
                        setPrices(map)
                    }
                } catch (err) {
                    console.error('Failed to load station data:', err)
                }
            }
            loadStationData()
        }
    }, [selectedStation])

    // Load shift-specific data
    useEffect(() => {
        if (selectedShift) {
            const loadShiftData = async () => {
                setLoading(true)
                try {
                    const res = await fetch(`/api/shifts/${selectedShift}/assignments`)
                    if (res.ok) setAssignments(await res.json())

                    const shopRes = await fetch(`/api/shop/assignments?shiftId=${selectedShift}`)
                    if (shopRes.ok) setShopAssignment(await shopRes.json())

                    // Batch fetch rentals
                    const rentalRes = await fetch(`/api/loans/pumper/rentals${selectedStation ? `?stationId=${selectedStation}` : ''}`)
                    if (rentalRes.ok) {
                        const rentalMap = await rentalRes.json()
                        setPumperMonthlyRentals(rentalMap)
                    }
                } catch (err) {
                    console.error('Failed to load shift data:', err)
                } finally {
                    setLoading(false)
                }
            }
            loadShiftData()
        } else {
            setAssignments([])
            setShopAssignment(null)
        }
    }, [selectedShift, selectedStation])

    return { stations, shifts, assignments, posTerminals, pumpers, shopAssignment, pumperMonthlyRentals, prices, loading, setAssignments, setShopAssignment }
}
