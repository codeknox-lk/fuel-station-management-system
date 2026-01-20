/**
 * Utility functions for formatting and displaying nozzles
 */

export interface NozzleDisplay {
  id: string
  pumpNumber: string
  nozzleNumber: string
  fuelType: string
}

/**
 * Format fuel type to readable string
 * Handles both old enum values (PETROL_95) and new fuel names (Petrol 95)
 * If already formatted (no underscores), returns as-is
 */
export function formatFuelType(fuelType: string): string {
  if (!fuelType) return 'Unknown'
  
  // If no underscores, assume it's already a formatted fuel name (e.g., "Petrol 95")
  if (!fuelType.includes('_')) {
    return fuelType
  }
  
  // Handle old enum values like PETROL_95, SUPER_DIESEL, etc.
  return fuelType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format nozzle number to always be 2 digits with leading zero if needed
 * 1 -> 01, 10 -> 10
 */
export function formatNozzleNumber(nozzleNumber: string): string {
  // Remove 'N' prefix if present (e.g., "N1" -> "1")
  const num = nozzleNumber.replace(/^N/i, '').trim()
  
  // Try to parse as number
  const parsed = parseInt(num, 10)
  
  if (isNaN(parsed)) {
    // If not a number, return as-is
    return nozzleNumber
  }
  
  // Format as 2-digit number with leading zero
  return parsed.toString().padStart(2, '0')
}

/**
 * Get a full descriptive name for a nozzle
 * Format: "Pump {pumpNumber} - Nozzle {formattedNozzleNumber} - {formattedFuelType}"
 * Example: "Pump 1 - Nozzle 01 - Petrol 95"
 */
export function getNozzleFullName(nozzle: NozzleDisplay): string {
  const formattedNozzleNumber = formatNozzleNumber(nozzle.nozzleNumber)
  const formattedFuelType = formatFuelType(nozzle.fuelType)
  
  return `Pump ${nozzle.pumpNumber} - Nozzle ${formattedNozzleNumber} - ${formattedFuelType}`
}

/**
 * Get a shorter name for a nozzle (for compact displays)
 * Format: "P{pumpNumber}-N{formattedNozzleNumber} ({formattedFuelType})"
 * Example: "P1-N01 (Petrol 95)"
 */
export function getNozzleShortName(nozzle: NozzleDisplay): string {
  const formattedNozzleNumber = formatNozzleNumber(nozzle.nozzleNumber)
  const formattedFuelType = formatFuelType(nozzle.fuelType)
  
  return `P${nozzle.pumpNumber}-N${formattedNozzleNumber} (${formattedFuelType})`
}

/**
 * Get a compact name for a nozzle (for tables)
 * Format: "P{pumpNumber}-N{formattedNozzleNumber}"
 * Example: "P1-N01"
 */
export function getNozzleCompactName(nozzle: NozzleDisplay): string {
  const formattedNozzleNumber = formatNozzleNumber(nozzle.nozzleNumber)
  
  return `P${nozzle.pumpNumber}-N${formattedNozzleNumber}`
}

/**
 * Get nozzle display with badge format
 * Returns object with label and badge text
 */
export function getNozzleDisplayWithBadge(nozzle: NozzleDisplay): {
  label: string
  badge: string
} {
  const formattedNozzleNumber = formatNozzleNumber(nozzle.nozzleNumber)
  const formattedFuelType = formatFuelType(nozzle.fuelType)
  
  return {
    label: `Pump ${nozzle.pumpNumber} - Nozzle ${formattedNozzleNumber}`,
    badge: formattedFuelType
  }
}

