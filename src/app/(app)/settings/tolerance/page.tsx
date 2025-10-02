'use client'

import { useState, useEffect } from 'react'
import { FormCard } from '@/components/ui/FormCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Gauge, Save, RotateCcw, AlertTriangle, CheckCircle, Info, Calculator } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { NumberInput } from '@/components/inputs/NumberInput'
import { MoneyInput } from '@/components/inputs/MoneyInput'

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
  const [config, setConfig] = useState<ToleranceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    percentageTolerance: 0.3,
    flatAmountTolerance: 200,
    useMaximum: true,
    description: 'Default tolerance configuration'
  })
  const [examples, setExamples] = useState<ToleranceExample[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    calculateExamples()
  }, [formData])

  const fetchConfig = async () => {
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tolerance configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

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
    } catch (error) {
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

  const calculateTolerance = (salesAmount: number) => {
    const percentageAmount = salesAmount * (formData.percentageTolerance / 100)
    const flatAmount = formData.flatAmountTolerance
    
    return formData.useMaximum 
      ? Math.max(percentageAmount, flatAmount)
      : Math.min(percentageAmount, flatAmount)
  }

  const calculateExamples = () => {
    const salesAmounts = [1000, 5000, 10000, 25000, 50000, 100000]
    
    const newExamples = salesAmounts.map(salesAmount => {
      const percentageAmount = salesAmount * (formData.percentageTolerance / 100)
      const flatAmount = formData.flatAmountTolerance
      const finalTolerance = formData.useMaximum 
        ? Math.max(percentageAmount, flatAmount)
        : Math.min(percentageAmount, flatAmount)
      
      return {
        salesAmount,
        percentageAmount,
        flatAmount,
        finalTolerance,
        classification: 'within' as 'within' | 'exceeded'
      }
    })
    
    setExamples(newExamples)
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value}%`
  }

  const hasChanges = config && (
    config.percentageTolerance !== formData.percentageTolerance ||
    config.flatAmountTolerance !== formData.flatAmountTolerance ||
    config.useMaximum !== formData.useMaximum ||
    config.description !== formData.description
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tolerance Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure variance tolerance levels and thresholds for sales reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-gray-400" />
          <span className="text-sm text-gray-500">System-wide settings</span>
        </div>
      </div>

      {/* Current Configuration Alert */}
      {config && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-blue-900">Current Tolerance:</strong>
                <span className="ml-2 text-blue-800">
                  {formData.useMaximum ? 'Maximum' : 'Minimum'} of {formatPercentage(config.percentageTolerance)} or {formatCurrency(config.flatAmountTolerance)}
                </span>
              </div>
              <div className="text-xs text-blue-600">
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
                <Label htmlFor="percentageTolerance">Percentage Tolerance (%)</Label>
                <NumberInput
                  id="percentageTolerance"
                  value={formData.percentageTolerance}
                  onChange={(value) => setFormData({ ...formData, percentageTolerance: value })}
                  placeholder="0.3"
                  step={0.1}
                  min={0}
                  max={10}
                  allowDecimal
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of sales amount (e.g., 0.3% of Rs. 10,000 = Rs. 30)
                </p>
              </div>

              <div>
                <Label htmlFor="flatAmountTolerance">Flat Amount Tolerance (Rs.)</Label>
                <MoneyInput
                  id="flatAmountTolerance"
                  value={formData.flatAmountTolerance}
                  onChange={(value) => setFormData({ ...formData, flatAmountTolerance: value })}
                  placeholder="200.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Fixed amount regardless of sales volume
                </p>
              </div>

              <div>
                <Label htmlFor="useMaximum">Calculation Method</Label>
                <select
                  id="useMaximum"
                  value={formData.useMaximum ? 'maximum' : 'minimum'}
                  onChange={(e) => setFormData({ ...formData, useMaximum: e.target.value === 'maximum' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="maximum">Maximum of percentage or flat amount</option>
                  <option value="minimum">Minimum of percentage or flat amount</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.useMaximum 
                    ? 'Use the higher value between percentage and flat amount (more lenient)'
                    : 'Use the lower value between percentage and flat amount (more strict)'
                  }
                </p>
              </div>

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
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Tolerance Formula
              </h4>
              <div className="font-mono text-sm text-gray-700 bg-white p-3 rounded border">
                Tolerance = {formData.useMaximum ? 'max' : 'min'}(
                <br />
                &nbsp;&nbsp;Sales Amount × {formData.percentageTolerance}%,
                <br />
                &nbsp;&nbsp;Rs. {formData.flatAmountTolerance.toFixed(2)}
                <br />
                )
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
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Within Tolerance
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <div className="font-medium text-gray-700">Percentage ({formatPercentage(formData.percentageTolerance)}):</div>
                    <div>{formatCurrency(example.percentageAmount)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Flat Amount:</div>
                    <div>{formatCurrency(example.flatAmount)}</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-700">
                      Final Tolerance ({formData.useMaximum ? 'Maximum' : 'Minimum'}):
                    </div>
                    <div className="font-bold text-green-600">
                      {formatCurrency(example.finalTolerance)}
                    </div>
                  </div>
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
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                Calculation Method
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Calculate percentage of sales amount</li>
                <li>• Compare with flat amount threshold</li>
                <li>• Use maximum or minimum based on setting</li>
                <li>• Apply to variance classification</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Usage Areas
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Shift reconciliation</li>
                <li>• Tank variance analysis</li>
                <li>• POS batch reconciliation</li>
                <li>• Daily summary reports</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Best Practices
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
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
