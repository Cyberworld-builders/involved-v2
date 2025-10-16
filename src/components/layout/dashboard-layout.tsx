'use client'

import { ReactNode } from 'react'
import Sidebar from '@/components/navigation/sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <span className="sr-only">Notifications</span>
                🔔
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <span className="sr-only">Settings</span>
                ⚙️
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
