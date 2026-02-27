import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a number from string or number input
 * Returns 0 if invalid, NaN, or undefined
 */
export function safeParseFloat(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value
  }
  const parsed = parseFloat(String(value))
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
}

/**
 * Safely parse an integer from string or number input
 * Returns 0 if invalid, NaN, or undefined
 */
export function safeParseInt(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : Math.floor(value)
  }
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
}

/**
 * Validate required string field
 */
export function validateRequired(value: string | undefined | null, fieldName: string = 'Field'): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate date string
 */
export function validateDate(dateString: string | undefined | null, fieldName: string = 'Date'): string | null {
  if (!dateString) {
    return `${fieldName} is required`
  }

  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return `${fieldName} must be a valid date`
  }

  return null
}

/**
 * Validate amount (must be positive number)
 */
export function validateAmount(amount: number | string | undefined | null, fieldName: string = 'Amount'): string | null {
  const numAmount = safeParseFloat(amount)

  if (numAmount <= 0) {
    return `${fieldName} must be greater than 0`
  }

  if (!isFinite(numAmount)) {
    return `${fieldName} must be a valid number`
  }

  return null
}

