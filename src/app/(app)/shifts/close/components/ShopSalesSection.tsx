'use client'

import { FormCard } from '@/components/ui/FormCard'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/input'
import { ShoppingBag } from 'lucide-react'
import { ShopAssignment, ShopShiftItem } from '../types'

interface ShopSalesSectionProps {
    shopAssignment: ShopAssignment
    closingStocks: Record<string, number>
    onUpdateClosingStock: (itemId: string, stock: number) => void
}

export function ShopSalesSection({ shopAssignment, closingStocks, onUpdateClosingStock }: ShopSalesSectionProps) {
    const columns: Column<ShopShiftItem>[] = [
        {
            key: 'productId',
            title: 'Product',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{row.product.name}</span>
                </div>
            )
        },
        {
            key: 'openingStock',
            title: 'Opening + Added',
            render: (_, row) => (
                <span className="font-mono">{(row.openingStock + (row.addedStock || 0)).toLocaleString()} {row.product.unit}</span>
            )
        },
        {
            key: 'closingStock',
            title: 'Closing Stock',
            render: (_, row) => (
                <Input
                    type="number"
                    step="0.01"
                    value={closingStocks[row.id] ?? ''}
                    onChange={(e) => onUpdateClosingStock(row.id, parseFloat(e.target.value) || 0)}
                    className="w-24 sm:w-32"
                />
            )
        },
        {
            key: 'soldQuantity',
            title: 'Sold',
            render: (_, row) => {
                const closing = closingStocks[row.id] ?? (row.openingStock + row.addedStock)
                const sold = Math.max(0, (row.openingStock + row.addedStock) - closing)
                return <span className="font-mono text-orange-600">{(sold || 0).toLocaleString()}</span>
            }
        },
        {
            key: 'revenue',
            title: 'Revenue',
            render: (_, row) => {
                const closing = closingStocks[row.id] ?? (row.openingStock + row.addedStock)
                const sold = Math.max(0, (row.openingStock + row.addedStock) - closing)
                const revenue = sold * row.product.sellingPrice
                return <span className="font-mono font-semibold">Rs. {(revenue || 0).toLocaleString()}</span>
            }
        }
    ]

    const totalRevenue = shopAssignment.items.reduce((sum, item) => {
        const closing = closingStocks[item.id] ?? (item.openingStock + item.addedStock)
        const sold = Math.max(0, (item.openingStock + item.addedStock) - closing)
        return sum + (sold * item.product.sellingPrice)
    }, 0)

    return (
        <FormCard title="Shop Sales" description={`Inventory accountability for ${shopAssignment.pumperName}`}>
            <div className="space-y-4">
                <DataTable
                    data={shopAssignment.items}
                    columns={columns}
                    searchable={false}
                    pagination={false}
                />
                <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Shop Revenue</p>
                        <p className="text-2xl font-bold text-orange-600">
                            Rs. {totalRevenue.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </FormCard>
    )
}
