
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Onboarding - FuelSync',
    description: 'Set up your organization',
}

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            {children}
        </div>
    )
}
