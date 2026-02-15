import { faker } from '@faker-js/faker';

export const SIMULATION_CONSTANTS = {
    ORG_NAME: 'LS FS',
    STATION_NAME: 'Apex Fuels - Colombo 1',
    MANAGER_EMAIL: 'sim_manager@apex.com',
    MANAGER_PASSWORD: 'password123',
    START_DATE: new Date('2026-01-01T00:00:00.000Z'),
    END_DATE: new Date('2026-01-31T23:59:59.999Z'),
};

export function getRandomFloat(min: number, max: number, decimals: number = 2): number {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
}

export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export const FUEL_TYPES = [
    { code: 'LP92', name: 'Petrol 92', price: 370, category: 'PETROL', color: 'red' },
    { code: 'LP95', name: 'Petrol 95', price: 420, category: 'PETROL', color: 'green' },
    { code: 'LAD', name: 'Auto Diesel', price: 340, category: 'DIESEL', color: 'yellow' },
    { code: 'LSD', name: 'Super Diesel', price: 390, category: 'DIESEL', color: 'blue' },
];
