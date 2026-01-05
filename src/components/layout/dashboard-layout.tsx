'use client'

import { ReactNode, useState } from 'react'
import Sidebar from '@/components/navigation/sidebar'
import { UserProfile } from '@/components/navigation/types'
import SignOutButton from '@/app/dashboard/sign-out-button'

interface DashboardLayoutProps {
  children: ReactNode
  userProfile?: UserProfile // Optional: pass profile from server layout
}

export default function DashboardLayout({ children, userProfile }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        userProfile={userProfile}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                aria-label="Open menu"
                type="button"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            
            <div className="flex items-center">
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
