/**
 * Business Month Utilities
 * 
 * Business month runs from 7th of current month to 6th of next month
 * e.g., Jan 7 - Feb 6, Feb 7 - Mar 6, etc.
 */

export interface BusinessMonthPeriod {
  startDate: Date
  endDate: Date
  month: number // 1-12 (the month the period starts in)
  year: number
  label: string // e.g., "January 2024" (month where period starts)
}

/**
 * Get the current business month period
 */
export function getCurrentBusinessMonth(): BusinessMonthPeriod {
  const today = new Date()
  const currentDay = today.getDate()
  
  // If today is before 7th, we're in the previous calendar month's business month
  // If today is 7th or after, we're in the current calendar month's business month
  if (currentDay < 7) {
    // Business month started in previous calendar month
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 7)
    const endDate = new Date(today.getFullYear(), today.getMonth(), 6, 23, 59, 59)
    
    return {
      startDate,
      endDate,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      label: startDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    }
  } else {
    // Business month started in current calendar month
    const startDate = new Date(today.getFullYear(), today.getMonth(), 7)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 6, 23, 59, 59)
    
    return {
      startDate,
      endDate,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      label: startDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    }
  }
}

/**
 * Get business month period for a specific month and year
 * @param month 1-12 (January = 1)
 * @param year Full year (e.g., 2024)
 */
export function getBusinessMonth(month: number, year: number): BusinessMonthPeriod {
  // Business month starts on 7th of the specified month
  const startDate = new Date(year, month - 1, 7)
  // And ends on 6th of the next month
  const endDate = new Date(year, month, 6, 23, 59, 59)
  
  return {
    startDate,
    endDate,
    month,
    year,
    label: startDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  }
}

/**
 * Get the previous business month
 */
export function getPreviousBusinessMonth(): BusinessMonthPeriod {
  const current = getCurrentBusinessMonth()
  const previousMonth = current.month === 1 ? 12 : current.month - 1
  const previousYear = current.month === 1 ? current.year - 1 : current.year
  
  return getBusinessMonth(previousMonth, previousYear)
}

/**
 * Get the next business month
 */
export function getNextBusinessMonth(): BusinessMonthPeriod {
  const current = getCurrentBusinessMonth()
  const nextMonth = current.month === 12 ? 1 : current.month + 1
  const nextYear = current.month === 12 ? current.year + 1 : current.year
  
  return getBusinessMonth(nextMonth, nextYear)
}

/**
 * Format date range for display
 */
export function formatBusinessMonthRange(period: BusinessMonthPeriod): string {
  const startDay = period.startDate.getDate()
  const startMonth = period.startDate.toLocaleString('default', { month: 'short' })
  const endDay = period.endDate.getDate()
  const endMonth = period.endDate.toLocaleString('default', { month: 'short' })
  const year = period.year
  
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

/**
 * Get date range parameters for API calls
 */
export function getBusinessMonthDateRange(month: number, year: number): {
  startDate: string // ISO format
  endDate: string // ISO format
} {
  const period = getBusinessMonth(month, year)
  
  return {
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString()
  }
}

/**
 * Check if a date falls within a business month
 */
export function isDateInBusinessMonth(date: Date, month: number, year: number): boolean {
  const period = getBusinessMonth(month, year)
  return date >= period.startDate && date <= period.endDate
}
