'use client'

import { useState, useEffect, useCallback } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Gauge, Save, RotateCcw, AlertTriangle, CheckCircle, Info, Calculator, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { MoneyInput } from '@/components/inputs/MoneyInput'
import { useRouter } from 'next/navigation'

interface ToleranceConfig {
  id: string
  percentageTolerance: number // e.g., 0.3 for 0.3%
  flatAmountTolerance: number // e.g., 200 for Rs. 200
  useMaximum: boolean // true = max(%, Rs), false = min(%, Rs)
  description: string
  updatedBy: string
  updatedAt: string
}

interface ToleranceExample {
  salesAmount: number
  percentageAmount: number
  flatAmount: number
  finalTolerance: number
  classification: 'within' | 'exceeded'
}

export default function TolerancePage() {
  const router = useRouter()
  const [config, setConfig] = useState<ToleranceConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    percentageTolerance: 0, // Not used - flat amount only
    flatAmountTolerance: 20, // Rs. 20 flat tolerance
    useMaximum: false, // Not used - flat amount only
    description: 'Flat Rs. 20 tolerance for any sale amount'
  })
  const [examples, setExamples] = useState<ToleranceExample[]>([])
  const { toast } = useToast()

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/tolerance')
      const data = await response.json()
      if (data) {
        setConfig(data)
        setFormData({
          percentageTolerance: data.percentageTolerance,
          flatAmountTolerance: data.flatAmountTolerance,
          useMaximum: data.useMaximum,
          description: data.description
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to fetch tolerance configuration",
        variant: "destructive"
      })
    }
  }, [toast])

  const calculateExamples = useCallback(() => {
    const salesAmounts = [1000, 5000, 10000, 25000, 50000, 100000]

    const newExamples = salesAmounts.map(salesAmount => {
      const flatAmount = formData.flatAmountTolerance
      const finalTolerance = flatAmount // Always flat amount

      return {
        salesAmount,
        percentageAmount: 0, // Not used
        flatAmount,
        finalTolerance,
        classification: 'within' as 'within' | 'exceeded'
      }
    })

    setExamples(newExamples)
  }, [formData])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    calculateExamples()
  }, [calculateExamples])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/settings/tolerance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save tolerance configuration')

      toast({
        title: "Success",
        description: "Tolerance configuration saved successfully"
      })

      fetchConfig()
    } catch {
      toast({
        title: "Error",
        description: "Failed to save tolerance configuration",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (config) {
      setFormData({
        percentageTolerance: config.percentageTolerance,
        flatAmountTolerance: config.flatAmountTolerance,
        useMaximum: config.useMaximum,
        description: config.description
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`
  }

  const hasChanges = config && (
    config.flatAmountTolerance !== formData.flatAmountTolerance ||
    config.description !== formData.description
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tolerance Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Configure variance tolerance levels and thresholds for sales reconciliation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">System-wide settings</span>
        </div>
      </div>

      {/* Current Configuration Alert */}
      {config && (
        <Alert className="border-orange-500/20 dark:border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/20">
          <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-orange-700 dark:text-orange-300">Current Tolerance:</strong>
                <span className="ml-2 text-orange-700 dark:text-orange-300">
                  Flat {formatCurrency(config.flatAmountTolerance)} for any sale
                </span>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Last updated: {new Date(config.updatedAt).toLocaleString()} by {config.updatedBy}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <FormCard title="Tolerance Settings" description="Configure the tolerance calculation parameters">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="flatAmountTolerance">Flat Amount Tolerance (Rs.) *</Label>
                <MoneyInput
                  id="flatAmountTolerance"
                  value={formData.flatAmountTolerance}
                  onChange={(value) => setFormData({ ...formData, flatAmountTolerance: value })}
                  placeholder="20.00"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fixed Rs. 20 tolerance for any sale amount (as per manager requirement)
                </p>
              </div>

              <Alert className="border-orange-500/20 dark:border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/20">
                <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  <strong>Note:</strong> The system now uses a flat tolerance amount only.
                  Percentage tolerance is no longer used. Any variance within Rs. {formData.flatAmountTolerance.toLocaleString()}
                  is considered normal.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Configuration description"
                  required
                />
              </div>
            </div>

            {/* Formula Display */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Tolerance Formula
              </h4>
              <div className="text-sm text-foreground bg-card p-3 rounded border">
                Tolerance = Rs. {formData.flatAmountTolerance.toFixed(2)}
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  (Flat amount for any sale - no percentage calculation)
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                type="submit"
                disabled={saving || !hasChanges}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </FormCard>

        {/* Examples */}
        <FormCard title="Tolerance Examples" description="See how tolerance is calculated for different sales amounts">
          <div className="space-y-4">
            {examples.map((example, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    Sales: {formatCurrency(example.salesAmount)}
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 dark:bg-orange-600/30 dark:text-orange-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Within Tolerance
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Tolerance Amount:</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(example.finalTolerance)}
                  </div>
                  <p className="text-xs mt-1">Same for all sale amounts</p>
                </div>
              </div>
            ))}
          </div>
        </FormCard>
      </div>

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Tolerance Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Calculation Method
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Calculate percentage of sales amount</li>
                <li>• Compare with flat amount threshold</li>
                <li>• Use maximum or minimum based on setting</li>
                <li>• Apply to variance classification</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                Usage Areas
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Shift reconciliation</li>
                <li>• Tank variance analysis</li>
                <li>• POS batch reconciliation</li>
                <li>• Daily summary reports</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                Best Practices
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Review tolerance regularly</li>
                <li>• Consider seasonal variations</li>
                <li>• Monitor exception rates</li>
                <li>• Document changes with reasons</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

