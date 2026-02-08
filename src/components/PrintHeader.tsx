import React from 'react'
import Image from 'next/image'

interface PrintHeaderProps {
    title?: string
    subtitle?: string
}

export function PrintHeader({ title, subtitle }: PrintHeaderProps) {
    const stationName = title || 'Unknown Station'

    return (
        <div className="print-header hidden">
            <div className="print-header-logo">
                <div className="relative w-[50px] h-[50px] mr-4">
                    <Image
                        src="/images/logo-icon.png"
                        alt="FuelSync Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <div>
                    <div className="print-header-title">FuelSync</div>
                    <div className="print-header-subtitle">Fuel Station Management System</div>
                </div>
            </div>
            <div className="print-header-info">
                <div><strong>Station:</strong> {stationName}</div>
                {subtitle && <div><strong>{subtitle}</strong></div>}
                <div><strong>Printed:</strong> {new Date().toLocaleString()}</div>
            </div>
        </div>
    )
}
