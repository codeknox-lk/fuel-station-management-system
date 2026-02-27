export interface BillingPeriod {
    startDate: Date;
    endDate: Date;
}

/**
 * Calculates the start and end dates for a billing/salary month cycle.
 *
 * @param targetYear The year to calculate for (can be the year of the month we are looking at)
 * @param targetMonth (0-indexed) The month to calculate for (0 = Jan, 1 = Feb, etc.)
 * @param monthStartDate The day of the month the cycle starts (1-31)
 * @param monthEndDate (Optional) The day of the month the cycle ends (1-31). If not provided, it falls back to monthStartDate - 1.
 * @returns {BillingPeriod} The exact Date objects for the start and end of the period.
 */
export function calculateBillingPeriod(
    targetYear: number,
    targetMonth: number,
    monthStartDate: number,
    monthEndDate?: number | null
): BillingPeriod {
    let endDate: Date;

    // We are calculating the salary period FOR a specific `targetMonth`.

    // 1. Determine Start Date
    const startDate = new Date(targetYear, targetMonth, monthStartDate, 0, 0, 0, 0);

    // 2. Determine End Date
    if (monthEndDate !== undefined && monthEndDate !== null) {
        if (monthStartDate > monthEndDate) {
            // Crosses over into the next calendar month (e.g., Start: 26th, End: 25th)
            endDate = new Date(targetYear, targetMonth + 1, monthEndDate, 23, 59, 59, 999);
        } else {
            // Starts and ends in the SAME calendar month (e.g., Start: 1st, End: 31st)
            endDate = new Date(targetYear, targetMonth, monthEndDate, 23, 59, 59, 999);
        }
    } else {
        // Fallback to legacy logic: automatic calculation
        // End date is implicitly the day before the start date in the NEXT month
        // By using monthStartDate - 1 for the day parameter, JavaScript's Date object
        // handles boundary logic (e.g., day 0 of month N gives the last day of month N-1)
        endDate = new Date(targetYear, targetMonth + 1, monthStartDate - 1, 23, 59, 59, 999);
    }

    // Handle case where calculation for targetMonth using legacy approach puts the start date in the previous month
    // E.g. targetMonth February (1), monthStartDay 26.
    // Legacy: startDate = (Year, 1-1, 26) -> (Year, 0, 26) -> Jan 26. (Month goes backward)
    // Our utility calculates exactly based on the inputs provided.
    // The caller is responsible for passing the right targetMonth.

    return { startDate, endDate };
}
