'use client'

import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number
  onChange?: (value: number) => void
  currency?: string
  allowNegative?: boolean
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, currency = 'Rs.', allowNegative = false, className, ...props }, ref) => {
    const formatValue = (val: number | undefined): string => {
      if (val === undefined || val === null) return ''
      return val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    const parseValue = (str: string): number => {
      // Remove currency symbol and commas
      const cleaned = str.replace(/[^\d.-]/g, '')
      const parsed = parseFloat(cleaned)
      
      if (isNaN(parsed)) return 0
      if (!allowNegative && parsed < 0) return 0
      
      return parsed
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const numericValue = parseValue(inputValue)
      
      // Call onChange with numeric value (don't format during typing)
      onChange?.(numericValue)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Format the value only when user finishes typing (on blur)
      const inputValue = e.target.value
      const numericValue = parseValue(inputValue)
      const formattedValue = formatValue(numericValue)
      
      // Update the input with formatted value
      e.target.value = formattedValue
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          // Allow: home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
        return
      }
      
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    }

    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
          {currency}
        </div>
        <Input
          ref={ref}
          value={value !== undefined ? value.toString() : ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn('pl-12', className)}
          placeholder="0.00"
          {...props}
        />
      </div>
    )
  }
)

MoneyInput.displayName = 'MoneyInput'

