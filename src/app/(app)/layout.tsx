'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

type UserRole = 'OWNER' | 'MANAGER' | 'ACCOUNTS'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const role = localStorage.getItem('userRole') as UserRole
    if (role && ['OWNER', 'MANAGER', 'ACCOUNTS'].includes(role)) {
      setUserRole(role)
    } else {
      router.push('/login')
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!userRole) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - fixed width */}
        <div className="flex-shrink-0">
          <Sidebar userRole={userRole} />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
