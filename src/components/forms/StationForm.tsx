'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface StationData {
    id?: string
    name: string
    address: string
    city: string
    phone: string
    email: string
    openingHours: string
    isActive: boolean
}

interface StationFormProps {
    initialData?: StationData | null
    onSuccess: () => void
    onCancel?: () => void
    isFirstStation?: boolean
}

export function StationForm({ initialData, onSuccess, onCancel, isFirstStation = false }: StationFormProps) {
    const [formData, setFormData] = useState<StationData>({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        openingHours: '',
        isActive: true
    })
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        }
    }, [initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const url = initialData?.id ? `/api/stations/${initialData.id}` : '/api/stations'
            const method = initialData?.id ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to save station')
            }

            toast({
                title: "Success",
                description: `Station ${initialData ? 'updated' : 'created'} successfully`
            })

            onSuccess()
        } catch (err) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : `Failed to ${initialData ? 'update' : 'create'} station`,
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Station Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Street Station"
                    required
                    disabled={isLoading}
                />
            </div>

            <div>
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                    required
                    disabled={isLoading}
                />
            </div>

            <div>
                <Label htmlFor="city">City</Label>
                <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City name"
                    required
                    disabled={isLoading}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g., +1 234 567 8900"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="station@example.com"
                        disabled={isLoading}
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="openingHours">Opening Hours</Label>
                <Input
                    id="openingHours"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="e.g., Mon-Fri: 6AM-10PM, Sat-Sun: 7AM-9PM"
                    disabled={isLoading}
                />
            </div>

            {!isFirstStation && (
                <div>
                    <Label htmlFor="isActive">Status</Label>
                    <Select
                        value={formData.isActive ? 'active' : 'inactive'}
                        onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                        disabled={isLoading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Update Station' : 'Create Station')}
                </Button>
            </div>
        </form>
    )
}
