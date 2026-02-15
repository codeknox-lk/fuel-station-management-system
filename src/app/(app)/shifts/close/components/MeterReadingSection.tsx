'use client'

import { FormCard } from '@/components/ui/FormCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Assignment } from '../types'
import { Input } from '@/components/ui/input'
import { Fuel } from 'lucide-react'

interface MeterReadingSectionProps {
    assignments: Assignment[]
    onUpdateReading: (nozzleId: string, reading: number) => void
}

export function MeterReadingSection({ assignments, onUpdateReading }: MeterReadingSectionProps) {
    const columns: Column<Assignment>[] = [
        {
            key: 'nozzleId', // Use a valid key from Assignment
            title: 'Nozzle',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">#{row.nozzle?.nozzleNumber}</span>
                    <span className="text-xs text-muted-foreground">({row.nozzle?.tank?.fuel?.name})</span>
                </div>
            )
        },
        {
            key: 'pumperName',
            title: 'Pumper',
            render: (val) => <span className="text-sm">{String(val)}</span>
        },
        {
            key: 'startMeterReading',
            title: 'Start Reading',
            render: (val) => <span className="font-mono text-muted-foreground">{Number(val).toLocaleString()}</span>
        },
        {
            key: 'endMeterReading',
            title: 'End Reading',
            render: (_, row) => (
                <Input
                    type="number"
                    step="0.01"
                    defaultValue={row.endMeterReading || ''}
                    placeholder="Enter"
                    className="w-24 sm:w-32"
                    onBlur={(e) => onUpdateReading(row.nozzleId, parseFloat(e.target.value) || 0)}
                />
            )
        },
        {
            key: 'pumpSales',
            title: 'Litres',
            render: (_, row) => {
                const delta = Math.max(0, (row.endMeterReading || 0) - row.startMeterReading)
                return <span className="font-mono font-bold text-orange-600">{delta.toLocaleString()} L</span>
            }
        }
    ]

    return (
        <FormCard title="Meter Readings" description="Enter end meter readings">
            {assignments.length > 0 ? (
                <DataTable
                    data={assignments}
                    columns={columns}
                    searchable={false}
                    pagination={false}
                />
            ) : (
                <p className="text-sm text-muted-foreground py-4">No assignments found.</p>
            )}
        </FormCard>
    )
}
