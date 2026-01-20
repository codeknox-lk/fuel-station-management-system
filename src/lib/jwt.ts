/**
 * JWT Secret Management
 * Ensures JWT_SECRET is properly configured for production
 */

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    // Only allow default in development
    console.warn('⚠️  WARNING: JWT_SECRET not set. Using default key. This is INSECURE for production!')
    return 'your-secret-key-here-change-in-production-DEV-ONLY'
  }
  
  return secret
}
