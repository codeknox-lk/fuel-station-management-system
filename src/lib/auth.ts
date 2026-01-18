/**
 * Authentication utilities
 * Get current logged-in user information
 */

export interface CurrentUser {
  id: string
  username: string
  role: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
  stationId?: string | null
}

/**
 * Get current logged-in user from localStorage
 */
export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const userId = localStorage.getItem('userId')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('userRole')
    const stationId = localStorage.getItem('stationId')
    
    if (!userId || !username || !role) return null

    return {
      id: userId,
      username,
      role: role as 'OWNER' | 'MANAGER' | 'ACCOUNTS',
      stationId: stationId || null
    }
  } catch {
    return null
  }
}

/**
 * Get current user's display name (username or full name)
 */
export function getCurrentUserName(): string {
  const user = getCurrentUser()
  return user?.username || 'System User'
}

/**
 * Get current user's ID
 */
export function getCurrentUserId(): string | null {
  const user = getCurrentUser()
  return user?.id || null
}

