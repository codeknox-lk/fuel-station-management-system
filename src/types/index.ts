export * from './db'

export interface Station {
    id: string
    name: string
    address?: string
    city?: string
    isActive?: boolean
    deliveryToleranceCm?: number
    salesTolerance?: number
    createdAt?: string
    updatedAt?: string
}
