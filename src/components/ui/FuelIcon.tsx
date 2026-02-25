import { Fuel, Droplet, Zap, Thermometer, Layers, Wind } from 'lucide-react'

// Category-to-Plate mapping
export const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
    'PETROL': { icon: Fuel, bg: 'bg-[#FACC15]', color: 'text-black' },
    'DIESEL': { icon: Fuel, bg: 'bg-[#2563EB]', color: 'text-white' },
    'OIL': { icon: Droplet, bg: 'bg-[#F59E0B]', color: 'text-black' },
    'GAS': { icon: Thermometer, bg: 'bg-[#9333EA]', color: 'text-white' },
    'ELECTRIC': { icon: Zap, bg: 'bg-[#22C55E]', color: 'text-white' },
    'HYDROGEN': { icon: Wind, bg: 'bg-[#06B6D4]', color: 'text-white' },
    'OTHER': { icon: Layers, bg: 'bg-zinc-500', color: 'text-white' },
}

export function FuelIcon({ name, className = "h-5 w-7" }: { name?: string | null, className?: string }) {
    if (!name) return <Fuel className="h-5 w-5" />

    const upperName = name.toUpperCase()

    // 1. Check for category-based icon plates
    if (CATEGORY_CONFIG[upperName]) {
        const config = CATEGORY_CONFIG[upperName]
        const Icon = config.icon
        return (
            <div className={`${className} flex items-center justify-center rounded-[4px] shadow-sm overflow-hidden select-none p-1 ${config.bg} ${config.color} border border-black/10`}>
                <Icon className="h-full w-full" />
            </div>
        )
    }

    // 2. Check if it's an emoji (backward compatibility)
    const isEmoji = /\p{Emoji}/u.test(name)
    if (isEmoji) return <span className="text-xl leading-none flex items-center justify-center select-none">{name}</span>

    // Default fallback for any other string icons
    return (
        <div className={`${className} flex items-center justify-center rounded-[4px] border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 p-1 select-none shadow-sm`}>
            <Fuel className="h-full w-full text-orange-600 dark:text-orange-400" />
        </div>
    )
}
