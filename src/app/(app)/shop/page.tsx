'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStation } from '@/contexts/StationContext'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    ShoppingBag,
    Plus,
    RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Product {
    id: string
    name: string
    category: string | null
    unit: string
    sellingPrice: number
    reorderLevel: number
    batches: Array<{ currentQuantity: number }>
}

interface Purchase {
    id: string
    productId: string
    product: { name: string }
    costPrice: number
    originalQuantity: number
    currentQuantity: number
    purchaseDate: string
    recordedBy: string
}

interface Wastage {
    id: string
    productId: string
    product: { name: string }
    quantity: number
    reason: string
    timestamp: string
    recordedBy: string
}

export default function ShopPage() {
    const { selectedStation } = useStation()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('products')

    // Data states
    const [products, setProducts] = useState<Product[]>([])
    const [purchases, setPurchases] = useState<Purchase[]>([])
    const [wastage, setWastage] = useState<Wastage[]>([])
    const [loading, setLoading] = useState(true)

    // Dialog states
    const [showProductDialog, setShowProductDialog] = useState(false)
    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
    const [showWastageDialog, setShowWastageDialog] = useState(false)

    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    const fetchData = useCallback(async () => {
        // Assuming selectedStation from context is now the ID string or 'all' or null
        if (!selectedStation || selectedStation === 'all') return
        setLoading(true)
        try {
            const prodRes = await fetch(`/api/shop/products?stationId=${selectedStation}`)
            const productsData = await prodRes.json()
            setProducts(productsData || [])

            const purRes = await fetch(`/api/shop/purchases?stationId=${selectedStation}`)
            const purchasesData = await purRes.json()
            setPurchases(purchasesData || [])

            const wasteRes = await fetch(`/api/shop/wastage?stationId=${selectedStation}`)
            const wastageData = await wasteRes.json()
            setWastage(wastageData || [])
        } catch (error) {
            console.error('Error fetching shop data:', error)
            toast({
                title: 'Error',
                description: 'Failed to load shop data',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }, [selectedStation, toast])

    useEffect(() => {
        if (selectedStation && selectedStation !== 'all') {
            fetchData()
        }
    }, [selectedStation, fetchData])

    const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedStation || selectedStation === 'all') return
        const formData = new FormData(e.currentTarget)
        const data = {
            stationId: selectedStation, // Use selectedStation directly as ID
            name: formData.get('name'),
            sellingPrice: formData.get('sellingPrice'),
            category: formData.get('category'),
            unit: formData.get('unit'),
            reorderLevel: formData.get('reorderLevel'),
        }

        try {
            const res = await fetch('/api/shop/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast({ title: 'Success', description: 'Product created successfully' })
                setShowProductDialog(false)
                fetchData()
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to create product', variant: 'destructive' })
        }
    }

    const handleRecordPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!selectedStation || selectedStation === 'all') return
        const formData = new FormData(e.currentTarget)
        const data = {
            stationId: selectedStation,
            productId: formData.get('productId'),
            costPrice: formData.get('costPrice'),
            quantity: formData.get('quantity'),
            expiryDate: formData.get('expiryDate'),
            createExpense: formData.get('createExpense') === 'on',
        }

        try {
            const res = await fetch('/api/shop/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast({ title: 'Success', description: 'Purchase recorded' })
                setShowPurchaseDialog(false)
                fetchData()
            }
        } catch {
            toast({ title: 'Error', description: 'Failed to record purchase', variant: 'destructive' })
        }
    }

    const productColumns: Column<Product>[] = [
        { key: 'name', title: 'Product Name', render: (val) => <span className="font-semibold">{val as string}</span> },
        { key: 'category', title: 'Category', render: (val) => <Badge variant="outline">{(val as string) || 'Other'}</Badge> },
        {
            key: 'sellingPrice',
            title: 'Selling Price',
            render: (val) => <span className="font-medium">Rs. {(val as (number) || 0).toLocaleString()}</span>
        },
        {
            key: 'batches',
            title: 'Current Stock',
            render: (value: unknown) => {
                const batches = value as Array<{ currentQuantity: number }>
                const total = batches?.reduce((acc, curr) => acc + curr.currentQuantity, 0) || 0
                return <span className={total <= 5 ? "text-red-500 font-bold" : "text-green-600 font-medium"}>{total}</span>
            }
        },
        {
            key: 'id' as keyof Product,
            title: 'Actions',
            render: (_, row) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(row); setShowProductDialog(true); }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-green-600" onClick={() => { setSelectedProduct(row); setShowPurchaseDialog(true); }}>+ Stock</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelectedProduct(row); setShowWastageDialog(true); }}>Waste</Button>
                </div>
            )
        }
    ]

    const purchaseColumns: Column<Purchase>[] = [
        { key: 'product', title: 'Product', render: (val) => (val as { name: string }).name },
        { key: 'costPrice', title: 'Cost Price', render: (val) => `Rs. ${(val as (number) || 0).toLocaleString()}` },
        { key: 'originalQuantity', title: 'Qty Received' },
        { key: 'currentQuantity', title: 'Qty Remaining' },
        { key: 'purchaseDate', title: 'Date', render: (val) => new Date(val as string).toLocaleDateString() },
        { key: 'recordedBy', title: 'By' }
    ]

    const wastageColumns: Column<Wastage>[] = [
        { key: 'product', title: 'Product', render: (val) => (val as { name: string }).name },
        { key: 'quantity', title: 'Qty lost' },
        { key: 'reason', title: 'Reason' },
        { key: 'timestamp', title: 'Date', render: (val) => new Date(val as string).toLocaleDateString() },
        { key: 'recordedBy', title: 'By' }
    ]

    const handleRecordWastage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            productId: formData.get('productId'),
            quantity: formData.get('quantity'),
            reason: formData.get('reason'),
        }

        try {
            const res = await fetch('/api/shop/wastage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast({ title: 'Success', description: 'Wastage recorded' })
                setShowWastageDialog(false)
                fetchData()
            }
        } catch (err) {
            console.error('Record wastage error:', err)
            toast({ title: 'Error', description: 'Failed to record wastage', variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    <ShoppingBag className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    Shop Inventory
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={() => { setEditingProduct(null); setShowProductDialog(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="products">Inventory Status</TabsTrigger>
                    <TabsTrigger value="purchases">Purchase History (GRN)</TabsTrigger>
                    <TabsTrigger value="wastage">Wastage & Loss</TabsTrigger>
                </TabsList>

                <TabsContent value="products">
                    <FormCard title="Product List & Stock Levels">
                        <DataTable data={products} columns={productColumns} loading={loading} />
                    </FormCard>
                </TabsContent>

                <TabsContent value="purchases">
                    <FormCard title="Inward Goods (GRN)">
                        <DataTable data={purchases} columns={purchaseColumns} loading={loading} />
                    </FormCard>
                </TabsContent>

                <TabsContent value="wastage">
                    <FormCard title="Recorded Wastage">
                        <DataTable data={wastage} columns={wastageColumns} loading={loading} />
                    </FormCard>
                </TabsContent>
            </Tabs>

            {/* Product Creation Dialog */}
            <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateProduct} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input id="name" name="name" required placeholder="e.g. Water 1L" defaultValue={editingProduct?.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input id="category" name="category" placeholder="e.g. Drinks" defaultValue={editingProduct?.category || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit</Label>
                                <Input id="unit" name="unit" placeholder="e.g. Bottle" defaultValue={editingProduct?.unit} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sellingPrice">Selling Price (Rs.)</Label>
                                <Input id="sellingPrice" name="sellingPrice" type="number" required defaultValue={editingProduct?.sellingPrice} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reorderLevel">Min Stock Alert</Label>
                                <Input id="reorderLevel" name="reorderLevel" type="number" defaultValue={editingProduct?.reorderLevel || 5} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Save Product</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Purchase Dialog */}
            <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Purchase (GRN)</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRecordPurchase} className="space-y-4">
                        <p className="font-bold">Recording stock arrival for: {selectedProduct?.name}</p>
                        <input type="hidden" name="productId" value={selectedProduct?.id} />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="costPrice">Unit Cost Price (Rs.)</Label>
                                <Input id="costPrice" name="costPrice" type="number" step="0.01" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity Received</Label>
                                <Input id="quantity" name="quantity" type="number" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                                <Input id="expiryDate" name="expiryDate" type="date" />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                                <input type="checkbox" id="createExpense" name="createExpense" className="h-4 w-4" title="Create Expense" />
                                <Label htmlFor="createExpense">Create Cash Expense Automatically</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Record & Add to Inventory</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Wastage Dialog */}
            <Dialog open={showWastageDialog} onOpenChange={setShowWastageDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Wastage / Damage</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRecordWastage} className="space-y-4">
                        <p className="font-bold">Recording loss for: {selectedProduct?.name}</p>
                        <input type="hidden" name="productId" value={selectedProduct?.id} />
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="waste-quantity">Quantity Lost</Label>
                                <Input id="waste-quantity" name="quantity" type="number" required placeholder="0" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason">Reason for loss</Label>
                                <Input id="reason" name="reason" required placeholder="e.g. Broken bottle, Expiry" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-red-600 hover:bg-red-700">Record Loss</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
