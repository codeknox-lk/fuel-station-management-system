import { describe, it, expect, vi } from 'vitest'
import { getServerUser } from './auth-server'

// Mock the next/headers cookies
vi.mock('next/headers', () => ({
    cookies: () => ({
        get: vi.fn((name) => {
            if (name === 'accessToken') {
                return { value: 'valid-token' }
            }
            return undefined
        })
    })
}))

// Mock jwt to verify token
vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn((token) => {
            if (token === 'valid-token') {
                return {
                    sub: 'test-user',
                    userId: 'u-123',
                    role: 'MANAGER',
                    stationId: 's-1'
                }
            }
            throw new Error('Invalid token')
        })
    }
}))

// Mock local jwt helper
vi.mock('./jwt', () => ({
    getJwtSecret: () => 'process.env.JWT_SECRET'
}))

describe('Auth Helper (getServerUser)', () => {
    it('should return user session when valid token exists', async () => {
        const user = await getServerUser()

        expect(user).toBeDefined()
        expect(user?.username).toBe('test-user')
        expect(user?.role).toBe('MANAGER')
        expect(user?.stationId).toBe('s-1')
    })
})
