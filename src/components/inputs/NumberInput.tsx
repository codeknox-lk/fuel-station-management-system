'use client'

import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  allowDecimal?: boolean
  allowNegative?: boolean
  suffix?: string
  prefix?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ 
    value, 
    onChange, 
    min, 
    max, 
    allowDecimal = true,
    allowNegative = false,
    suffix,
    prefix,
    className, 
    ...props 
  }, ref) => {
    const formatValue = (val: number | undefined): string => {
      if (val === undefined || val === null) return ''
      
      let formatted = val.toString()
      
      // Add decimal places if needed
      if (allowDecimal && !formatted.includes('.')) {
        formatted = val.toFixed(2)
      }
      
      return formatted
    }

    const parseValue = (str: string): number => {
      // Remove any non-numeric characters except decimal point
      const cleaned = str.replace(/[^\d.-]/g, '')
      const parsed = parseFloat(cleaned)
      
      if (isNaN(parsed)) return 0
      
      // Apply constraints
      let result = parsed
      if (min !== undefined && result < min) result = min
      if (max !== undefined && result > max) result = max
      if (!allowNegative && result < 0) result = 0
      
      return result
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = parseValue(inputValue)
      
      // Format the display value
      const formattedValue = formatValue(numericValue)
      
      // Update the input with formatted value
      e.target.value = formattedValue
      
      // Call onChange with numeric value
      onChange?.(numericValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrow keys
      if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true)) {
        return
      }
      
      // Allow decimal point if decimals are allowed
      if (allowDecimal && e.key === '.') {
        // Only allow one decimal point
        if (e.currentTarget.value.includes('.')) {
          e.preventDefault()
        }
        return
      }
      
      // Allow minus sign if negative numbers are allowed
      if (allowNegative && e.key === '-') {
        // Only allow at the beginning
        if (e.currentTarget.selectionStart !== 0) {
          e.preventDefault()
        }
        return
      }
      
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    }

    return (
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </div>
        )}
        <Input
          ref={ref}
          type="text"
          value={formatValue(value)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            prefix && 'pl-8',
            suffix && 'pr-8',
            className
          )}
          placeholder="0"
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </div>
        )}
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'
