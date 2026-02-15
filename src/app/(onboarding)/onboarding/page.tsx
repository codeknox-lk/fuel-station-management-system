'use client'

import { StationForm } from '@/components/forms/StationForm'
// Removed unused imports

export default function OnboardingPage() {
    // const { organization } = useOrganization() // If we need organization context

    const handleSuccess = () => {
        // Force a reload or navigate to trigger data refresh
        // Since we are adding the first station, we want to ensure contexts update
        window.location.href = '/dashboard'
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
            <div className="mx-auto w-full max-w-[800px] space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to FuelSync!</h1>
                    <p className="text-muted-foreground text-lg">
                        Let&apos;s get your organization set up. As you are starting fresh, please add your main petrol station details below.
                    </p>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="p-6 md:p-8">
                        <div className="mb-6 flex items-center gap-3 border-b pb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-6 w-6"
                                >
                                    <path d="M3 22v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8" />
                                    <path d="M13 22v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8" />
                                    <path d="M3 10V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
                                    <path d="M13 10V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
                                    <line x1="3" y1="22" x2="21" y2="22" />
                                    <line x1="18" y1="2" x2="18" y2="22" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">Add Your First Station</h2>
                                <p className="text-sm text-muted-foreground">
                                    Enter the details for your main location.
                                </p>
                            </div>
                        </div>

                        <StationForm
                            onSuccess={handleSuccess}
                            isFirstStation={true}
                        />
                    </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    <p>Need help? Contact support or check our documentation.</p>
                </div>
            </div>
        </div>
    )
}
