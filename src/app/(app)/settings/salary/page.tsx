'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useStation } from '@/contexts/StationContext'
import { ArrowLeft, Calculator, Save, Loader2, Info } from 'lucide-react'

export default function GlobalSalarySettingsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { selectedStation } = useStation()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState({
        defaultEpfRate: 8,
        defaultCommissionPerThousand: 1,
        defaultOvertimeMultiplier: 1.5,
        defaultAllowedRestDays: 5,
        defaultRestDayDeductionAmount: 900,
        defaultAdvanceLimit: 20000,
        defaultHolidayAllowance: 4500
    })

    // Load current station settings on mount
    useEffect(() => {
        const fetchStationSettings = async () => {
            if (!selectedStation) return

            try {
                setIsLoading(true)
                const response = await fetch(`/api/stations/${selectedStation}`)
                if (response.ok) {
                    const data = await response.json()
                    setFormData({
                        defaultEpfRate: data.defaultEpfRate ?? 8,
                        defaultCommissionPerThousand: data.defaultCommissionPerThousand ?? 1,
                        defaultOvertimeMultiplier: data.defaultOvertimeMultiplier ?? 1.5,
                        defaultAllowedRestDays: data.defaultAllowedRestDays ?? 5,
                        defaultRestDayDeductionAmount: data.defaultRestDayDeductionAmount ?? 900,
                        defaultAdvanceLimit: data.defaultAdvanceLimit ?? 20000,
                        defaultHolidayAllowance: data.defaultHolidayAllowance ?? 4500
                    })
                }
            } catch (error) {
                console.error('Failed to fetch station settings:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStationSettings()
    }, [selectedStation])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStation) {
            toast({
                title: 'Error',
                description: 'No station selected',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsSaving(true)
            const response = await fetch(`/api/stations/${selectedStation}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error('Failed to update salary settings')
            }

            toast({
                title: 'Settings Saved',
                description: 'Global salary settings have been updated successfully.',
            })
        } catch (error) {
            console.error('Error saving salary settings:', error)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred while saving the settings.',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: Number(value)
        }))
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-3" />
                <span className="text-muted-foreground font-medium">Loading settings...</span>
            </div>
        )
    }

    if (!selectedStation) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Info className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No Station Selected</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-2 mb-6">
                    Please select a station from the top navigation bar to configure its salary settings.
                </p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/settings')}
                        className="hidden md:flex"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/settings')}
                        className="md:hidden"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <Calculator className="h-8 w-8 text-violet-500" />
                            Global Salary Settings
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Configure default salary calculations for this station. These settings apply to all staff unless overridden individually.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <form onSubmit={handleSave}>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-primary" />
                                Calculation Parameters
                            </CardTitle>
                            <CardDescription>
                                Define the default rates and multipliers used when generating payroll reports.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="space-y-2">
                                    <Label htmlFor="defaultEpfRate">Employee Provident Fund (EPF) %</Label>
                                    <Input
                                        id="defaultEpfRate"
                                        name="defaultEpfRate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.defaultEpfRate}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground">Standard is 8%. Set to 0 to disable EPF calculations.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="defaultCommissionPerThousand">Commission Limit (Rs per 1000 Rs Sales)</Label>
                                    <Input
                                        id="defaultCommissionPerThousand"
                                        name="defaultCommissionPerThousand"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.defaultCommissionPerThousand}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground">E.g., 1 Rs for every 1000 Rs of total sales. Set to 0 to disable.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="defaultOvertimeMultiplier">Overtime Multiplier</Label>
                                    <Input
                                        id="defaultOvertimeMultiplier"
                                        name="defaultOvertimeMultiplier"
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={formData.defaultOvertimeMultiplier}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground">Usually 1.5x of the hourly rate for hours exceeding the 8h shift.</p>
                                </div>

                            </div>

                            <div className="pt-4 border-t mt-6">
                                <h4 className="font-medium text-sm mb-4">Leave & Rest Policy Defaults</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="space-y-2">
                                        <Label htmlFor="defaultAllowedRestDays">Allowed Rest Days (Per Month)</Label>
                                        <Input
                                            id="defaultAllowedRestDays"
                                            name="defaultAllowedRestDays"
                                            type="number"
                                            min="0"
                                            value={formData.defaultAllowedRestDays}
                                            onChange={handleChange}
                                        />
                                        <p className="text-xs text-muted-foreground">The number of days an employee is permitted to rest without penalty.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="defaultRestDayDeductionAmount">Deduction per Missing Rest Day (Rs)</Label>
                                        <Input
                                            id="defaultRestDayDeductionAmount"
                                            name="defaultRestDayDeductionAmount"
                                            type="number"
                                            min="0"
                                            value={formData.defaultRestDayDeductionAmount}
                                            onChange={handleChange}
                                        />
                                        <p className="text-xs text-muted-foreground">For every extra day worked within the allowed rest days, their holiday allowance may be deducted by this amount (e.g. 900 Rs).</p>
                                    </div>

                                </div>
                            </div>

                            <div className="pt-4 border-t mt-6">
                                <h4 className="font-medium text-sm mb-4">Allowances & Advances</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="space-y-2">
                                        <Label htmlFor="defaultAdvanceLimit">Default Pumper Advance Limit (Rs)</Label>
                                        <Input
                                            id="defaultAdvanceLimit"
                                            name="defaultAdvanceLimit"
                                            type="number"
                                            min="0"
                                            value={formData.defaultAdvanceLimit}
                                            onChange={handleChange}
                                        />
                                        <p className="text-xs text-muted-foreground">The default maximum advance amount allowed when adding a new pumper.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="defaultHolidayAllowance">Default Pumper Holiday Allowance (Rs)</Label>
                                        <Input
                                            id="defaultHolidayAllowance"
                                            name="defaultHolidayAllowance"
                                            type="number"
                                            min="0"
                                            value={formData.defaultHolidayAllowance}
                                            onChange={handleChange}
                                        />
                                        <p className="text-xs text-muted-foreground">The default base holiday allowance granted to a new pumper for full month compliance.</p>
                                    </div>

                                </div>
                            </div>

                        </CardContent>
                        <CardFooter className="bg-muted/10 border-t p-6 flex justify-end">
                            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Settings
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                </div>
            </form>
        </div>
    )
}
