import { describe, it, expect } from 'vitest'
import {
    CreateUserSchema,
    CreatePumperSchema,
    CreateSafeTransactionSchema
} from './schemas'

describe('Zod Schema Validation', () => {

    describe('CreateUserSchema', () => {
        it('should validate a correct user object', () => {
            const validUser = {
                name: 'Test User',
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'MANAGER',
                status: 'active'
            }
            const result = CreateUserSchema.safeParse(validUser)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.email).toBe('test@example.com')
                expect(result.data.role).toBe('MANAGER')
            }
        })

        it('should fail with invalid email', () => {
            const invalidUser = {
                username: 'testuser',
                email: 'not-an-email',
                password: 'password123',
                role: 'MANAGER'
            }
            const result = CreateUserSchema.safeParse(invalidUser)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.email).toBeDefined()
            }
        })

        it('should fail with short password', () => {
            const invalidUser = {
                username: 'testuser',
                email: 'test@example.com',
                password: '123', // Too short
                role: 'MANAGER'
            }
            const result = CreateUserSchema.safeParse(invalidUser)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.password).toBeDefined()
            }
        })

        it('should set default status to active if missing', () => {
            const validUser = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                role: 'MANAGER'
            }
            const result = CreateUserSchema.safeParse(validUser)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.status).toBe('active')
            }
        })
    })

    describe('CreatePumperSchema', () => {
        it('should validate a correct pumper object', () => {
            const validPumper = {
                name: 'John Pumper',
                phone: '1234567890',
                status: 'ACTIVE',
                shift: 'MORNING'
            }
            const result = CreatePumperSchema.safeParse(validPumper)
            expect(result.success).toBe(true)
        })

        it('should fail if name is too short', () => {
            const invalidPumper = {
                name: 'A', // Too short
                status: 'ACTIVE'
            }
            const result = CreatePumperSchema.safeParse(invalidPumper)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.flatten().fieldErrors.name).toBeDefined()
            }
        })

        it('should allow optional fields to be missing', () => {
            const minimalPumper = {
                name: 'Minimal Pumper'
            }
            const result = CreatePumperSchema.safeParse(minimalPumper)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.status).toBe('ACTIVE') // Default
            }
        })
    })

    describe('CreateSafeTransactionSchema', () => {
        it('should validate a correct transaction', () => {
            const validTx = {
                stationId: 'station-123',
                type: 'CASH_FUEL_SALES',
                amount: 5000,
                description: 'Daily sales'
            }
            const result = CreateSafeTransactionSchema.safeParse(validTx)
            expect(result.success).toBe(true)
        })

        it('should validate string amount and transform to number', () => {
            const stringAmountTx = {
                stationId: 'station-123',
                type: 'CASH_FUEL_SALES',
                amount: '5000',
                description: 'Daily sales'
            }
            const result = CreateSafeTransactionSchema.safeParse(stringAmountTx)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.amount).toBe(5000)
                expect(typeof result.data.amount).toBe('number')
            }
        })

        it('should fail with invalid transaction type', () => {
            const invalidTx = {
                stationId: 'station-123',
                type: 'INVALID_TYPE',
                amount: 5000,
                description: 'Daily sales'
            }
            const result = CreateSafeTransactionSchema.safeParse(invalidTx)
            expect(result.success).toBe(false)
        })

        it('should fail without description', () => {
            const invalidTx = {
                stationId: 'station-123',
                type: 'CASH_FUEL_SALES',
                amount: 5000
            }
            const result = CreateSafeTransactionSchema.safeParse(invalidTx)
            expect(result.success).toBe(false)
        })
    })
})
