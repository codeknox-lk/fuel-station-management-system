'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Fuel, 
  Droplets, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  BarChart3,
  Truck,
  FileText
} from 'lucide-react'

interface Tank {
  id: string
  stationId: string
  stationName?: string
  tankNumber: string
  fuelType: string
  capacity: number
  currentStock: number
  lastDipTime: string
  lastDipReading: number
  fillPercentage: number
  status: 'NORMAL' | 'LOW' | 'CRITICAL'
}

export default function TanksPage() {
  const router = useRouter()
  const [tanks, setTanks] = useState<Tank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTanks()
  }, [])

  const fetchTanks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tanks?type=tanks')
      const data = await response.json()

      // Transform the data to include calculated fields
      const transformedTanks = data.map((tank: { id: string; stationId: string; tankNumber: string; capacity: number; fuelType: string; currentLevel: number }) => ({
        ...tank,
        stationName: `Station ${tank.stationId}`,
        fillPercentage: Math.round((tank.currentStock / tank.capacity) * 100),
        status: tank.currentStock / tank.capacity < 0.1 ? 'CRITICAL' : 
                tank.currentStock / tank.capacity < 0.25 ? 'LOW' : 'NORMAL'
      }))

      setTanks(transformedTanks)

      // Calculate stats
      const totalCapacity = transformedTanks.reduce((sum: number, tank: Tank) => sum + tank.capacity, 0)
      const totalStock = transformedTanks.reduce((sum: number, tank: Tank) => sum + tank.currentStock, 0)
      const criticalTanks = transformedTanks.filter((tank: Tank) => tank.status === 'CRITICAL').length
      const lowTanks = transformedTanks.filter((tank: Tank) => tank.status === 'LOW').length

      setStats({
        totalTanks: transformedTanks.length,
        totalCapacity,
        totalStock,
        fillPercentage: totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0,
        criticalTanks,
        lowTanks
      })

    } catch (err) {
      console.error('Failed to fetch tanks:', err)
      setError('Failed to load tanks data.')
    } finally {
      setLoading(false)
    }
  }

  const [stats, setStats] = useState({
    totalTanks: 0,
    totalCapacity: 0,
    totalStock: 0,
    fillPercentage: 0,
    criticalTanks: 0,
    lowTanks: 0,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-green-100 text-green-800'
      case 'LOW': return 'bg-yellow-100 text-yellow-800'
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFillColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500'
    if (percentage >= 50) return 'bg-blue-500'
    if (percentage >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const columns: Column<Tank>[] = [
    {
      key: 'stationName' as keyof Tank,
      title: 'Station',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-gray-500" />
          <span className="font-medium">{value as string}</span>
        </div>
      )
    },
    {
      key: 'tankNumber' as keyof Tank,
      title: 'Tank',
      render: (value: unknown, row: Tank) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold">Tank {value as string}</span>
          <Badge variant="outline">{row.fuelType}</Badge>
        </div>
      )
    },
    {
      key: 'capacity' as keyof Tank,
      title: 'Capacity (L)',
      render: (value: unknown) => (
        <span className="font-mono">
          {(value as number)?.toLocaleString() || 0}L
        </span>
      )
    },
    {
      key: 'currentStock' as keyof Tank,
      title: 'Current Stock (L)',
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          <span className="font-mono font-semibold">
            {(value as number)?.toLocaleString() || 0}L
          </span>
        </div>
      )
    },
    {
      key: 'fillPercentage' as keyof Tank,
      title: 'Fill Level',
      render: (value: unknown, row: Tank) => {
        const percentage = value as number
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getFillColor(percentage)} transition-all duration-300`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        )
      }
    },
    {
      key: 'status' as keyof Tank,
      title: 'Status',
      render: (value: unknown) => (
        <Badge className={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      )
    },
    {
      key: 'lastDipTime' as keyof Tank,
      title: 'Last Dip',
      render: (value: unknown) => (
        <span className="text-sm text-gray-600">
          {new Date(value as string).toLocaleDateString()}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Tank Management</h1>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Tanks</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalTanks}</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Total Capacity</h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalCapacity.toLocaleString()}L
          </p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Current Stock</h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalStock.toLocaleString()}L
          </p>
          <p className="text-sm text-gray-500">({stats.fillPercentage}% full)</p>
        </FormCard>
        <FormCard className="p-4">
          <h3 className="text-lg font-semibold text-gray-700">Alerts</h3>
          <div className="flex gap-2">
            <Badge className="bg-red-100 text-red-800">
              {stats.criticalTanks} Critical
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800">
              {stats.lowTanks} Low
            </Badge>
          </div>
        </FormCard>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => router.push('/tanks/dips')}>
          <Droplets className="mr-2 h-4 w-4" />
          Record Tank Dip
        </Button>
        <Button variant="outline" onClick={() => router.push('/tanks/deliveries')}>
          <Truck className="mr-2 h-4 w-4" />
          Record Delivery
        </Button>
        <Button variant="outline" onClick={() => router.push('/tanks/report')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Variance Report
        </Button>
      </div>

      {/* Tanks Table */}
      <FormCard title="Tank Overview" className="p-6">
        <DataTable
          data={tanks}
          columns={columns}
          searchPlaceholder="Search tanks..."
          emptyMessage="No tanks found."
        />
      </FormCard>
    </div>
  )
}
