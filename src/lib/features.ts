
export type PlanType = 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID' | 'TRIALING'

export const PLAN_FEATURES: Record<string, string[]> = {
    BASIC: [
        'shifts',
        'sales',
        'tanks',
        'pumps',
        'prices',
        'expenses',
        'deposits',
        'daily-reports',
        'shift-reports',
        'staff',
        'inventory-fuel',
        'safe'
    ],
    PREMIUM: [
        'shifts',
        'sales',
        'tanks',
        'pumps',
        'prices',
        'expenses',
        'deposits',
        'daily-reports',
        'shift-reports',
        'staff',
        'inventory-fuel',
        'payroll',
        'loans',
        'cheques',
        'credit',
        'safe',
        'shop',
        'profit-analysis',
        'station-comparison',
        'export',
        'audit-logs',
        'api-access',
        'priority-support'
    ]
}

/**
 * Checks if an organization has access to a specific feature based on their plan and subscription status.
 */
export function hasFeature(
    plan: PlanType | string,
    feature: string,
    status: SubscriptionStatus | string = 'ACTIVE',
    trialEndDate?: Date | null | string
): boolean {
    // 1. Critical blocking states: UNPAID or CANCELLED accounts lose all access
    if (status === 'UNPAID' || status === 'CANCELLED') {
        return false
    }

    // 2. Trial Period Enforcement: Block if trial has expired
    if (status === 'TRIALING' && trialEndDate && new Date() > new Date(trialEndDate)) {
        return false
    }

    // 3. Plan-based feature access
    // Default to BASIC if plan is unknown or not in map
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.BASIC
    return features.includes(feature)
}
