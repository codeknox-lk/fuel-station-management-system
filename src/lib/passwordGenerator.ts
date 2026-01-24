/**
 * Generate a secure temporary password
 * Format: Fuel-XXXX-YYYY
 * Where XXXX = 4 random digits, YYYY = 4 random uppercase letters
 */
export function generateTempPassword(): string {
    // Generate 4 random digits
    const digits = Math.floor(1000 + Math.random() * 9000).toString()

    // Generate 4 random uppercase letters
    const letters = Array.from({ length: 4 }, () => {
        const charCode = 65 + Math.floor(Math.random() * 26) // A-Z
        return String.fromCharCode(charCode)
    }).join('')

    return `Fuel-${digits}-${letters}`
}

/**
 * Validate if a password meets security requirements
 */
export function validatePassword(password: string): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number')
    }

    if (!/[!@#$%^&*(),.?":{}|<>-]/.test(password)) {
        errors.push('Password must contain at least one special character')
    }

    return {
        isValid: errors.length === 0,
        errors,
    }
}
