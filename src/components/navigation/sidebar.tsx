'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ className, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: '🏠',
    },
    {
      name: 'Assessments',
      href: '/dashboard/assessments',
      icon: '📋',
    },
    {
      name: 'Clients',
      href: '/dashboard/clients',
      icon: '🏢',
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: '👥',
    },
    {
      name: 'Industries',
      href: '/dashboard/industries',
      icon: '🏭',
    },
    {
      name: 'Benchmarks',
      href: '/dashboard/benchmarks',
      icon: '📊',
    },
    {
      name: 'Feedback',
      href: '/dashboard/feedback',
      icon: '💬',
    },
  ]

  const handleLinkClick = () => {
    // Close mobile menu when a link is clicked
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex h-full w-64 flex-col bg-gray-900 transition-transform duration-300 ease-in-out',
          'fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={handleLinkClick}>
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IT</span>
            </div>
            <span className="text-white font-semibold">Involved Talent</span>
          </Link>
          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-white"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-sm">👤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
