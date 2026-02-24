/**
 * Business Month Utilities
 * 
 * Business month runs from startDay of current month to startDay-1 of next month
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
export function getCurrentBusinessMonth(startDay: number = 7): BusinessMonthPeriod {
  const today = new Date()
  const currentDay = today.getDate()

  // If today is before startDay, we're in the previous calendar month's business month
  // If today is startDay or after, we're in the current calendar month's business month
  if (currentDay < startDay) {
    // Business month started in previous calendar month
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, startDay)
    const endDate = new Date(today.getFullYear(), today.getMonth(), startDay - 1, 23, 59, 59)

    return {
      startDate,
      endDate,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      label: startDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    }
  } else {
    // Business month started in current calendar month
    const startDate = new Date(today.getFullYear(), today.getMonth(), startDay)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, startDay - 1, 23, 59, 59)

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
 * @param startDay Day of the month it starts on (1-31)
 */
export function getBusinessMonth(month: number, year: number, startDay: number = 7): BusinessMonthPeriod {
  // Business month starts on startDay of the specified month
  const startDate = new Date(year, month - 1, startDay)
  // And ends on startDay - 1 of the next month
  const endDate = new Date(year, month, startDay - 1, 23, 59, 59)

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
export function getPreviousBusinessMonth(startDay: number = 7): BusinessMonthPeriod {
  const current = getCurrentBusinessMonth(startDay)
  const previousMonth = current.month === 1 ? 12 : current.month - 1
  const previousYear = current.month === 1 ? current.year - 1 : current.year

  return getBusinessMonth(previousMonth, previousYear, startDay)
}

/**
 * Get the next business month
 */
export function getNextBusinessMonth(startDay: number = 7): BusinessMonthPeriod {
  const current = getCurrentBusinessMonth(startDay)
  const nextMonth = current.month === 12 ? 1 : current.month + 1
  const nextYear = current.month === 12 ? current.year + 1 : current.year

  return getBusinessMonth(nextMonth, nextYear, startDay)
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
export function getBusinessMonthDateRange(month: number, year: number, startDay: number = 7): {
  startDate: string // ISO format
  endDate: string // ISO format
} {
  const period = getBusinessMonth(month, year, startDay)

  return {
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString()
  }
}

/**
 * Check if a date falls within a business month
 */
export function isDateInBusinessMonth(date: Date, month: number, year: number, startDay: number = 7): boolean {
  const period = getBusinessMonth(month, year, startDay)
  return date >= period.startDate && date <= period.endDate
}
