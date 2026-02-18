export * from './db'

export interface Station {
    id: string
    name: string
    address?: string
    city?: string
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}
