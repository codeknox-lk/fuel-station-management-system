
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from './jwt'

export interface ServerUser {
    userId: string
    username: string
    role: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
    stationId?: string | null
}

/**
 * Get the current user from the server-side
 * usage: const user = await getServerUser()
 */
export async function getServerUser(): Promise<ServerUser | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get('accessToken')?.value

    if (!token) return null

    try {
        const decoded = jwt.verify(token, getJwtSecret()) as {
            sub: string
            userId: string
            role: 'OWNER' | 'MANAGER' | 'ACCOUNTS'
            stationId?: string
        }

        return {
            userId: decoded.userId,
            username: decoded.sub,
            role: decoded.role,
            stationId: decoded.stationId || null
        }
    } catch (error) {
        console.error('Error verifying token:', error)
        return null
    }
}
