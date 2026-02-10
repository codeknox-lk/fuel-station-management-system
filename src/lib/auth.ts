/**
 * Authentication utilities
 * Get current logged-in user information
 */

export interface CurrentUser {
  id: string
  username: string
  role: 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'DEVELOPER'
  stationId?: string | null
  organizationId?: string | null
  organizationSlug?: string | null
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
    const organizationId = localStorage.getItem('organizationId')
    const organizationSlug = localStorage.getItem('organizationSlug')

    if (!userId || !username || !role) return null

    return {
      id: userId,
      username,
      role: role as 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'DEVELOPER',
      stationId: stationId || null,
      organizationId: organizationId || null,
      organizationSlug: organizationSlug || null
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

/**
 * Logout current user
 */
export function logout() {
  // Clear localStorage
  localStorage.removeItem('accessToken')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('username')
  localStorage.removeItem('stationId')
  localStorage.removeItem('organizationId')
  localStorage.removeItem('organizationSlug')

  // Clear any other session data
  sessionStorage.clear()

  // Redirect to login
  window.location.href = '/login'
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('accessToken')
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}
