'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StationProvider } from '@/contexts/StationContext'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { IdleWarningModal } from '@/components/auth/IdleWarningModal'
import { logout } from '@/lib/auth'
import { OnboardingCheck } from '@/components/auth/OnboardingCheck'

type UserRole = 'DEVELOPER' | 'OWNER' | 'MANAGER' | 'ACCOUNTS'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Idle timer with 15-minute timeout
  const { showWarning, resetTimer } = useIdleTimer({
    onIdle: logout,
    idleTime: 15 * 60 * 1000, // 15 minutes
    warningTime: 30 * 1000, // 30 seconds
  })

  useEffect(() => {
    const rawRole = localStorage.getItem('userRole')
    console.log('AppLayout checking role:', rawRole)

    // Normalize role to uppercase for comparison
    const role = rawRole ? rawRole.toUpperCase() as UserRole : null

    if (role && ['DEVELOPER', 'OWNER', 'MANAGER', 'ACCOUNTS'].includes(role)) {
      setUserRole(role)
    } else {
      console.log('Invalid role, redirecting to login:', role)
      router.push('/login')
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 dark:border-orange-400"></div>
      </div>
    )
  }

  if (!userRole) {
    return null
  }

  return (
    <StationProvider>
      <OnboardingCheck>
        <div className="min-h-screen bg-background">
          <div className="flex">
            {/* Sidebar - sticky */}
            <div className="sticky top-0 h-screen flex-shrink-0">
              <Sidebar userRole={userRole} />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar userRole={userRole} />
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </div>
        </div>
      </OnboardingCheck>

      {/* Idle Warning Modal */}
      <IdleWarningModal
        isOpen={showWarning}
        onStayLoggedIn={resetTimer}
        onLogout={logout}
        warningTime={30000}
      />
    </StationProvider>
  )
}
