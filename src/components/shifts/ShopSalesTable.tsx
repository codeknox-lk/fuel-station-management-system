import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag } from 'lucide-react'

// Define types based on Prisma schema manually since we might not have the generated types handy in this specific file context yet
// effectively mirroring the structure we saw in api/shifts/[id]/route.ts
interface ShopProduct {
    name: string
    sellingPrice: number
    unit: string
}

interface ShopShiftItem {
    id: string
    productId: string
    product: ShopProduct
    openingStock: number
    addedStock: number
    closingStock: number | null
    soldQuantity: number
    revenue: number
}

interface ShopAssignment {
    id: string
    pumperName: string
    totalRevenue: number
    items: ShopShiftItem[]
}

interface ShopSalesTableProps {
    shopAssignment: ShopAssignment
    className?: string
    title?: string
}

export function ShopSalesTable({
    shopAssignment,
    className = '',
    title = 'Shop Sales Breakdown'
}: ShopSalesTableProps) {
    if (!shopAssignment || !shopAssignment.items || shopAssignment.items.length === 0) {
        return (
            <Card className={className}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-600" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No shop items assigned to this shift.</p>
                </CardContent>
            </Card>
        )
    }

    const totalItemsSold = shopAssignment.items.reduce((acc, item) => acc + item.soldQuantity, 0)

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-orange-600" />
                        {title}
                    </CardTitle>
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                        Total Revenue: Rs. {shopAssignment.totalRevenue.toLocaleString()}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right">Added</TableHead>
                                <TableHead className="text-right">Closing</TableHead>
                                <TableHead className="text-right">Sold</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shopAssignment.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product.name}</TableCell>
                                    <TableCell className="text-right">
                                        Rs. {item.product.sellingPrice.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">{item.openingStock}</TableCell>
                                    <TableCell className="text-right">
                                        {item.addedStock > 0 ? (
                                            <span className="text-green-600">+{item.addedStock}</span>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.closingStock !== null ? item.closingStock : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {item.soldQuantity > 0 ? item.soldQuantity : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-orange-600">
                                        {item.revenue > 0 ? `Rs. ${item.revenue.toLocaleString()}` : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 font-medium">
                                <TableCell colSpan={5}>Total</TableCell>
                                <TableCell className="text-right">{totalItemsSold}</TableCell>
                                <TableCell className="text-right text-orange-600">
                                    Rs. {shopAssignment.totalRevenue.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
