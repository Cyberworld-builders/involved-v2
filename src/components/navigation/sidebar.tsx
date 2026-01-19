'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { NavigationItem, SidebarProps } from './types'
import { getUserProfile } from '@/lib/utils/get-user-profile'

export default function Sidebar({ className, isOpen = true, onClose, userProfile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [accessLevel, setAccessLevel] = useState<'member' | 'client_admin' | 'super_admin' | null>(
    userProfile?.access_level || null
  )
  const [userEmail, setUserEmail] = useState<string>(userProfile?.email || '')
  const [userName, setUserName] = useState<string>(userProfile?.name || '')
  const [isLoading, setIsLoading] = useState(!userProfile) // Only load if profile not provided

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  useEffect(() => {
    // Skip fetching if profile is provided as prop (performance optimization)
    if (userProfile) {
      setAccessLevel(userProfile.access_level)
      setUserEmail(userProfile.email)
      setUserName(userProfile.name)
      setIsLoading(false)
      return
    }

    // Fallback: fetch profile if not provided (backward compatibility)
    const loadUserProfile = async () => {
      setIsLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || '')
        const profile = await getUserProfile(supabase, user.id)
        if (profile) {
          setAccessLevel(profile.access_level)
          setUserName(profile.name || user.email || '')
        }
      }
      setIsLoading(false)
    }

    loadUserProfile()
  }, [userProfile])

  // Base navigation items (available to all users)
  const profileNavigation: NavigationItem[] = [
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: '👤',
    },
  ]

  // My Assignments (only for members and client_admins, not super_admins)
  const assignmentsNavigation: NavigationItem[] =
    accessLevel === 'super_admin'
      ? []
      : [
          {
            name: 'My Assignments',
            href: '/dashboard/assignments',
            icon: '📋',
          },
        ]

  // Admin navigation items (only for client_admin and super_admin)
  const adminNavigation: NavigationItem[] = [
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
      name: 'Resources',
      href: '/dashboard/resources',
      icon: '📚',
    },
  ]

  // Determine which navigation items to show
  // Only calculate navigation after access level is loaded to prevent race condition
  const navigation: NavigationItem[] = isLoading || accessLevel === null
    ? [] // Don't show any navigation items until access level is determined
    : accessLevel === 'member'
      ? [...assignmentsNavigation, ...profileNavigation] // Members see My Assignments and Profile
      : [...adminNavigation, ...assignmentsNavigation, ...profileNavigation] // Admins see admin items + My Assignments (if not super_admin) + Profile

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-gray-900 transition-transform duration-300 ease-in-out',
          // Desktop: keep sidebar in place, regardless of isOpen
          'md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-700">
          <Link
            href={isLoading || accessLevel === null || accessLevel === 'member' ? '/dashboard/assignments' : '/dashboard'}
            className="flex items-center space-x-2"
            onClick={() => onClose?.()}
          >
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">IT</span>
            </div>
            <span className="text-white font-semibold">Involved Talent</span>
          </Link>

          {/* Close button for mobile */}
          {onClose && (
            <button
              onClick={() => onClose()}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"
              aria-label="Close menu"
              type="button"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4" role="navigation" aria-label="Dashboard navigation">
          {isLoading ? (
            // Show loading skeleton while checking access
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-800 rounded-md animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-white text-sm">👤</span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{userName || 'User'}</p>
              <p className="text-xs text-gray-400">{userEmail || ''}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile overlay (rendered after sidebar for test consistency) */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={() => onClose()}
          aria-hidden="true"
        />
      )}
    </>
  )
}
